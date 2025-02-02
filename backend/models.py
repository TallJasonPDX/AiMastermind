from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from .database import Base

class Config(Base):
    __tablename__ = "configs"

    id = Column(Integer, primary_key=True, index=True)
    page_title = Column(String, nullable=False)
    heygen_scene_id = Column(String, nullable=False)
    voice_id = Column(String, nullable=False)
    openai_agent_config = Column(JSON, nullable=False)
    pass_response = Column(String, nullable=False)
    fail_response = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())