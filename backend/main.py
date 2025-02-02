import os
import time
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import openai
import httpx
from typing import List
from . import models, schemas
from .database import engine, get_db
from fastapi.staticfiles import StaticFiles

# Load environment variables
load_dotenv()

# Configure API keys
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    print("[WARNING] OPENAI_API_KEY environment variable is not set")

HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
if not HEYGEN_API_KEY:
    print("[WARNING] HEYGEN_API_KEY environment variable is not set")

# Create FastAPI app instance
app = FastAPI(title="AI Landing Page Generator")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the videos directory
videos_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "videos")
if not os.path.exists(videos_path):
    os.makedirs(videos_path)
print(f"[Videos] Mounting directory at startup: {videos_path}")
app.mount("/videos", StaticFiles(directory=videos_path), name="videos")


# Create database tables
print("[Database] Creating database tables...")
models.Base.metadata.create_all(bind=engine)
print("[Database] Tables created successfully")


@app.get("/api/videos")
async def get_available_videos():
    """Get list of available video files"""
    print("\n[Videos] Starting video file scan...")

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    video_dir = os.path.join(root_dir, "videos")
    print(f"[Videos] Root directory: {root_dir}")
    print(f"[Videos] Video directory: {video_dir}")

    if not os.path.exists(video_dir):
        print(f"[Videos] Directory does not exist, creating it")
        os.makedirs(video_dir)

    videos = []
    try:
        print(f"[Videos] Reading directory contents...")
        files = os.listdir(video_dir)
        print(f"[Videos] Found {len(files)} total files")

        for file in files:
            print(f"[Videos] Checking file: {file}")
            if file.lower().endswith(('.mp4', '.webm', '.mov', '.avi')):
                print(f"[Videos] ✓ Adding video file: {file}")
                videos.append(file)
            else:
                print(f"[Videos] ✗ Skipping non-video file: {file}")
    except Exception as e:
        print(f"[Videos] Error scanning directory: {str(e)}")
        print(f"[Videos] Current working directory: {os.getcwd()}")
        return []

    print(f"[Videos] Scan complete. Found {len(videos)} videos: {videos}")
    return videos


@app.get("/api/config/active", response_model=schemas.Config)
async def get_active_config(db: Session = Depends(get_db)):
    """Get the active configuration for the landing page"""
    config = db.query(models.Config).first()
    if not config:
        raise HTTPException(status_code=404, detail="No active configuration found")
    return config


@app.get("/api/configs/{config_id}/flows", response_model=List[schemas.ConversationFlow])
async def get_conversation_flows(config_id: int, db: Session = Depends(get_db)):
    """Get all conversation flows for a configuration"""
    flows = db.query(models.ConversationFlow).filter(
        models.ConversationFlow.config_id == config_id
    ).order_by(models.ConversationFlow.order).all()
    return flows


@app.post("/api/configs/{config_id}/flows", response_model=schemas.ConversationFlow)
async def create_conversation_flow(
    config_id: int,
    flow: schemas.ConversationFlowCreate,
    db: Session = Depends(get_db)
):
    """Create a new conversation flow"""
    db_flow = models.ConversationFlow(**flow.model_dump())
    db.add(db_flow)
    db.commit()
    db.refresh(db_flow)
    return db_flow


@app.put("/api/configs/{config_id}/flows/{flow_id}", response_model=schemas.ConversationFlow)
async def update_conversation_flow(
    config_id: int,
    flow_id: int,
    flow: schemas.ConversationFlowCreate,
    db: Session = Depends(get_db)
):
    """Update an existing conversation flow"""
    db_flow = db.query(models.ConversationFlow).filter(
        models.ConversationFlow.id == flow_id,
        models.ConversationFlow.config_id == config_id
    ).first()
    if not db_flow:
        raise HTTPException(status_code=404, detail="Conversation flow not found")

    for key, value in flow.model_dump().items():
        setattr(db_flow, key, value)

    db.commit()
    db.refresh(db_flow)
    return db_flow



@app.post("/api/heygen/streaming/sessions")
async def create_streaming_session(db: Session = Depends(get_db)):
    """Create a new HeyGen streaming session"""
    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "accept": "application/json",
                "content-type": "application/json",
                "x-api-key": HEYGEN_API_KEY
            }

            # Initialize streaming session with v1 parameters
            session_response = await client.post(
                "https://api.heygen.com/v1/streaming.new",
                headers=headers,
                json={
                    "quality": "medium",
                    "voice": {"rate": 1},
                    "video_encoding": "VP8",
                    "disable_idle_timeout": False
                }
            )

            if session_response.status_code != 200:
                print(f"HeyGen API Error: {session_response.status_code} {session_response.text}")  # Debug log
                raise HTTPException(
                    status_code=session_response.status_code,
                    detail=f"HeyGen session initialization failed: {session_response.text}"
                )

            session_data = session_response.json()
            return session_data

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error connecting to HeyGen API: {str(e)}"
        )


if __name__ == "__main__":
    print("[Server] Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)