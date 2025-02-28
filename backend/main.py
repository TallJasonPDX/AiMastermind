import os
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
import uvicorn
from openai import OpenAI
from . import models, schemas
from .database import engine, get_db
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure API keys
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("[WARNING] OPENAI_API_KEY environment variable is not set")

HEYGEN_API_KEY = os.getenv("HEYGEN_API_KEY")
if not HEYGEN_API_KEY:
    print("[WARNING] HEYGEN_API_KEY environment variable is not set")

# Create FastAPI app instance
app = FastAPI(title="AI Landing Page Generator", debug=True)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount videos directory
videos_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "videos")
client_videos_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "client", "videos")

# Log all possible video paths for debugging
print(f"[API] Checking videos path: {videos_path}")
print(f"[API] Checking client videos path: {client_videos_path}")

# Try all possible video directories in priority order
video_dirs = [
    videos_path,
    client_videos_path,
    # Add absolute fallback paths that might be used in deployment
    "/app/videos",
    "/app/client/videos",
    # Common Replit paths
    "/home/runner/ai-landing-page/videos",
    "/home/runner/ai-landing-page/client/videos"
]

mounted = False
for video_dir in video_dirs:
    if os.path.exists(video_dir):
        try:
            files = os.listdir(video_dir)
            video_files = [f for f in files if f.lower().endswith(('.mp4', '.webm'))]
            if video_files:
                print(f"[API] Mounting videos from: {video_dir}")
                print(f"[API] Found videos: {video_files}")
                app.mount("/videos", StaticFiles(directory=video_dir), name="videos")
                mounted = True
                break
            else:
                print(f"[API] Directory exists but no video files found in: {video_dir}")
        except Exception as e:
            print(f"[API] Error checking directory {video_dir}: {str(e)}")

if not mounted:
    print("[API] WARNING: No videos found in any path! Creating default videos directory")
    # Create the directory if it doesn't exist
    if not os.path.exists(videos_path):
        os.makedirs(videos_path)
    app.mount("/videos", StaticFiles(directory=videos_path), name="videos")

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Email sending configuration
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_RECIPIENT = os.getenv("EMAIL_RECIPIENT", "jason@audiencesynergy.com")

def send_email(subject, recipient, html_content):
    """Send an email with the form submission details"""
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Email not sent.")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = recipient
        msg['Subject'] = subject
        
        # Attach HTML content
        msg.attach(MIMEText(html_content, 'html'))
        
        # Connect to SMTP server and send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {recipient}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False


# Configuration Endpoints
@app.get("/configurations", response_model=List[schemas.Config])
async def get_configurations(skip: int = 0,
                             limit: int = 100,
                             db: Session = Depends(get_db)):
    """Get all configurations with pagination"""
    try:
        logger.info("[API] Fetching all configurations")
        logger.info(f"[API] Skip: {skip}, Limit: {limit}")

        query = db.query(models.Configurations)
        logger.info(f"[API] Executing query: {str(query)}")
        configs = query.offset(skip).limit(limit).all()
        logger.info(f"[API] Found {len(configs)} configurations")

        if not configs:
            logger.info("[API] No configurations found")
            return []

        result = []
        for config in configs:
            config_dict = {
                "id": config.id,
                "page_title": config.page_title,
                "heygen_scene_id": config.heygen_scene_id,
                "voice_id": config.voice_id,
                "openai_agent_config": {
                    "assistant_id": config.openai_agent_config["assistantId"]
                } if config.openai_agent_config else None,
                "pass_response": config.pass_response,
                "fail_response": config.fail_response,
                "created_at": config.created_at,
                "updated_at": config.updated_at
            }
            result.append(config_dict)

        logger.info(f"[API] Returning {len(result)} configurations")
        return result
    except Exception as e:
        logger.error(f"[API] Error fetching configurations: {str(e)}")
        raise HTTPException(status_code=500,
                            detail=f"Database error: {str(e)}")


