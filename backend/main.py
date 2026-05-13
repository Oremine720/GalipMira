"""
Mireditor Core API
──────────────────
Production-level FastAPI backend with JWT auth, bcrypt hashing, and secure CORS.
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, select
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from pydantic import BaseModel, EmailStr, field_validator
from packaging import version as pkg_version

from database import engine, Base, get_db
from models import User, UserSetting, Draft, AppUpdate
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

logger = logging.getLogger(__name__)


# ─── Lifespan (replaces deprecated on_event) ───
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    # Startup: create tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified.")
    yield
    # Shutdown: cleanup if needed
    logger.info("Application shutting down.")


app = FastAPI(
    title="Mireditor API",
    version="1.0.0",
    description="Mireditor Graphics Engine Backend",
    lifespan=lifespan,
)


# ─── CORS Configuration ───
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)


# ─── Request / Response Models ───
class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Kullanıcı adı en az 2 karakter olmalıdır.")
        if len(v) > 50:
            raise ValueError("Kullanıcı adı en fazla 50 karakter olabilir.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Şifre en az 6 karakter olmalıdır.")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v:
            raise ValueError("Geçerli bir email adresi girin.")
        return v


class PasswordResetRequest(BaseModel):
    email: str


class UserSettingsUpdate(BaseModel):
    theme: str | None = None
    language: str | None = None
    auto_save: bool | None = None
    auto_save_interval: int | None = None
    default_export_format: str | None = None
    export_quality: str | None = None
    gpu_acceleration: bool | None = None
    font_size: int | None = None


# ─── Public Routes ───
@app.get("/")
def root():
    return {"message": "Mireditor API v1.0.0", "status": "running"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Database connectivity check."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return a signed JWT token."""
    user = None
    try:
        user = db.query(User).filter(
            (User.email == request.username.strip().lower()) |
            (User.username == request.username.strip())
        ).first()
    except (OperationalError, SQLAlchemyError) as e:
        logger.warning("Login DB error: %s", e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Veritabanı bağlantı hatası. Lütfen tekrar deneyin.",
        )

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz kullanıcı adı veya şifre.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesap devre dışı bırakılmış.",
        )

    # Create signed JWT
    token = create_access_token(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        role=user.role,
        remember_me=request.remember_me,
    )

    return {
        "token": token,
        "user": {
            "id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }


@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account with bcrypt-hashed password."""
    email_lower = request.email.strip().lower()
    username_clean = request.username.strip()

    # Check uniqueness
    existing = db.query(User).filter(
        (User.email == email_lower) | (User.username == username_clean)
    ).first()

    if existing:
        if existing.email == email_lower:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bu email adresi zaten kayıtlı.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu kullanıcı adı zaten alınmış.",
        )

    # Create user with bcrypt hash
    new_user = User(
        username=username_clean,
        email=email_lower,
        password_hash=hash_password(request.password),
        role="user",
    )
    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except OperationalError as e:
        logger.error("DB OperationalError on register: %s", e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Veritabanı bağlantısı geçici olarak kesildi. Lütfen tekrar deneyin.",
        )
    except SQLAlchemyError as e:
        logger.error("DB error on register: %s", e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Veritabanı işlemi sırasında bir hata oluştu.",
        )

    # Create default settings for the new user
    default_settings = UserSetting(user_id=new_user.user_id)
    db.add(default_settings)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        # Non-critical — user was created, settings can be created later

    return {
        "message": "Kayıt başarılı",
        "user": {
            "id": new_user.user_id,
            "username": new_user.username,
            "email": new_user.email,
        },
    }


@app.post("/forgot-password")
def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Password reset request.
    For security, always return success regardless of whether the email exists.
    In production, this would send an email with a reset link.
    """
    email_lower = request.email.strip().lower()
    user = db.query(User).filter(User.email == email_lower).first()

    if user:
        # TODO: Send password reset email with a time-limited token
        logger.info("Password reset requested for user_id=%d", user.user_id)

    # Always return success to prevent email enumeration
    return {
        "message": "Eğer bu email adresiyle kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.",
    }


# ─── Protected Routes (require JWT) ───
@app.get("/me")
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's information."""
    return {"user": current_user}


@app.get("/me/settings")
def get_user_settings(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's settings."""
    settings = db.query(UserSetting).filter(
        UserSetting.user_id == current_user["id"]
    ).first()

    if not settings:
        # Create default settings if they don't exist
        settings = UserSetting(user_id=current_user["id"])
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return {
        "settings": {
            "theme": settings.theme,
            "language": settings.language,
            "auto_save": settings.auto_save,
            "auto_save_interval": settings.auto_save_interval,
            "default_export_format": settings.default_export_format,
            "export_quality": settings.export_quality,
            "gpu_acceleration": settings.gpu_acceleration,
            "font_size": settings.font_size,
        }
    }


@app.put("/me/settings")
def update_user_settings(
    update: UserSettingsUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's settings."""
    settings = db.query(UserSetting).filter(
        UserSetting.user_id == current_user["id"]
    ).first()

    if not settings:
        settings = UserSetting(user_id=current_user["id"])
        db.add(settings)

    # Apply only provided fields
    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(settings, field, value)

    try:
        db.commit()
        db.refresh(settings)
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Ayarlar kaydedilemedi.")

    return {
        "message": "Ayarlar güncellendi",
        "settings": {
            "theme": settings.theme,
            "language": settings.language,
            "auto_save": settings.auto_save,
            "auto_save_interval": settings.auto_save_interval,
            "default_export_format": settings.default_export_format,
            "export_quality": settings.export_quality,
            "gpu_acceleration": settings.gpu_acceleration,
            "font_size": settings.font_size,
        },
    }


@app.get("/me/profile")
def get_user_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full user profile including stats."""
    user = db.query(User).filter(User.user_id == current_user["id"]).first()
    draft_count = db.query(Draft).filter(Draft.user_id == current_user["id"]).count()

    # Calculate total storage used
    from sqlalchemy import func as sql_func
    total_size = db.query(sql_func.sum(Draft.file_size_kb)).filter(
        Draft.user_id == current_user["id"]
    ).scalar() or 0

    return {
        "profile": {
            "id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "is_active": user.is_active,
            "total_projects": draft_count,
            "storage_used_kb": total_size,
            "storage_used_mb": round(total_size / 1024, 2) if total_size else 0,
        }
    }


@app.get("/drafts")
def get_user_drafts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get drafts for the currently authenticated user."""
    try:
        drafts = db.query(Draft).filter(
            Draft.user_id == current_user["id"]
        ).order_by(Draft.last_modified.desc()).all()
    except (OperationalError, SQLAlchemyError) as e:
        logger.warning("Drafts list DB error: %s", e)
        db.rollback()
        drafts = []

    return {
        "drafts": [
            {
                "id": d.draft_id,
                "title": d.title,
                "file_path": d.file_path,
                "file_size_kb": d.file_size_kb,
                "last_modified": d.last_modified.isoformat() if d.last_modified else None,
                "is_cloud_synced": d.is_cloud_synced,
            }
            for d in drafts
        ]
    }


# ─── Auto Update Check (public) ───
@app.get("/check-update")
def check_update(
    current_version: str = "0.0.1",
    platform: str = "windows",
    db: Session = Depends(get_db),
):
    """Check for application updates."""
    try:
        result = db.execute(
            select(AppUpdate)
            .where(AppUpdate.platform == platform)
            .order_by(AppUpdate.release_date.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()

        if not latest:
            return {
                "update_available": False,
                "current_version": current_version,
                "message": "Güncelleme bilgisi bulunamadı",
            }

        try:
            has_update = pkg_version.parse(latest.version_number) > pkg_version.parse(current_version)
        except Exception:
            has_update = latest.version_number != current_version

        if has_update:
            return {
                "update_available": True,
                "current_version": current_version,
                "latest_version": latest.version_number,
                "download_url": latest.download_url,
                "release_notes": latest.release_notes,
                "is_critical": latest.is_critical,
                "release_date": latest.release_date.isoformat() if latest.release_date else None,
            }
        else:
            return {
                "update_available": False,
                "current_version": current_version,
                "latest_version": latest.version_number,
                "message": "Güncel sürümdesiniz",
            }
    except Exception as e:
        return {
            "update_available": False,
            "current_version": current_version,
            "message": f"Güncelleme kontrolü başarısız: {str(e)}",
        }
