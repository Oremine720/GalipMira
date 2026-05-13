"""
Mireditor Database Models
─────────────────────────
SQLAlchemy ORM model definitions.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum, func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="user", nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, default=True)

    # Relationships
    settings = relationship("UserSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")
    drafts = relationship("Draft", back_populates="user", cascade="all, delete-orphan")
    ai_logs = relationship("AiUsageLog", back_populates="user", cascade="all, delete-orphan")


class UserSetting(Base):
    __tablename__ = "user_settings"
    setting_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    theme = Column(Enum("light", "dark", "system"), default="dark")
    language = Column(String(5), default="tr-TR")
    auto_save = Column(Boolean, default=True)
    auto_save_interval = Column(Integer, default=30)  # seconds
    default_export_format = Column(String(10), default="png")
    export_quality = Column(String(10), default="high")
    gpu_acceleration = Column(Boolean, default=True)
    font_size = Column(Integer, default=14)

    # Relationship
    user = relationship("User", back_populates="settings")


class Draft(Base):
    __tablename__ = "drafts"
    draft_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="Adsız Taslak")
    file_path = Column(String(500), nullable=False)
    file_size_kb = Column(Integer)
    last_modified = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_cloud_synced = Column(Boolean, default=False)

    # Relationship
    user = relationship("User", back_populates="drafts")


class AiUsageLog(Base):
    __tablename__ = "ai_usage_log"
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    feature_name = Column(String(100))
    tokens_used = Column(Integer, default=1)
    used_at = Column(DateTime, server_default=func.now())

    # Relationship
    user = relationship("User", back_populates="ai_logs")


class AppUpdate(Base):
    __tablename__ = "app_updates"
    update_id = Column(Integer, primary_key=True, autoincrement=True)
    version_number = Column(String(20), nullable=False)
    platform = Column(Enum("windows", "macos", "linux"), nullable=False)
    download_url = Column(String(500), nullable=False)
    release_notes = Column(Text)
    is_critical = Column(Boolean, default=False)
    release_date = Column(DateTime, server_default=func.now())