@app.get("/configurations/active", response_model=schemas.Config)
async def get_active_config(db: Session = Depends(get_db)):
    """Get the active configuration (first one by ID)"""
    print("\n[API] Fetching active configuration")
    config = db.query(models.Configurations).order_by(
        models.Configurations.id.asc()).first()

    if not config:
        return {}  # Return empty object instead of 404 error

    config_dict = {
        "id": config.id,
        "page_title": config.page_title,
        "heygen_scene_id": config.heygen_scene_id,
        "voice_id": config.voice_id,
        "openai_agent_config": {
            "assistant_id": config.openai_agent_config["assistantId"]
        } if config.openai_agent_config else None,
        "pass_response": config.pass_response,
        "fail_response": config.fail_response,
        "created_at": config.created_at,
        "updated_at": config.updated_at
    }

    print(f"[API] Found active config: {config.id} - {config.page_title}")
    return config_dict


@app.get("/conversation-flows",
         response_model=List[schemas.ConversationFlow])
async def get_conversation_flows(config_id: Optional[int] = None,
                                 skip: int = 0,
                                 limit: int = 100,
                                 db: Session = Depends(get_db)):
    """Get all conversation flows with optional filtering by config_id"""
    query = db.query(models.ConversationFlow)
    if config_id:
        query = query.filter(models.ConversationFlow.config_id == config_id)
    flows = query.offset(skip).limit(limit).all()
    return flows or []


