import os
import time
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import openai
import httpx
from . import models, schemas
from .database import engine, get_db


# Load environment variables
load_dotenv()

# Configure API keys
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
if not HEYGEN_API_KEY:
    raise ValueError("HEYGEN_API_KEY environment variable is not set")

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

# Create database tables
models.Base.metadata.create_all(bind=engine)

@app.get("/api/config/active", response_model=schemas.Config)
async def get_active_config(db: Session = Depends(get_db)):
    """Get the active configuration for the landing page"""
    config = db.query(models.Config).first()
    if not config:
        raise HTTPException(status_code=404, detail="No active configuration found")
    return config

@app.post("/api/heygen/streaming/sessions")
async def create_streaming_session(db: Session = Depends(get_db)):
    """Create a new HeyGen streaming session"""
    config = db.query(models.Config).first()
    if not config:
        raise HTTPException(status_code=404, detail="No configuration found")

    try:
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {HEYGEN_API_KEY}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            }

            # Initialize streaming session
            session_response = await client.post(
                "https://api.heygen.com/v1/streaming.session",
                headers=headers,
                json={
                    "scene_id": config.heygen_scene_id,
                    "voice_id": config.voice_id
                }
            )

            if session_response.status_code != 200:
                raise HTTPException(
                    status_code=session_response.status_code,
                    detail=f"HeyGen session initialization failed: {session_response.text}"
                )

            session_data = session_response.json()

            # Start streaming with the session data
            stream_response = await client.post(
                "https://api.heygen.com/v1/streaming.new",
                headers=headers,
                json={
                    "scene_id": config.heygen_scene_id,
                    "voice_id": config.voice_id,
                    "text": "Hello! I am ready to chat.",
                    "livekit_room": session_data["room_name"],
                    "livekit_identity": f"user_{int(time.time() * 1000)}"
                }
            )

            if stream_response.status_code != 200:
                raise HTTPException(
                    status_code=stream_response.status_code,
                    detail=f"HeyGen streaming initialization failed: {stream_response.text}"
                )

            return {
                "room_name": session_data["room_name"],
                "token": session_data["token"],
                "socket_url": session_data["socket_url"],
                "voice_id": config.voice_id
            }

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error connecting to HeyGen API: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)