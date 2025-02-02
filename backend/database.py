import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Create SQLAlchemy engine with proper PostgreSQL URL handling
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True  # Enable connection health checks
)

# Configure session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base class
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()