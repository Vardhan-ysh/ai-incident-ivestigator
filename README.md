# AI Incident Investigator

Retrieval-Augmented Forensic Analysis of LLM Outputs. A green-field implementation of an AI forensic auditor dashboard that uses local vector search (ChromaDB) and Chain-of-Thought (GPT-4o) inference to detect, classify and explain bad model generations.

## Prerequisites

- Docker and Docker Compose
- Node.js (v18+) and Python 3.11+ (if running locally without Docker)
- OpenAI API Key

## Setup & Configuration

1. Copy the example `.env` file to your actual environment file:

```bash
cp .env.example .env
```

2. Open `.env` and configure your `OPENAI_API_KEY`.

## Running the Application (Docker)

The fastest way to spin up the application end-to-end:

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API (Swagger UI):** http://localhost:8000/docs
- **Backend API (Redoc):** http://localhost:8000/redoc

## Running Locally Without Docker

**Backend (FastAPI)**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend (React/Vite)**

```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

## Ingesting Sample Incidents

You can seed the corpus using the interactive Swagger UI at `http://localhost:8000/docs`. POST an incident to `/api/incidents`. Make sure to provide a `true_label` (e.g., `hallucination`, `bias`, `policy_violation`) and a detailed `reference_explanation`. The backend will automatically embed and store the text into ChromaDB.

## Running Evaluation CLI

To run offline metrics (F1 score, accuracy, ECE calibration) against the corpus:

```bash
cd backend
# Make sure your backend API server is running on localhost:8000
python -m app.eval.run_eval --api-url http://localhost:8000
```