@app.get("/configurations/{config_id}", response_model=schemas.Config)
async def get_configuration(config_id: int, db: Session = Depends(get_db)):
    """Get a specific configuration by ID"""
    config = db.query(models.Configurations).filter(
        models.Configurations.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    config_dict = {
        "id": config.id,
        "page_title": config.page_title,
        "heygen_scene_id": config.heygen_scene_id,
        "voice_id": config.voice_id,
        "openai_agent_config": {
            "assistant_id": config.openai_agent_config["assistantId"]
        } if config.openai_agent_config else None,
        "pass_response": config.pass_response,
        "fail_response": config.fail_response,
        "created_at": config.created_at,
        "updated_at": config.updated_at
    }

    print(f"[API] Found active config: {config.id} - {config.page_title}")
    return config_dict


@app.post("/configurations",
          response_model=schemas.Config,
          status_code=status.HTTP_201_CREATED)
async def create_configuration(config: schemas.ConfigCreate,
                               db: Session = Depends(get_db)):
    """Create a new configuration"""
    db_config = models.Configurations(**config.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@app.put("/configurations/{config_id}", response_model=schemas.Config)
async def update_configuration(config_id: int,
                               config: schemas.ConfigUpdate,
                               db: Session = Depends(get_db)):
    """Update an existing configuration"""
    db_config = db.query(models.Configurations).filter(
        models.Configurations.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    for key, value in config.model_dump().items():
        setattr(db_config, key, value)

    db.commit()
    db.refresh(db_config)
    return db_config


@app.delete("/configurations/{config_id}",
            status_code=status.HTTP_204_NO_CONTENT)
async def delete_configuration(config_id: int, db: Session = Depends(get_db)):
    """Delete a configuration"""
    db_config = db.query(models.Configurations).filter(
        models.Configurations.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    db.delete(db_config)
    db.commit()
    return None


# Conversation Flow Endpoints
@app.get("/conversation-flows/{flow_id}",
         response_model=schemas.ConversationFlow)
async def get_conversation_flow(flow_id: int, db: Session = Depends(get_db)):
    """Get a specific conversation flow by ID"""
    flow = db.query(models.ConversationFlow).filter(
        models.ConversationFlow.id == flow_id).first()
    if not flow:
        raise HTTPException(status_code=404,
                            detail="Conversation flow not found")
    return flow


@app.post("/conversation-flows",
          response_model=schemas.ConversationFlow,
          status_code=status.HTTP_201_CREATED)
async def create_conversation_flow(flow: schemas.ConversationFlowCreate,
                                   db: Session = Depends(get_db)):
    """Create a new conversation flow"""
    db_flow = models.ConversationFlow(**flow.model_dump())
    db.add(db_flow)
    db.commit()
    db.refresh(db_flow)
    return db_flow


@app.put("/conversation-flows/{flow_id}",
         response_model=schemas.ConversationFlow)
async def update_conversation_flow(flow_id: int,
                                   flow: schemas.ConversationFlowUpdate,
                                   db: Session = Depends(get_db)):
    """Update an existing conversation flow"""
    db_flow = db.query(models.ConversationFlow).filter(
        models.ConversationFlow.id == flow_id).first()
    if not db_flow:
        raise HTTPException(status_code=404,
                            detail="Conversation flow not found")

    for key, value in flow.model_dump().items():
        setattr(db_flow, key, value)

    db.commit()
    db.refresh(db_flow)
    return db_flow


@app.delete("/conversation-flows/{flow_id}",
            status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation_flow(flow_id: int,
                                   db: Session = Depends(get_db)):
    """Delete a conversation flow"""
    db_flow = db.query(models.ConversationFlow).filter(
        models.ConversationFlow.id == flow_id).first()
    if not db_flow:
        raise HTTPException(status_code=404,
                            detail="Conversation flow not found")

    db.delete(db_flow)
    db.commit()
    return None


# Conversation Endpoints
@app.get("/conversations", response_model=List[schemas.Conversation])
async def get_conversations(config_id: Optional[int] = None,
                            skip: int = 0,
                            limit: int = 100,
                            db: Session = Depends(get_db)):
    """Get all conversations with optional filtering by config_id"""
    query = db.query(models.Conversations)
    if config_id:
        query = query.filter(models.Conversations.config_id == config_id)
    conversations = query.order_by(desc(
        models.Conversations.created_at)).offset(skip).limit(limit).all()
    return conversations


@app.get("/conversations/{conversation_id}",
         response_model=schemas.Conversation)
async def get_conversation(conversation_id: int,
                           db: Session = Depends(get_db)):
    """Get a specific conversation by ID"""
    conversation = db.query(models.Conversations).filter(
        models.Conversations.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.post("/conversations",
          response_model=schemas.Conversation,
          status_code=status.HTTP_201_CREATED)
async def create_conversation(conversation: schemas.ConversationCreate,
                              db: Session = Depends(get_db)):
    """Create a new conversation"""
    db_conversation = models.Conversations(**conversation.model_dump())
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation


@app.put("/conversations/{conversation_id}",
         response_model=schemas.Conversation)
async def update_conversation(conversation_id: int,
                              conversation: schemas.ConversationUpdate,
                              db: Session = Depends(get_db)):
    """Update an existing conversation"""
    db_conversation = db.query(models.Conversations).filter(
        models.Conversations.id == conversation_id).first()
    if not db_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    for key, value in conversation.model_dump().items():
        setattr(db_conversation, key, value)

    db.commit()
    db.refresh(db_conversation)
    return db_conversation


@app.delete("/conversations/{conversation_id}",
            status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: int,
                              db: Session = Depends(get_db)):
    """Delete a conversation"""
    db_conversation = db.query(models.Conversations).filter(
        models.Conversations.id == conversation_id).first()
    if not db_conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(db_conversation)
    db.commit()
    return None


# Debug endpoints
@app.post("/test-echo")
async def test_echo(request: Request):
    """Debug endpoint to echo back the request body"""
    print("\n[API] ==== DEBUG ENDPOINT HIT: test-echo ====")
    try:
        body = await request.json()
        print(f"[API] Received request body: {body}")
        return {"success": True, "message": "Debug endpoint reached", "received_body": body}
    except Exception as e:
        print(f"[API] Error in test-echo endpoint: {str(e)}")
        return {"success": False, "error": str(e)}

# OpenAI integration
@app.post("/openai/chat")
async def process_chat(request: schemas.ChatRequest):
    """Process chat message through OpenAI and determine PASS/FAIL response"""
    print("\n[API] ==== Starting chat processing ====")
    print(f"[API] Received request: {request.model_dump_json()}")
    print(f"[API] System prompt: {request.system_prompt}")
    print(f"[API] Agent question: {request.agent_question}")
    print(f"[API] User message: {request.user_message}")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[API] Error: OpenAI API key not configured")
        raise HTTPException(status_code=500,
                            detail="OpenAI API key not configured")

    try:
        print("[API] Creating OpenAI client")
        client = OpenAI(api_key=api_key)

        print("[API] Sending request to OpenAI")
        print(f"[API] System prompt: {request.system_prompt}")
        print(f"[API] Agent question: {request.agent_question}")
        print(f"[API] User message: {request.user_message}")
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{
                "role": "system",
                "content": request.system_prompt
            }, {
                "role": "assistant",
                "content": request.agent_question
            }, {
                "role": "user",
                "content": request.user_message
            }],
            timeout=25  # 25 second timeout
        )

        ai_response = response.choices[0].message.content
        print(f"[API] OpenAI response received: {ai_response}")

        # Determine the status based on the response
        status = "pass" if ai_response.strip() == "PASS" else "fail"
        result = {"status": status, "response": ai_response}
        print(f"[API] Returning result: {result}")
        return result

    except Exception as e:
        print(f"[API] Error processing chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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


@app.post("/configs/{config_id}/flows",
          response_model=schemas.ConversationFlow)
async def create_conversation_flow(config_id: int,
                                   flow: schemas.ConversationFlowCreate,
                                   db: Session = Depends(get_db)):
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


@app.get("/configs/{config_id}/flows",
         response_model=List[schemas.ConversationFlow])
async def get_conversation_flows(config_id: int,
                                 db: Session = Depends(get_db)):
    """Get all conversation flows for a configuration"""
    print(f"\n[API] Fetching flows for config {config_id}")
    flows = db.query(models.ConversationFlow).filter(
        models.ConversationFlow.config_id == config_id).order_by(
            models.ConversationFlow.order).all()
    print(f"[API] Found {len(flows)} flows")
    for flow in flows:
        print(
            f"[API] Flow {flow.id}: order={flow.order}, video_only={flow.video_only}"
        )
    return flows


@app.put("/configs/{config_id}/flows/{flow_id}",
         response_model=schemas.ConversationFlow)
async def update_conversation_flow(config_id: int,
                                   flow_id: int,
                                   flow_update: schemas.ConversationFlowCreate,
                                   db: Session = Depends(get_db)):
    """Update an existing conversation flow"""
    print(f"\n[API] Updating flow {flow_id} for config {config_id}")
    print(f"[API] Update data received: {flow_update.model_dump_json()}")

    try:
        # First check if the flow exists and belongs to the config
        db_flow = db.query(models.ConversationFlow).filter(
            models.ConversationFlow.id == flow_id,
            models.ConversationFlow.config_id == config_id).first()

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
        video_dir = os.path.join(root_dir, "client/videos")
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
        raise HTTPException(
            status_code=500,
            detail=f"Error scanning videos directory: {str(e)}")


@app.get("/configs", response_model=List[schemas.Config])
async def get_all_configs(db: Session = Depends(get_db)):
    """
    Fetch all configurations from the database.
    """
    print("\n[API] Fetching all configurations")
    configs = db.query(models.Configurations).order_by(
        models.Configurations.id.asc()).all()

    if not configs:
        raise HTTPException(status_code=404, detail="No configurations found")

    # Map each configuration to a dictionary (or let FastAPI handle it via your schema)
    result = []
    for config in configs:
        config_dict = {
            "id": config.id,
            "page_title": config.page_title,
            "heygen_scene_id": config.heygen_scene_id,
            "voice_id": config.voice_id,
            "openai_agent_config": {
                "assistant_id": config.openai_agent_config["assistantId"]
            } if config.openai_agent_config else None,
            "pass_response": config.pass_response,
            "fail_response": config.fail_response,
            "created_at": config.created_at,
            "updated_at": config.updated_at,
        }
        result.append(config_dict)

    print(f"[API] Found {len(result)} configurations")
    return result


class ChatRequest(BaseModel):
    system_prompt: str
    agent_question: str
    user_message: str


@app.post("/chat")
def process_chat(request: ChatRequest):
    """Process chat message and determine PASS/FAIL response"""
    print("\n[API] ==== Starting chat processing ====")
    print(f"[API] Received request: {request.model_dump_json()}")

    try:
        if not api_key:
            print("[API] Error: OpenAI API key not configured")
            raise HTTPException(status_code=500,
                                detail="OpenAI API key not configured")

        print("[API] Creating OpenAI client")
        client = OpenAI(api_key=api_key)

        print("[API] Sending request to OpenAI")
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{
                "role": "system",
                "content": request.system_prompt
            }, {
                "role": "assistant",
                "content": request.agent_question
            }, {
                "role": "user",
                "content": request.user_message
            }],
            timeout=25  # 25 second timeout
        )

        ai_response = response.choices[0].message.content
        print(f"[API] OpenAI response received: {ai_response}")

        # Determine the status based on the response
        status = "pass" if ai_response.strip() == "PASS" else "fail"
        result = {"status": status, "response": ai_response}
        print(f"[API] Returning result: {result}")
        return result

    except Exception as e:
        print(f"[API] Error processing chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Form Submission Endpoints
@app.post("/form-submissions", status_code=status.HTTP_201_CREATED)
async def create_form_submission(submission: schemas.FormSubmissionCreate, 
                                request: Request,
                                db: Session = Depends(get_db)):
    """Save a form submission and send email notification"""
    logger.info(f"[API] Received form submission for form: {submission.form_name}")
    
    try:
        # Get client IP address
        client_ip = request.client.host if request.client else None
        submission_dict = submission.model_dump()
        
        # Add IP address to the submission
        if client_ip:
            submission_dict["ip_address"] = client_ip
        
        # Create database model
        db_submission = models.FormSubmissions(**submission_dict)
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)
        
        # Determine email subject based on form name
        if submission.form_name == "SubmitInterestForm":
            email_subject = "AI Mastermind Interest"
        elif submission.form_name == "SubmitReconsiderationForm":
            email_subject = "AI Mastermind Reconsideration Request"
        else:
            email_subject = f"Form Submission: {submission.form_name}"
        
        # Create HTML content for the email
        html_content = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                h2 {{ color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }}
                .field {{ margin-bottom: 15px; }}
                .label {{ font-weight: bold; color: #555; }}
                .value {{ margin-top: 5px; }}
                .footer {{ margin-top: 30px; font-size: 0.9em; color: #777; border-top: 1px solid #ddd; padding-top: 10px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h2>{email_subject}</h2>
                <div class="field">
                    <div class="label">Name:</div>
                    <div class="value">{submission.name}</div>
                </div>
                <div class="field">
                    <div class="label">Email:</div>
                    <div class="value">{submission.email}</div>
                </div>
                <div class="field">
                    <div class="label">Phone:</div>
                    <div class="value">{submission.phone or "Not provided"}</div>
                </div>
                <div class="field">
                    <div class="label">Message:</div>
                    <div class="value">{submission.message or "Not provided"}</div>
                </div>
                <div class="field">
                    <div class="label">IP Address:</div>
                    <div class="value">{client_ip or "Unknown"}</div>
                </div>
                <div class="field">
                    <div class="label">Submission Time:</div>
                    <div class="value">{db_submission.created_at}</div>
                </div>
                <div class="footer">
                    This is an automated email from your AI Mastermind application.
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email notification
        email_sent = send_email(
            subject=email_subject,
            recipient=EMAIL_RECIPIENT,
            html_content=html_content
        )
        
        if not email_sent:
            logger.warning("[API] Email notification could not be sent")
        
        # Return success response
        return {
            "success": True,
            "id": db_submission.id,
            "message": "Form submission saved successfully",
            "email_sent": email_sent
        }
        
    except Exception as e:
        logger.error(f"[API] Error processing form submission: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving form submission: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
