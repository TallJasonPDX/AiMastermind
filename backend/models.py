from sqlalchemy import Column, Integer, String, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base


class Configurations(Base):
    __tablename__ = "configurations"

    id = Column(Integer, primary_key=True, index=True)
    page_title = Column(String, nullable=False)
    heygen_scene_id = Column(String, nullable=False)
    voice_id = Column(String, nullable=False)
    openai_agent_config = Column(JSON, nullable=False)
    pass_response = Column(String, nullable=False)
    fail_response = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(),
                        nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Add relationship to ConversationFlow
    conversation_flows = relationship("ConversationFlow",
                                      back_populates="config")


class ConversationFlow(Base):
    __tablename__ = "conversation_flows"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, ForeignKey("configs.id"), nullable=False)
    order = Column(Integer, nullable=False)
    video_filename = Column(String, nullable=False)
    system_prompt = Column(String, nullable=False)
    agent_question = Column(String, nullable=False)
    pass_next = Column(Integer)
    fail_next = Column(Integer)
    video_only = Column(Boolean, default=False, nullable=False)
    show_form = Column(Boolean, default=False, nullable=False)
    form_name = Column(String)
    input_delay = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(),
                        nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Add relationship to Config
    config = relationship("Config", back_populates="conversation_flows")
