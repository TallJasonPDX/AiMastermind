
# AI Landing Page Generator

## Development Guidelines

### API Path Requirements
- **ALL** backend API calls must include the `/api/` prefix in the path
- Example: `/api/configurations`, `/api/conversation-flows`

### Database Rules
- No changes to the database should be pushed directly from the front end
- All database operations must go through the backend API endpoints
- All database fields and properties shall remain in `snake_case` format in both frontend and backend for consistency

### Project Structure
- `/backend`: FastAPI server and database models
- `/client`: React frontend application
- `/videos`: Video assets directory

### Quick Start
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Access the application at: `http://0.0.0.0:3000`
