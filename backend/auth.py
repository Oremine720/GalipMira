"""
Mireditor Authentication Module
─────────────────────────────────
Production-level auth: bcrypt password hashing + JWT token management.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db

# ─── Password Hashing (bcrypt) ───
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt with automatic salt generation."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWT Token Management ───
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "mireditor-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_HOURS", "24"))
JWT_REMEMBER_ME_EXPIRE_DAYS = int(os.getenv("JWT_REMEMBER_ME_EXPIRE_DAYS", "30"))


def create_access_token(
    user_id: int,
    username: str,
    email: str,
    role: str = "user",
    remember_me: bool = False,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        user_id: The user's database ID
        username: The user's username
        email: The user's email
        role: The user's role (user/poweruser/admin)
        remember_me: If True, token expires in 30 days instead of 24 hours
    """
    if remember_me:
        expire = datetime.now(timezone.utc) + timedelta(days=JWT_REMEMBER_ME_EXPIRE_DAYS)
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=JWT_ACCESS_TOKEN_EXPIRE_HOURS)

    payload = {
        "sub": str(user_id),
        "username": username,
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": "mireditor-api",
    }

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT token.

    Raises:
        HTTPException 401 if token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["sub", "exp", "iat"]},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token süresi dolmuş. Lütfen tekrar giriş yapın.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── FastAPI Security Dependency ───
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> dict:
    """
    FastAPI dependency that extracts and validates the current user from JWT.

    Usage:
        @app.get("/protected")
        def protected_route(current_user: dict = Depends(get_current_user)):
            ...
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kimlik doğrulama gerekli.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)

    # Verify user still exists in DB
    from models import User  # Import here to avoid circular dependency

    user = db.query(User).filter(User.user_id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesap devre dışı bırakılmış.",
        )

    return {
        "id": user.user_id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
    }
