"""
Mireditor Database Configuration
─────────────────────────────────
SQLAlchemy engine and session setup.
Supports SQLite (development) and MySQL (production).
"""

import os
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables
load_dotenv()

# ─── Database URL ───
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_DB = os.getenv("MYSQL_DB", "mireditor")

# Echo SQL queries (disable in production)
DB_ECHO = os.getenv("DB_ECHO", "false").lower() in ("true", "1", "yes")

if MYSQL_USER:
    safe_password = urllib.parse.quote_plus(MYSQL_PASSWORD or "")
    DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{safe_password}@{MYSQL_HOST}:3306/{MYSQL_DB}"
else:
    DATABASE_URL = "sqlite:///./mireditor.db"

# ─── Engine ───
if MYSQL_USER:
    engine = create_engine(
        DATABASE_URL,
        echo=DB_ECHO,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
    )
else:
    engine = create_engine(DATABASE_URL, echo=DB_ECHO)

# ─── Session ───
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# ─── Dependency ───
def get_db():
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
