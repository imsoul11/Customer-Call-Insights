# Customer Call Insights

Customer Call Insights is a full-stack analytics platform for customer support teams. It helps employees, managers, and admins review call activity, generate AI-assisted call summaries, track sentiment and satisfaction, and monitor overall team performance from one unified dashboard.

The application combines a React + Vite frontend with an Express + MongoDB backend and uses Gemini to generate structured analysis from call transcripts.

## What The Application Does

Customer Call Insights is built around the idea that every support call can become a useful signal. Instead of treating calls as isolated records, the platform turns them into searchable logs, performance metrics, and AI-generated summaries that help teams understand service quality and respond more effectively.

Users can review historical call data, inspect transcript-driven analysis, compare employee performance, and create new AI analysis entries directly from the app. The result is a workflow that supports both operational monitoring and day-to-day call review.

## Core Features

### Role-Based Access

The app supports three roles:

- `employee`
- `manager`
- `admin`

Each role is routed to the part of the product relevant to them. Employees and managers use the analytics dashboard, while admins work from the user management area.

### Login Experience

The login screen includes a polished quick-access flow and an optional manual login form. Once a user signs in, the app routes them to the correct workspace based on their role.

### Dashboard

The dashboard gives a high-level view of call activity and performance. It acts as the landing area for employees and managers and connects the main analytics pages into one workflow.

### Call Logs

The Call Logs page shows the raw call records stored in the system. Users can review:

- call IDs
- employee association
- call status
- date and time
- duration
- region
- customer and employee phone details
- transcript content

It also includes filtering, summaries, and CSV export support so call activity can be reviewed both inside and outside the app.

### AI Analysis

The AI Analysis page presents the processed analysis results for calls that have already been analyzed. Each entry includes:

- satisfaction score
- sentiment classification
- call summary
- follow-up recommendation

This page is designed as the read-only analysis view, making it easy to compare outcomes across calls without mixing it with data entry.

### Generate AI Analysis

The Generate Analysis page is the input workspace for creating new AI-powered call insights. A signed-in employee or manager can submit:

- call metadata
- duration
- timestamp
- customer phone
- transcript text

When submitted, the backend:

1. validates the request
2. applies quota and request throttling
3. sends the transcript to Gemini
4. stores the raw call record in MongoDB
5. stores the AI analysis result in MongoDB

This keeps the input flow separate from the read-only analysis dashboard while still updating the main dataset.

### Leaderboard

The Leaderboard page compares employee performance using the analyzed data. It helps managers quickly understand who is performing strongly across sentiment, satisfaction, and overall call handling quality.

### User Management

The User Management page is the admin workspace for managing people in the system. It supports:

- viewing users
- adding users
- updating roles
- deleting users

## AI Analysis Flow

The AI workflow is one of the central features of the application.

When a transcript is submitted:

1. the frontend sends the payload to the backend
2. the backend checks the quota and IP rate limit
3. Gemini generates a structured response
4. the raw call is written to the `calls` collection
5. the generated result is written to the `aidata` collection
6. the updated data becomes available across Call Logs, AI Analysis, Dashboard, and Leaderboard

This design keeps the AI generation process organized while preserving both the original call record and the analyzed result.

## Architecture Overview

The project is split into two main applications:

### Frontend

The frontend is built with React and Vite and provides the full user interface, including:

- authentication flow
- dashboard pages
- charts and tables
- CSV export
- AI analysis submission UI

### Backend

The backend is built with Express and Mongoose. It provides APIs for:

- AI analysis generation
- quota management
- call retrieval
- user retrieval
- AI data retrieval

### Database

MongoDB stores the main application data in collections such as:

- `users`
- `calls`
- `aidata`
- `aiquotas`

## Tech Stack

- Frontend: React, Vite, React Router
- UI: Radix UI, utility-first styling, Lucide icons
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- AI: Gemini API
- Deployment: Vercel

## Project Structure

```text
CustomerCallInsights/
├── backend/
│   ├── Controller/
│   ├── Models/
│   ├── Routes/
│   ├── middleware/
│   ├── services/
│   ├── app.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   └── pages/
│   ├── index.html
│   └── package.json
└── vercel.json
```

## Pages In The App

- `Login`
- `Dashboard`
- `Call Logs`
- `Call Analysis`
- `Generate Analysis`
- `Leaderboard`
- `User Management`

## Environment Variables

Use local `.env` files for development and Vercel environment variables for deployment.

### Backend Environment Variables

Create `backend/.env`:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
MONGODB_CONNECTION_STRING=your_mongodb_connection_string
MONGODB_DATABASE_NAME=your_database_name

GEMINI_API_KEY=your_gemini_api_key
AUTH_SESSION_SECRET=your_long_random_session_secret
AI_ADMIN_RESET_KEY=your_admin_reset_key
AI_SITE_LIMIT=100
GEMINI_API_MODEL=gemini-2.5-flash-lite
GEMINI_TIMEOUT_MS=20000
AI_IP_WINDOW_MS=600000
AI_IP_MAX_REQUESTS=5
AI_MAX_TRANSCRIPT_CHARS=12000
```

## Installation

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Run Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Local development URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

During development, the frontend uses a Vite proxy so requests to `/_/backend/*` are forwarded to the backend automatically.

## Build Commands

Build the frontend:

```bash
cd frontend
npm run build
```

Start the backend in production mode:

```bash
cd backend
npm start
```

## Backend API Overview

### AI Routes

- `POST /api/ai/analyze-call`
- `GET /api/ai/quota-status`
- `POST /api/ai/quota-reset`

### Data Routes

- `GET /api/data/all`

### Call Routes

- `GET /api/calls`

### User Routes

- `GET /api/users`

## Example AI Request

```bash
curl -X POST http://localhost:3000/api/ai/analyze-call \
  -H "Content-Type: application/json" \
  -d '{
    "eid": "EID05358",
    "status": "incoming",
    "timestamp": "2026-04-22T06:20:00.000Z",
    "duration": "4m 20s",
    "region": "Asia",
    "customer_phone": "9876543210",
    "employee_phone": "979434358",
    "transcript": "Customer called about an internet issue and the agent provided troubleshooting steps."
  }'
```

## Deployment On Vercel

The repository is configured for Vercel using `vercel.json`:

- frontend is served at `/`
- backend is served at `/_/backend`

Add the required backend environment variables in Vercel project settings, then redeploy the project.

Recommended backend variables for deployment:

- `MONGODB_CONNECTION_STRING`
- `MONGODB_DATABASE_NAME`
- `FRONTEND_URL`
- `AUTH_SESSION_SECRET`
- `GEMINI_API_KEY`
- `AI_ADMIN_RESET_KEY`
- `AI_SITE_LIMIT`
- `GEMINI_API_MODEL`
- `GEMINI_TIMEOUT_MS`
- `AI_IP_WINDOW_MS`
- `AI_IP_MAX_REQUESTS`
- `AI_MAX_TRANSCRIPT_CHARS`

## Summary

Customer Call Insights is designed to bring together raw call records, AI-generated summaries, and team-level performance tracking in one product. It supports day-to-day call review, manager visibility, and AI-assisted analysis in a workflow that connects input, storage, and analytics across the full application.
