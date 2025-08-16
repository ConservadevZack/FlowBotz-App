# Database connection and service layer for FlowBotz
import os
from datetime import datetime, timezone
import uuid
from typing import Optional, List, Dict, Any
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    print("Warning: Supabase client not available")
    SUPABASE_AVAILABLE = False
    Client = None
import asyncpg
import asyncio
import json

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_ANON_KEY", "")

# Initialize with basic options to avoid proxy parameter issue
supabase = None
if SUPABASE_AVAILABLE and supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Supabase client initialized successfully")
    except Exception as e:
        print(f"⚠️  Supabase client initialization failed: {e}")
        print("   Database operations will be limited.")
        supabase = None
else:
    print("⚠️  Supabase configuration missing or unavailable")

# Database connection pool for direct SQL operations when needed
_db_pool = None

async def get_db_pool():
    """Get database connection pool"""
    global _db_pool
    if _db_pool is None:
        database_url = os.getenv("DATABASE_URL", "")
        if database_url:
            _db_pool = await asyncpg.create_pool(database_url)
    return _db_pool

class DatabaseService:
    """Database service layer for FlowBotz production operations"""
    
    def __init__(self):
        self.supabase = supabase
        if not self.supabase:
            print("Warning: Supabase client not available. Using fallback mode.")

    # ===========================================
    # USER OPERATIONS
    # ===========================================
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        if not self.supabase:
            return None
            
        try:
            result = self.supabase.table("users").select("*").eq("id", user_id).single().execute()
            return result.data if result.data else None
        except Exception as e:
            print(f"Error fetching user {user_id}: {e}")
            return None

    async def update_user_stats(self, user_id: str, stat_updates: Dict[str, Any]):
        """Update user statistics"""
        try:
            # Check if user_stats record exists
            existing = self.supabase.table("user_stats").select("user_id").eq("user_id", user_id).execute()
            
            if existing.data:
                # Update existing record
                result = self.supabase.table("user_stats").update(stat_updates).eq("user_id", user_id).execute()
            else:
                # Create new record
                stat_updates["user_id"] = user_id
                result = self.supabase.table("user_stats").insert(stat_updates).execute()
            
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error updating user stats for {user_id}: {e}")
            return None

    # ===========================================
    # AI GENERATION OPERATIONS
    # ===========================================
    
    async def create_ai_generation(self, user_id: str, prompt: str, model_name: str, 
                                 parameters: Dict = None, design_id: str = None) -> Optional[Dict]:
        """Create AI generation record"""
        if not self.supabase:
            # Return mock data for development
            return {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "prompt": prompt,
                "model_name": model_name,
                "status": "pending"
            }
            
        try:
            # Get AI model ID
            model_result = self.supabase.table("ai_models").select("id").eq("name", model_name).single().execute()
            if not model_result.data:
                # Create model if it doesn't exist
                model_data = {
                    "name": model_name,
                    "provider": "openai" if "dall-e" in model_name.lower() else "stability",
                    "model_id": model_name.lower().replace(" ", "-"),
                    "type": "text-to-image",
                    "cost_per_generation": 0.04 if "dall-e" in model_name.lower() else 0.02,
                    "is_active": True
                }
                model_result = self.supabase.table("ai_models").insert(model_data).execute()
            
            model_id = model_result.data["id"] if model_result.data else str(uuid.uuid4())
            
            # Create generation record
            generation_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "design_id": design_id,
                "model_id": model_id,
                "prompt": prompt,
                "parameters": parameters or {},
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table("ai_generations").insert(generation_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating AI generation: {e}")
            return None

    async def update_ai_generation(self, generation_id: str, updates: Dict) -> Optional[Dict]:
        """Update AI generation record"""
        try:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            result = self.supabase.table("ai_generations").update(updates).eq("id", generation_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error updating AI generation {generation_id}: {e}")
            return None

    async def complete_ai_generation(self, generation_id: str, result_urls: List[str], 
                                   cost: float, processing_time: int):
        """Mark AI generation as completed"""
        try:
            updates = {
                "status": "completed",
                "result_urls": result_urls,
                "cost": cost,
                "processing_time": processing_time,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
            return await self.update_ai_generation(generation_id, updates)
        except Exception as e:
            print(f"Error completing AI generation {generation_id}: {e}")
            return None

    async def fail_ai_generation(self, generation_id: str, error_message: str):
        """Mark AI generation as failed"""
        try:
            updates = {
                "status": "failed",
                "error_message": error_message,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
            return await self.update_ai_generation(generation_id, updates)
        except Exception as e:
            print(f"Error failing AI generation {generation_id}: {e}")
            return None

    # ===========================================
    # DESIGN OPERATIONS
    # ===========================================
    
    async def create_design(self, user_id: str, title: str, design_type: str = "ai_generated",
                          canvas_data: Dict = None, ai_prompt: str = None, ai_model: str = None) -> Optional[Dict]:
        """Create new design record"""
        try:
            design_data = {
                "id": str(uuid.uuid4()),
                "title": title,
                "slug": title.lower().replace(" ", "-").replace("_", "-"),
                "owner_id": user_id,
                "type": design_type,
                "status": "draft",
                "visibility": "private",
                "canvas": canvas_data or {"width": 800, "height": 600, "background_color": "#ffffff"},
                "ai_generated": ai_prompt is not None,
                "ai_prompt": ai_prompt,
                "ai_model": ai_model,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table("designs").insert(design_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating design: {e}")
            return None

    async def get_user_designs(self, user_id: str, limit: int = 20, status: str = None) -> List[Dict]:
        """Get user's designs"""
        try:
            query = self.supabase.table("designs").select("*").eq("owner_id", user_id)
            
            if status:
                query = query.eq("status", status)
                
            query = query.order("created_at", desc=True).limit(limit)
            result = query.execute()
            
            return result.data or []
        except Exception as e:
            print(f"Error fetching user designs: {e}")
            return []

    async def update_design(self, design_id: str, updates: Dict) -> Optional[Dict]:
        """Update design"""
        try:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            result = self.supabase.table("designs").update(updates).eq("id", design_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error updating design {design_id}: {e}")
            return None

    # ===========================================
    # ANALYTICS & EVENTS
    # ===========================================
    
    async def track_event(self, user_id: str, event_type: str, event_action: str, 
                         properties: Dict = None, session_id: str = None):
        """Track user event for analytics"""
        if not self.supabase:
            print(f"📊 Event tracked (offline): {event_type}.{event_action} for user {user_id}")
            return None
            
        try:
            event_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "session_id": session_id,
                "event_type": event_type,
                "event_category": event_type.split("_")[0],  # e.g., "design" from "design_created"
                "event_action": event_action,
                "properties": properties or {},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table("events").insert(event_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error tracking event: {e}")
            return None

    # ===========================================
    # ORDER OPERATIONS  
    # ===========================================
    
    async def create_order(self, user_id: str, product_details: Dict, total_amount: float,
                          shipping_address: Dict, payment_intent_id: str = None) -> Optional[Dict]:
        """Create order record"""
        try:
            order_number = f"FBZ{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            order_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "order_number": order_number,
                "status": "pending",
                "subtotal": total_amount,
                "total_amount": total_amount,
                "currency": "USD",
                "shipping_address": shipping_address,
                "payment_intent_id": payment_intent_id,
                "metadata": {"products": [product_details]},
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table("orders").insert(order_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating order: {e}")
            return None

    async def update_order_status(self, order_id: str, status: str, tracking_numbers: List[str] = None):
        """Update order status"""
        try:
            updates = {
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if tracking_numbers:
                updates["tracking_numbers"] = tracking_numbers
                
            if status == "shipped":
                updates["shipped_at"] = datetime.now(timezone.utc).isoformat()
            elif status == "delivered":
                updates["delivered_at"] = datetime.now(timezone.utc).isoformat()
                
            result = self.supabase.table("orders").update(updates).eq("id", order_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error updating order status: {e}")
            return None

    async def get_order_by_payment_intent(self, payment_intent_id: str) -> Optional[Dict]:
        """Get order by payment intent ID"""
        try:
            result = self.supabase.table("orders").select("*").eq("payment_intent_id", payment_intent_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error getting order by payment intent: {e}")
            return None

    async def get_order_by_pod_id(self, pod_order_id: str) -> Optional[Dict]:
        """Get order by POD provider order ID"""
        try:
            result = self.supabase.table("orders").select("*").execute()
            
            for order in result.data:
                metadata = order.get('metadata', {})
                products = metadata.get('products', [])
                
                # Check if any product has this POD order ID
                for product in products:
                    if product.get('pod_order_id') == pod_order_id:
                        return order
            
            return None
        except Exception as e:
            print(f"Error getting order by POD ID: {e}")
            return None

    async def update_order_pod_status(self, order_id: str, pod_updates: Dict) -> Optional[Dict]:
        """Update order with POD provider status and tracking info"""
        try:
            updates = {
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Map POD-specific fields
            if 'status' in pod_updates:
                updates['status'] = pod_updates['status']
            
            if 'tracking_number' in pod_updates:
                updates['tracking_number'] = pod_updates['tracking_number']
            
            if 'tracking_url' in pod_updates:
                updates['tracking_url'] = pod_updates['tracking_url']
            
            if 'carrier' in pod_updates:
                updates['carrier'] = pod_updates['carrier']
            
            if 'provider_status' in pod_updates:
                updates['provider_status'] = pod_updates['provider_status']
            
            if 'shipped_at' in pod_updates:
                updates['shipped_at'] = pod_updates['shipped_at']
            
            if 'delivered_at' in pod_updates:
                updates['delivered_at'] = pod_updates['delivered_at']
            
            if 'canceled_at' in pod_updates:
                updates['canceled_at'] = pod_updates['canceled_at']
            
            if 'error_message' in pod_updates:
                updates['error_message'] = pod_updates['error_message']
            
            result = self.supabase.table("orders").update(updates).eq("id", order_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error updating order POD status: {e}")
            return None

    async def get_user_orders(self, user_id: str, limit: int = 10, offset: int = 0) -> List[Dict]:
        """Get user's orders with POD tracking info"""
        try:
            result = self.supabase.table("orders")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .offset(offset)\
                .execute()
            
            return result.data or []
        except Exception as e:
            print(f"Error getting user orders: {e}")
            return []

    async def sync_pod_order_status(self, pod_order_id: str, provider: str) -> bool:
        """Sync order status from POD provider API (fallback for webhook failures)"""
        try:
            if provider == "printful":
                from .routes.payments import get_printful_order_status
                status_data = await get_printful_order_status(pod_order_id)
            elif provider == "printify":
                from .routes.payments import get_printify_order_status
                status_data = await get_printify_order_status(pod_order_id)
            else:
                return False
            
            if status_data and 'status' in status_data:
                # Find and update the order
                order = await self.get_order_by_pod_id(pod_order_id)
                if order:
                    pod_updates = {
                        'status': status_data.get('status'),
                        'tracking_number': status_data.get('tracking_number'),
                        'tracking_url': status_data.get('tracking_url'),
                        'provider_status': status_data.get('status')
                    }
                    
                    await self.update_order_pod_status(order['id'], pod_updates)
                    return True
            
            return False
        except Exception as e:
            print(f"Error syncing POD order status: {e}")
            return False

    # ===========================================
    # HELPER METHODS
    # ===========================================
    
    async def get_ai_models(self) -> List[Dict]:
        """Get available AI models"""
        try:
            result = self.supabase.table("ai_models").select("*").eq("is_active", True).execute()
            return result.data or []
        except Exception as e:
            print(f"Error fetching AI models: {e}")
            return []

    async def increment_user_stat(self, user_id: str, stat_name: str, increment: int = 1):
        """Increment a user statistic"""
        if not self.supabase:
            print(f"📊 Stat increment (offline): {stat_name} += {increment} for user {user_id}")
            return None
            
        try:
            # Get current stats
            existing = self.supabase.table("user_stats").select("*").eq("user_id", user_id).execute()
            
            if existing.data:
                # Update existing record
                current_stats = existing.data[0]
                current_value = current_stats.get(stat_name, 0)
                updates = {stat_name: current_value + increment}
                result = self.supabase.table("user_stats").update(updates).eq("user_id", user_id).execute()
            else:
                # Create new record
                stat_data = {"user_id": user_id, stat_name: increment}
                result = self.supabase.table("user_stats").insert(stat_data).execute()
                
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error incrementing user stat {stat_name}: {e}")
            return None

    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        if not self.supabase:
            # Return mock stats for development
            return {
                "ai_generations": 5,
                "ai_credits_used": 12,
                "purchased_credits": 0,
                "designs_created": 3
            }
            
        try:
            result = self.supabase.table("user_stats").select("*").eq("user_id", user_id).single().execute()
            return result.data if result.data else {}
        except Exception as e:
            print(f"Error fetching user stats: {e}")
            return {}

# Global database service instance
db_service = DatabaseService()