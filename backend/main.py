import os
import time
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import openai
import httpx
from typing import List
from . import models, schemas
from .database import engine, get_db
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json

# Load environment variables
load_dotenv()

# Configure API keys
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    print("[WARNING] OPENAI_API_KEY environment variable is not set")

HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
if not HEYGEN_API_KEY:
    print("[WARNING] HEYGEN_API_KEY environment variable is not set")

# Create FastAPI app instance with debug mode
app = FastAPI(title="AI Landing Page Generator", debug=True)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and their responses"""
    print(f"\n[FastAPI] {request.method} {request.url.path}")
    try:
        body = await request.body()
        if body:
            print("[FastAPI] Request body:", body.decode())
    except:
        print("[FastAPI] No request body")

    response = await call_next(request)
    print(f"[FastAPI] Response status: {response.status_code}")
    return response

# Mount videos directory
videos_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "videos")
if not os.path.exists(videos_path):
    os.makedirs(videos_path)
app.mount("/videos", StaticFiles(directory=videos_path), name="videos")

# Create database tables
models.Base.metadata.create_all(bind=engine)

@app.post("/configs/{config_id}/flows", response_model=schemas.ConversationFlow)
async def create_conversation_flow(
    config_id: int,
    flow: schemas.ConversationFlowCreate,
    db: Session = Depends(get_db)
):
    """Create a new conversation flow"""
    print(f"\n[API] Creating new flow for config {config_id}")
    print(f"[API] Flow data received: {flow.model_dump_json()}")

    try:
        flow_data = flow.model_dump()
        flow_data["config_id"] = config_id
        print("[API] Creating flow with data:", flow_data)

        db_flow = models.ConversationFlow(**flow_data)
        db.add(db_flow)
        db.commit()
        db.refresh(db_flow)
        print(f"[API] Flow created successfully with ID: {db_flow.id}")
        return db_flow

    except Exception as e:
        print(f"[API] Error creating flow: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/configs/{config_id}/flows", response_model=List[schemas.ConversationFlow])
async def get_conversation_flows(config_id: int, db: Session = Depends(get_db)):
    """Get all conversation flows for a configuration"""
    print(f"\n[API] Fetching flows for config {config_id}")
    flows = db.query(models.ConversationFlow).filter(
        models.ConversationFlow.config_id == config_id
    ).order_by(models.ConversationFlow.order).all()
    print(f"[API] Found {len(flows)} flows")
    return flows

@app.put("/configs/{config_id}/flows/{flow_id}", response_model=schemas.ConversationFlow)
async def update_conversation_flow(
    config_id: int,
    flow_id: int,
    flow_update: schemas.ConversationFlowCreate,
    db: Session = Depends(get_db)
):
    """Update an existing conversation flow"""
    print(f"\n[API] Updating flow {flow_id} for config {config_id}")
    print(f"[API] Update data received: {flow_update.model_dump_json()}")

    try:
        # First check if the flow exists and belongs to the config
        db_flow = db.query(models.ConversationFlow).filter(
            models.ConversationFlow.id == flow_id,
            models.ConversationFlow.config_id == config_id
        ).first()

        if not db_flow:
            raise HTTPException(status_code=404, detail="Flow not found")

        # Update the flow with new values
        flow_data = flow_update.model_dump(exclude_unset=True)
        for key, value in flow_data.items():
            setattr(db_flow, key, value)

        db.commit()
        db.refresh(db_flow)
        print(f"[API] Flow updated successfully")
        return db_flow

    except Exception as e:
        print(f"[API] Error updating flow: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/videos")
async def get_available_videos():
    """Get list of available video files"""
    try:
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        video_dir = os.path.join(root_dir, "videos")
        print(f"[Videos] Scanning directory: {video_dir}")

        if not os.path.exists(video_dir):
            print("[Videos] Directory not found, creating it")
            os.makedirs(video_dir)

        videos = []
        for file in os.listdir(video_dir):
            if file.lower().endswith(('.mp4', '.webm', '.mov', '.avi')):
                videos.append(file)

        print(f"[Videos] Found {len(videos)} video files: {videos}")
        return videos
    except Exception as e:
        print(f"[Videos] Error scanning directory: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error scanning videos directory: {str(e)}")

@app.get("/config/active", response_model=schemas.Config)
async def get_active_config(db: Session = Depends(get_db)):
    """Get the active configuration (first one by ID)"""
    print("\n[API] Fetching active configuration")
    config = db.query(models.Config).order_by(models.Config.id.asc()).first()
    if not config:
        raise HTTPException(status_code=404, detail="No active configuration found")
    print(f"[API] Found active config: {config.id} - {config.page_title}")
    return config

class ChatRequest(BaseModel):
    systemPrompt: str
    agentQuestion: str
    userMessage: str

@app.post("/chat")
async def process_chat(request: ChatRequest):
    """Process chat message and determine PASS/FAIL response"""
    try:
        print(f"\n[API] Processing chat message")
        print(f"[API] System prompt: {request.systemPrompt}")
        print(f"[API] Agent question: {request.agentQuestion}")
        print(f"[API] User message: {request.userMessage}")

        messages = [
            {"role": "system", "content": request.systemPrompt},
            {"role": "assistant", "content": request.agentQuestion},
            {"role": "user", "content": request.userMessage}
        ]

        response = await openai.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages=messages,
            max_tokens=50,
            temperature=0
        )

        ai_response = response.choices[0].message.content
        print(f"[API] OpenAI response: {ai_response}")

        return {"response": ai_response}

    except Exception as e:
        print(f"[API] Error processing chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)