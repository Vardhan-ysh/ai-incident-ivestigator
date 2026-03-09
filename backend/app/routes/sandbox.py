from fastapi import APIRouter
from pydantic import BaseModel
from app.llm_client import llm_client

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])

class ChatRequest(BaseModel):
    prompt: str

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
def chat_with_model(req: ChatRequest):
    """Simple passthrough to the Gemini model for the sandbox chat interface."""
    response_text = llm_client.generate_response(req.prompt)
    return {"response": response_text}
