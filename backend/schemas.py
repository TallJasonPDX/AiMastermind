from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class OpenAIAgentConfig(BaseModel):
    assistant_id: str = Field(..., description="OpenAI Assistant ID")
    system_prompt: str = Field(..., description="System prompt for the AI agent")

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
        json_schema_extra = {
            "example": {
                "id": 1,
                "page_title": "AI Landing Page",
                "heygen_scene_id": "scene_123",
                "voice_id": "voice_123",
                "openai_agent_config": {
                    "assistant_id": "asst_123",
                    "system_prompt": "You are a helpful assistant"
                },
                "pass_response": "Great! Let me help you with that.",
                "fail_response": "I'm sorry, I couldn't understand that.",
                "created_at": "2025-02-02T00:00:00Z",
                "updated_at": "2025-02-02T00:00:00Z"
            }
        }