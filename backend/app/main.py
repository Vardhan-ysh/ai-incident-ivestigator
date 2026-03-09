from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import Base, engine
import logging

# Initialize DB tables
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="AI Incident Investigator API",
    description="Retrieval-Augmented Forensic Analysis of LLM Outputs",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev purposes, restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "AI Incident Investigator API is running."}

from app.routes import incidents, analysis, evaluate, sandbox

app.include_router(incidents.router, prefix="/api/incidents", tags=["incidents"])
app.include_router(analysis.router, prefix="/api", tags=["analysis"])
app.include_router(evaluate.router, tags=["evaluation"]) # prefix is already in evaluate.py
app.include_router(sandbox.router, tags=["sandbox"]) # prefix is already in sandbox.py
