import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Ensure proper PostgreSQL URL format
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create SQLAlchemy engine with proper PostgreSQL URL handling
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_size=5,  # Limit pool size for remote connections
    max_overflow=10,  # Allow up to 10 connections when pool is full
    echo=True  # Enable SQL query logging
)

# Test database connection
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        print("[Database] Successfully connected to the database")
except Exception as e:
    print("[Database] Error connecting to database:", str(e))
    raise

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