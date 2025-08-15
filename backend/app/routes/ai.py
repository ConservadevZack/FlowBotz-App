from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from .auth import verify_token
import os

router = APIRouter()

# Pydantic models
class ChatMessage(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = "gpt-3.5-turbo"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000

class ChatResponse(BaseModel):
    message: ChatMessage
    usage: Dict[str, int]
    model: str

class ImageGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = "stable-diffusion"
    size: Optional[str] = "1024x1024"
    style: Optional[str] = "photorealistic"

class ImageGenerationResponse(BaseModel):
    url: str
    prompt: str
    model: str
    size: str

@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    current_user = Depends(verify_token)
):
    """AI chat completion endpoint"""
    # TODO: Implement with OpenAI/Together/Anthropic
    # For now, return mock response
    
    # Mock response based on the last user message
    last_message = request.messages[-1].content if request.messages else ""
    
    response_content = f"This is a mock AI response to: '{last_message}'. In a real implementation, this would connect to OpenAI, Together AI, or Anthropic APIs."
    
    return ChatResponse(
        message=ChatMessage(
            role="assistant",
            content=response_content
        ),
        usage={
            "prompt_tokens": 50,
            "completion_tokens": 25,
            "total_tokens": 75
        },
        model=request.model
    )

@router.post("/generate-image", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    current_user = Depends(verify_token)
):
    """AI image generation endpoint"""
    try:
        # Try OpenAI DALL-E first
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key and openai_key.startswith("sk-"):
            try:
                import openai
                client = openai.OpenAI(api_key=openai_key)
                
                response = client.images.generate(
                    model="dall-e-3",
                    prompt=request.prompt,
                    size="1024x1024",
                    quality="standard",
                    n=1
                )
                
                return ImageGenerationResponse(
                    url=response.data[0].url,
                    prompt=request.prompt,
                    model="dall-e-3",
                    size=request.size
                )
            except Exception as e:
                print(f"OpenAI DALL-E failed: {e}")
        
        # Try Stability AI as fallback
        stability_key = os.getenv("STABILITY_API_KEY")
        if stability_key and stability_key.startswith("sk-"):
            try:
                import httpx
                import base64
                import uuid
                
                # Call Stability AI API
                response = httpx.post(
                    "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
                    headers={
                        "Authorization": f"Bearer {stability_key}",
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    json={
                        "text_prompts": [
                            {
                                "text": request.prompt,
                                "weight": 1
                            }
                        ],
                        "cfg_scale": 7,
                        "height": 1024,
                        "width": 1024,
                        "samples": 1,
                        "steps": 30
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("artifacts") and len(data["artifacts"]) > 0:
                        # Convert base64 to a temporary URL or save to storage
                        image_data = data["artifacts"][0]["base64"]
                        # For now, return a data URL (in production, save to S3/Supabase Storage)
                        image_url = f"data:image/png;base64,{image_data}"
                        
                        return ImageGenerationResponse(
                            url=image_url,
                            prompt=request.prompt,
                            model="stable-diffusion-xl",
                            size=request.size
                        )
            except Exception as e:
                print(f"Stability AI failed: {e}")
        
        # If all AI services fail, return an error
        raise HTTPException(
            status_code=503,
            detail="AI image generation services are currently unavailable. Please check API keys and try again."
        )
        
    except Exception as e:
        print(f"Image generation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate image: {str(e)}"
        )

@router.get("/models")
async def get_available_models(current_user = Depends(verify_token)):
    """Get list of available AI models"""
    return {
        "chat_models": [
            {
                "id": "gpt-3.5-turbo",
                "name": "GPT-3.5 Turbo",
                "provider": "OpenAI",
                "description": "Fast and efficient for most tasks"
            },
            {
                "id": "gpt-4",
                "name": "GPT-4",
                "provider": "OpenAI", 
                "description": "Most capable model for complex tasks"
            },
            {
                "id": "claude-3-sonnet",
                "name": "Claude 3 Sonnet",
                "provider": "Anthropic",
                "description": "Balanced performance and capability"
            },
            {
                "id": "llama-2-70b",
                "name": "Llama 2 70B",
                "provider": "Together AI",
                "description": "Open source alternative"
            }
        ],
        "image_models": [
            {
                "id": "stable-diffusion",
                "name": "Stable Diffusion XL",
                "provider": "Stability AI",
                "description": "High-quality image generation"
            },
            {
                "id": "dall-e-3",
                "name": "DALL-E 3",
                "provider": "OpenAI",
                "description": "Latest image generation model"
            }
        ]
    }

@router.post("/workflow-suggestion")
async def suggest_workflow(
    description: str,
    current_user = Depends(verify_token)
):
    """Generate workflow suggestions based on description"""
    # TODO: Implement AI-powered workflow generation
    # For now, return mock response
    
    return {
        "suggestions": [
            {
                "name": f"Automated {description.split()[0] if description.split() else 'Task'}",
                "description": f"AI-generated workflow for: {description}",
                "config": {
                    "trigger": "schedule",
                    "actions": [
                        {"type": "data_collection", "params": {}},
                        {"type": "data_processing", "params": {}},
                        {"type": "notification", "params": {}}
                    ]
                },
                "tags": ["ai-generated", "automation"]
            }
        ],
        "confidence": 0.85
    }