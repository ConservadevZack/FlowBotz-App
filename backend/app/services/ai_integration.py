"""
AI Integration Service
Advanced multi-provider AI integration with model selection, routing, and batch processing
"""

from typing import Optional, List, Dict, Any, Union
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import asyncio
import json
import aiohttp
import os
from enum import Enum

from fastapi import HTTPException, status
from models.ai import (
    AIProvider, AIModel, AIGenerationRequest, AIGenerationResponse, 
    AIStylePreset, AIBatchRequest, AIUsageStats, AIQueue
)
from models.common import SecurityContext, Money
from .caching import CachingService

class ModelPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class AIIntegrationService:
    """Enterprise AI integration service with multi-provider support"""
    
    def __init__(self):
        self.cache = CachingService()
        self.providers = {}
        self.active_models = {}
        self.generation_queue = asyncio.Queue()
        self.batch_queue = asyncio.Queue()
        self.worker_tasks = []
        
        # Rate limits per provider (requests per minute)
        self.rate_limits = {
            AIProvider.OPENAI: 60,
            AIProvider.REPLICATE: 100,
            AIProvider.STABILITY_AI: 50,
            AIProvider.ANTHROPIC: 40,
            AIProvider.HUGGINGFACE: 200
        }
        
        # Cost tracking per model (USD per generation)
        self.model_costs = {
            "dall-e-3": 0.040,
            "dall-e-2": 0.020,
            "stable-diffusion-xl": 0.012,
            "midjourney": 0.025,
            "claude-3-opus": 0.015
        }
        
        # Initialize provider clients
        self._initialize_providers()
        
        # Start background workers
        self._start_workers()
    
    def _initialize_providers(self):
        """Initialize AI provider clients"""
        # OpenAI
        if os.getenv("OPENAI_API_KEY"):
            self.providers[AIProvider.OPENAI] = {
                "client": self._create_openai_client(),
                "models": ["dall-e-3", "dall-e-2", "gpt-4-vision"]
            }
        
        # Replicate
        if os.getenv("REPLICATE_API_TOKEN"):
            self.providers[AIProvider.REPLICATE] = {
                "client": self._create_replicate_client(),
                "models": ["stable-diffusion-xl", "sdxl-lightning", "flux-dev"]
            }
        
        # Stability AI
        if os.getenv("STABILITY_API_KEY"):
            self.providers[AIProvider.STABILITY_AI] = {
                "client": self._create_stability_client(),
                "models": ["stable-diffusion-3", "stable-diffusion-xl"]
            }
        
        # Anthropic
        if os.getenv("ANTHROPIC_API_KEY"):
            self.providers[AIProvider.ANTHROPIC] = {
                "client": self._create_anthropic_client(),
                "models": ["claude-3-opus", "claude-3-sonnet"]
            }
    
    def _start_workers(self):
        """Start background worker tasks"""
        # Generation workers
        for _ in range(5):
            task = asyncio.create_task(self._generation_worker())
            self.worker_tasks.append(task)
        
        # Batch processing worker
        batch_task = asyncio.create_task(self._batch_worker())
        self.worker_tasks.append(batch_task)
    
    async def generate_image(
        self, 
        request: AIGenerationRequest, 
        user_context: SecurityContext,
        priority: ModelPriority = ModelPriority.NORMAL
    ) -> AIGenerationResponse:
        """Generate image using specified AI model"""
        try:
            # Validate and get model
            model = await self._get_model(request.model_id)
            if not model:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="AI model not found"
                )
            
            # Check rate limits
            await self._check_rate_limit(user_context.user_id, model.provider)
            
            # Check user credits/subscription
            await self._check_user_credits(user_context.user_id, model)
            
            # Create generation response record
            response = AIGenerationResponse(
                id=uuid4(),
                user_id=user_context.user_id,
                model_id=request.model_id,
                prompt=request.prompt,
                parameters=request.dict(),
                status="pending",
                created_at=datetime.utcnow()
            )
            
            # Calculate cost
            cost_amount = self.model_costs.get(model.model_id, 0.020)
            response.cost = Money(amount=cost_amount, currency="USD")
            
            # Queue for processing
            queue_item = AIQueue(
                id=uuid4(),
                user_id=user_context.user_id,
                request_data={
                    "type": "single_generation",
                    "request": request.dict(),
                    "response_id": str(response.id),
                    "model": model.dict()
                },
                priority=self._get_priority_value(priority),
                created_at=datetime.utcnow()
            )
            
            await self.generation_queue.put(queue_item)
            
            # Store response in cache for tracking
            await self.cache.set(
                f"ai_generation:{response.id}", 
                response.dict(), 
                ttl=3600
            )
            
            return response
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to initiate AI generation: {str(e)}"
            )
    
    async def batch_generate(
        self, 
        batch_request: AIBatchRequest,
        user_context: SecurityContext
    ) -> AIBatchRequest:
        """Process batch AI generation requests"""
        try:
            # Validate batch size
            if len(batch_request.requests) > 50:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Batch size exceeds maximum (50 requests)"
                )
            
            batch_request.id = uuid4()
            batch_request.user_id = user_context.user_id
            batch_request.total_requests = len(batch_request.requests)
            batch_request.created_at = datetime.utcnow()
            
            # Estimate cost
            total_cost = 0.0
            for req in batch_request.requests:
                model = await self._get_model(req.model_id)
                if model:
                    cost = self.model_costs.get(model.model_id, 0.020)
                    total_cost += cost * req.num_images
            
            batch_request.estimated_cost = Money(amount=total_cost, currency="USD")
            
            # Check user credits for entire batch
            await self._check_batch_credits(user_context.user_id, batch_request)
            
            # Queue batch for processing
            await self.batch_queue.put(batch_request)
            
            # Store batch status in cache
            await self.cache.set(
                f"ai_batch:{batch_request.id}",
                batch_request.dict(),
                ttl=86400  # 24 hours
            )
            
            return batch_request
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process batch request: {str(e)}"
            )
    
    async def get_generation_status(
        self, 
        generation_id: UUID,
        user_context: SecurityContext
    ) -> AIGenerationResponse:
        """Get status of AI generation"""
        # Check cache first
        cached = await self.cache.get(f"ai_generation:{generation_id}")
        if not cached:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Generation not found"
            )
        
        response = AIGenerationResponse(**cached)
        
        # Verify user owns this generation
        if response.user_id != user_context.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return response
    
    async def get_batch_status(
        self, 
        batch_id: UUID,
        user_context: SecurityContext
    ) -> AIBatchRequest:
        """Get status of batch generation"""
        cached = await self.cache.get(f"ai_batch:{batch_id}")
        if not cached:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        batch = AIBatchRequest(**cached)
        
        if batch.user_id != user_context.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return batch
    
    async def get_available_models(
        self, 
        model_type: Optional[str] = None,
        provider: Optional[AIProvider] = None
    ) -> List[AIModel]:
        """Get list of available AI models"""
        # This would query the database for available models
        # For now, return mock data
        models = []
        
        for prov, data in self.providers.items():
            if provider and prov != provider:
                continue
                
            for model_id in data["models"]:
                model = AIModel(
                    id=uuid4(),
                    name=model_id,
                    display_name=model_id.replace("-", " ").title(),
                    provider=prov,
                    model_id=model_id,
                    type="text_to_image",
                    cost_per_generation=Money(
                        amount=self.model_costs.get(model_id, 0.020),
                        currency="USD"
                    ),
                    is_active=True
                )
                models.append(model)
        
        return models
    
    async def get_style_presets(
        self, 
        category: Optional[str] = None
    ) -> List[AIStylePreset]:
        """Get available style presets"""
        # Mock data for style presets
        presets = [
            AIStylePreset(
                id=uuid4(),
                name="Photorealistic",
                category="photography",
                prompt_template="photorealistic, high quality, detailed, {prompt}",
                negative_prompt="cartoon, anime, painting, sketch",
                parameters={"guidance_scale": 7.5, "steps": 30},
                is_featured=True
            ),
            AIStylePreset(
                id=uuid4(),
                name="Digital Art",
                category="art",
                prompt_template="digital art, concept art, {prompt}",
                parameters={"guidance_scale": 10, "steps": 40},
                is_featured=True
            ),
            AIStylePreset(
                id=uuid4(),
                name="Minimalist",
                category="design",
                prompt_template="minimalist, clean, simple, {prompt}",
                negative_prompt="busy, cluttered, complex",
                parameters={"guidance_scale": 6, "steps": 25}
            )
        ]
        
        if category:
            presets = [p for p in presets if p.category == category]
        
        return presets
    
    async def get_usage_stats(
        self, 
        user_id: UUID,
        period_days: int = 30
    ) -> AIUsageStats:
        """Get AI usage statistics for user"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        # This would query actual usage data
        stats = AIUsageStats(
            id=uuid4(),
            user_id=user_id,
            period_start=start_date,
            period_end=end_date,
            period_type="custom",
            total_requests=150,
            successful_requests=145,
            failed_requests=5,
            total_cost=Money(amount=3.50, currency="USD"),
            avg_cost_per_request=Money(amount=0.023, currency="USD")
        )
        
        return stats
    
    async def _generation_worker(self):
        """Background worker for processing AI generations"""
        while True:
            try:
                # Get next item from queue
                queue_item = await self.generation_queue.get()
                
                # Process generation
                await self._process_generation(queue_item)
                
                # Mark task as done
                self.generation_queue.task_done()
                
            except Exception as e:
                print(f"Generation worker error: {e}")
                await asyncio.sleep(5)
    
    async def _batch_worker(self):
        """Background worker for processing batch requests"""
        while True:
            try:
                # Get next batch from queue
                batch = await self.batch_queue.get()
                
                # Process batch
                await self._process_batch(batch)
                
                # Mark task as done
                self.batch_queue.task_done()
                
            except Exception as e:
                print(f"Batch worker error: {e}")
                await asyncio.sleep(10)
    
    async def _process_generation(self, queue_item: AIQueue):
        """Process individual AI generation"""
        try:
            data = queue_item.request_data
            request = AIGenerationRequest(**data["request"])
            model = AIModel(**data["model"])
            response_id = UUID(data["response_id"])
            
            # Get current response from cache
            cached_response = await self.cache.get(f"ai_generation:{response_id}")
            if not cached_response:
                return
            
            response = AIGenerationResponse(**cached_response)
            
            # Update status
            response.status = "processing"
            response.started_at = datetime.utcnow()
            
            # Store updated status
            await self.cache.set(f"ai_generation:{response_id}", response.dict(), ttl=3600)
            
            # Call appropriate provider
            result = await self._call_provider_api(model.provider, request, model)
            
            # Update response with results
            response.status = "completed"
            response.completed_at = datetime.utcnow()
            response.processing_time = (
                response.completed_at - response.started_at
            ).total_seconds()
            response.output_urls = result.get("urls", [])
            response.metadata = result.get("metadata", {})
            
            # Store final result
            await self.cache.set(f"ai_generation:{response_id}", response.dict(), ttl=86400)
            
        except Exception as e:
            # Handle error
            response.status = "failed"
            response.error_message = str(e)
            response.completed_at = datetime.utcnow()
            
            await self.cache.set(f"ai_generation:{response_id}", response.dict(), ttl=86400)
    
    async def _process_batch(self, batch: AIBatchRequest):
        """Process batch AI generation request"""
        try:
            batch.status = "processing"
            await self.cache.set(f"ai_batch:{batch.id}", batch.dict(), ttl=86400)
            
            # Process requests in parallel (with concurrency limit)
            semaphore = asyncio.Semaphore(3)  # Max 3 concurrent generations
            
            async def process_request(req):
                async with semaphore:
                    # Create individual generation
                    response = AIGenerationResponse(
                        id=uuid4(),
                        user_id=batch.user_id,
                        model_id=req.model_id,
                        prompt=req.prompt,
                        parameters=req.dict(),
                        status="processing",
                        created_at=datetime.utcnow()
                    )
                    
                    # Add to queue for processing
                    model = await self._get_model(req.model_id)
                    queue_item = AIQueue(
                        id=uuid4(),
                        user_id=batch.user_id,
                        request_data={
                            "type": "batch_generation",
                            "request": req.dict(),
                            "response_id": str(response.id),
                            "model": model.dict() if model else {},
                            "batch_id": str(batch.id)
                        },
                        priority=batch.priority
                    )
                    
                    await self.generation_queue.put(queue_item)
                    return response.id
            
            # Process all requests
            tasks = [process_request(req) for req in batch.requests]
            batch.results = await asyncio.gather(*tasks)
            
            batch.status = "completed"
            batch.completed_requests = len(batch.results)
            
            await self.cache.set(f"ai_batch:{batch.id}", batch.dict(), ttl=86400)
            
        except Exception as e:
            batch.status = "failed"
            batch.error_message = str(e)
            await self.cache.set(f"ai_batch:{batch.id}", batch.dict(), ttl=86400)
    
    async def _call_provider_api(
        self, 
        provider: AIProvider, 
        request: AIGenerationRequest,
        model: AIModel
    ) -> Dict[str, Any]:
        """Call specific AI provider API"""
        if provider == AIProvider.OPENAI:
            return await self._call_openai_api(request, model)
        elif provider == AIProvider.REPLICATE:
            return await self._call_replicate_api(request, model)
        elif provider == AIProvider.STABILITY_AI:
            return await self._call_stability_api(request, model)
        else:
            raise NotImplementedError(f"Provider {provider} not implemented")
    
    async def _call_openai_api(self, request: AIGenerationRequest, model: AIModel) -> Dict[str, Any]:
        """Call OpenAI DALL-E API"""
        # Mock implementation - replace with actual API call
        return {
            "urls": [f"https://mock-openai-url.com/{uuid4()}.png"],
            "metadata": {"model": model.model_id, "revised_prompt": request.prompt}
        }
    
    async def _call_replicate_api(self, request: AIGenerationRequest, model: AIModel) -> Dict[str, Any]:
        """Call Replicate API"""
        # Mock implementation
        return {
            "urls": [f"https://mock-replicate-url.com/{uuid4()}.png"],
            "metadata": {"model": model.model_id, "seed": 12345}
        }
    
    async def _call_stability_api(self, request: AIGenerationRequest, model: AIModel) -> Dict[str, Any]:
        """Call Stability AI API"""
        # Mock implementation
        return {
            "urls": [f"https://mock-stability-url.com/{uuid4()}.png"],
            "metadata": {"model": model.model_id, "cfg_scale": request.guidance_scale}
        }
    
    def _get_priority_value(self, priority: ModelPriority) -> int:
        """Convert priority enum to numeric value"""
        priority_values = {
            ModelPriority.LOW: 1,
            ModelPriority.NORMAL: 5,
            ModelPriority.HIGH: 8,
            ModelPriority.URGENT: 10
        }
        return priority_values.get(priority, 5)
    
    async def _get_model(self, model_id: UUID) -> Optional[AIModel]:
        """Get AI model by ID"""
        # This would query the database
        # For now, return mock model
        return AIModel(
            id=model_id,
            name="DALL-E 3",
            provider=AIProvider.OPENAI,
            model_id="dall-e-3",
            type="text_to_image",
            is_active=True
        )
    
    async def _check_rate_limit(self, user_id: UUID, provider: AIProvider):
        """Check if user has exceeded rate limits"""
        key = f"rate_limit:{user_id}:{provider}"
        current_count = await self.cache.get(key) or 0
        limit = self.rate_limits.get(provider, 60)
        
        if current_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {provider}"
            )
        
        # Increment counter
        await self.cache.set(key, current_count + 1, ttl=60)
    
    async def _check_user_credits(self, user_id: UUID, model: AIModel):
        """Check if user has sufficient credits"""
        # This would check user's subscription/credits
        # For now, assume they have credits
        pass
    
    async def _check_batch_credits(self, user_id: UUID, batch: AIBatchRequest):
        """Check if user has credits for entire batch"""
        # This would check if user can afford the entire batch
        pass
    
    def _create_openai_client(self):
        """Create OpenAI client"""
        # Return mock client for now
        return {"type": "openai"}
    
    def _create_replicate_client(self):
        """Create Replicate client"""
        return {"type": "replicate"}
    
    def _create_stability_client(self):
        """Create Stability AI client"""
        return {"type": "stability"}
    
    def _create_anthropic_client(self):
        """Create Anthropic client"""
        return {"type": "anthropic"}