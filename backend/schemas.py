from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# Base OpenAI config schema
class OpenAIAgentConfig(BaseModel):
    assistant_id: str = Field(..., description="OpenAI Assistant ID")

# Chat Request Schema
class ChatRequest(BaseModel):
    system_prompt: str = Field(..., description="System prompt for OpenAI")
    agent_question: str = Field(..., description="Question to be asked by the agent")
    user_message: str = Field(..., description="Message from the user")

# Configuration schemas
class ConfigBase(BaseModel):
    page_title: str = Field(..., min_length=1, description="Title of the landing page")
    heygen_scene_id: str = Field(..., min_length=1, description="HeyGen scene identifier")
    voice_id: str = Field(..., min_length=1, description="Voice identifier for the avatar")
    openai_agent_config: OpenAIAgentConfig = Field(..., description="OpenAI agent configuration")
    pass_response: str = Field(..., min_length=1, description="Response for successful interaction")
    fail_response: str = Field(..., min_length=1, description="Response for failed interaction")

class ConfigCreate(ConfigBase):
    pass

class ConfigUpdate(ConfigBase):
    pass

class Config(ConfigBase):
    id: int = Field(..., description="Unique identifier for the configuration")
    created_at: datetime = Field(..., description="Timestamp when the config was created")
    updated_at: Optional[datetime] = Field(None, description="Timestamp when the config was last updated")

    class Config:
        from_attributes = True

# Conversation Flow schemas
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

class ConversationFlowUpdate(ConversationFlowBase):
    pass

class ConversationFlow(ConversationFlowBase):
    id: int = Field(..., description="Unique identifier for the flow")
    created_at: datetime = Field(..., description="Timestamp when the flow was created")
    updated_at: Optional[datetime] = Field(None, description="Timestamp when the flow was last updated")

    class Config:
        from_attributes = True

# Conversation schemas
class Message(BaseModel):
    role: str = Field(..., description="Role of the message sender (user/assistant/system)")
    content: str = Field(..., description="Content of the message")

class ConversationBase(BaseModel):
    config_id: int = Field(..., description="ID of the associated configuration")
    messages: List[Message] = Field(..., description="List of conversation messages")
    status: str = Field(default="ongoing", description="Status of the conversation")

class ConversationCreate(ConversationBase):
    pass

class ConversationUpdate(ConversationBase):
    pass

class Conversation(ConversationBase):
    id: int = Field(..., description="Unique identifier for the conversation")
    created_at: datetime = Field(..., description="Timestamp when the conversation was created")
    updated_at: Optional[datetime] = Field(None, description="Timestamp when the conversation was last updated")

    class Config:
        from_attributes = True
        
# Form Submission schemas
class FormSubmissionBase(BaseModel):
    form_name: str = Field(..., description="Name of the form that was submitted")
    name: str = Field(..., min_length=2, description="Name of the person submitting the form")
    email: EmailStr = Field(..., description="Email address of the person submitting the form")
    phone: Optional[str] = Field(None, description="Phone number (optional)")
    message: Optional[str] = Field(None, description="Message content or comments")
    additional_data: Optional[Dict[str, Any]] = Field(None, description="Any additional form data")
    
class FormSubmissionCreate(FormSubmissionBase):
    ip_address: Optional[str] = Field(None, description="IP address of the submitter")

class FormSubmission(FormSubmissionBase):
    id: int = Field(..., description="Unique identifier for the form submission")
    ip_address: Optional[str] = Field(None, description="IP address of the submitter")
    created_at: datetime = Field(..., description="Timestamp when the submission was created")
    
    class Config:
        from_attributes = True