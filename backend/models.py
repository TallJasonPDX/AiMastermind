from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from .database import Base

class Config(Base):
    __tablename__ = "configs"
    
    id = Column(Integer, primary_key=True, index=True)
    page_title = Column(String)
    heygen_scene_id = Column(String)
    voice_id = Column(String)
    openai_agent_config = Column(JSON)
    pass_response = Column(String)
    fail_response = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
