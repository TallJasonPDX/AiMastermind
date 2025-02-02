from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class OpenAIAgentConfig(BaseModel):
    assistant_id: str = Field(..., description="OpenAI Assistant ID")

class ConfigBase(BaseModel):
    page_title: str = Field(..., min_length=1, description="Title of the landing page")
    heygen_scene_id: str = Field(..., min_length=1, description="HeyGen scene identifier")
    voice_id: str = Field(..., min_length=1, description="Voice identifier for the avatar")
    openai_agent_config: OpenAIAgentConfig = Field(..., description="OpenAI agent configuration")
    pass_response: str = Field(..., min_length=1, description="Response for successful interaction")
    fail_response: str = Field(..., min_length=1, description="Response for failed interaction")

class ConfigCreate(ConfigBase):
    pass

class Config(ConfigBase):
    id: int = Field(..., description="Unique identifier for the configuration")
    created_at: datetime = Field(..., description="Timestamp when the config was created")
    updated_at: Optional[datetime] = Field(None, description="Timestamp when the config was last updated")

    class Config:
        from_attributes = True

class ConversationFlowBase(BaseModel):
    config_id: int = Field(..., description="ID of the associated configuration")
    order: int = Field(..., ge=1, description="Order in which this flow appears")
    video_filename: str = Field(..., min_length=1, description="Name of the video file to play")
    system_prompt: str = Field(..., description="System prompt for the AI")
    agent_question: str = Field(..., description="Question that will be asked by the AI")
    pass_next: Optional[int] = Field(None, description="Next flow order number on PASS")
    fail_next: Optional[int] = Field(None, description="Next flow order number on FAIL")
    video_only: bool = Field(False, description="If True, plays video and moves to pass_next without input")
    show_form: bool = Field(False, description="If True, shows a form instead of chat input")
    form_name: Optional[str] = Field(None, description="Name of the form component to display")
    input_delay: int = Field(0, ge=0, description="Seconds to wait before enabling input")

class ConversationFlowCreate(ConversationFlowBase):
    pass

class ConversationFlow(ConversationFlowBase):
    id: int = Field(..., description="Unique identifier for the flow")
    created_at: datetime = Field(..., description="Timestamp when the flow was created")
    updated_at: Optional[datetime] = Field(None, description="Timestamp when the flow was last updated")

    class Config:
        from_attributes = True