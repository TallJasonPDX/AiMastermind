from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OpenAIAgentConfig(BaseModel):
    assistant_id: str
    system_prompt: str

class ConfigBase(BaseModel):
    page_title: str
    heygen_scene_id: str
    voice_id: str
    openai_agent_config: OpenAIAgentConfig
    pass_response: str
    fail_response: str

class ConfigCreate(ConfigBase):
    pass

class Config(ConfigBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
