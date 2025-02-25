
# AI Landing Page Generator

## Project Overview
An intelligent qualification system for AI Mastermind group candidates that uses video content and AI-driven conversations to assess fit and interest. The application plays videos based on conversation flows, asks questions, evaluates responses through OpenAI, and determines the next steps in the conversation.

## Architecture
- **Backend (Port 8000)**: FastAPI server with SQLAlchemy ORM
- **Frontend Server (Port 5000)**: Express.js serving React frontend
- **Database**: PostgreSQL
- **AI Integration**: OpenAI for response evaluation

## Development Guidelines

### API Path Requirements
- **ALL** backend API calls must include the `/api/` prefix in the path
- Example: `/api/configurations`, `/api/conversation-flows`

### Database Rules
- No changes to the database should be pushed directly from the front end
- All database operations must go through the backend API endpoints
- All database fields and properties shall remain in `snake_case` format in both frontend and backend for consistency

### Database Schema
1. **configurations**
   - Page settings (title, HeyGen scene/voice IDs)
   - OpenAI agent configuration
   - Pass/fail response templates

2. **conversation_flows**
   - Interaction order
   - Video filenames
   - System prompts and agent questions
   - Next flow IDs for pass/fail paths
   - Form display settings

3. **conversations**
   - Message history
   - Conversation status
   - Timestamps

### Project Structure
```
├── backend/          # FastAPI server and database models
├── client/          # React frontend application
├── server/          # Express server configuration
├── db/             # Database schemas and migrations
└── videos/         # Video assets directory
```

### Application Flow
1. Load active configuration and conversation flows
2. Play video from current flow
3. Present agent's question
4. Send user response to OpenAI
5. Process PASS/FAIL response
6. Navigate to next flow based on response
7. Repeat process with new flow

### Technology Stack
- Backend: Python (FastAPI, SQLAlchemy, OpenAI)
- Frontend: React, TypeScript
- Server: Express.js
- Database: PostgreSQL
- Video Integration: HeyGen API

### Developer Guidelines

#### Feature Development
1. Only implement features that have received explicit approval
2. Preserve all existing code:
   - Do not remove existing features
   - Keep debugging lines intact
   - Maintain code unrelated to your changes
3. Maintain separation of concerns:
   - Frontend developers should not modify backend code
   - Backend developers should not modify frontend code
4. Implement logging:
   - Add console.log statements for new features
   - Log function entry points and key operations
   - Include relevant data in logs for debugging

#### Code Quality
- Comment new features thoroughly
- Follow existing code patterns and naming conventions
- Test features in isolation before integration

### Quick Start
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Access the application at: `http://0.0.0.0:3000`
