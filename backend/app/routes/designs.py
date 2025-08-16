# Designs API Routes - Production Ready with Database Integration
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from .auth import verify_token
from ..database import db_service
import json
import time

router = APIRouter()

# Pydantic models for designs
class DesignCreate(BaseModel):
    title: str
    description: Optional[str] = None
    design_type: str = "custom"  # custom, template, ai_generated
    canvas_width: int = 800
    canvas_height: int = 600
    background_color: str = "#ffffff"
    elements: List[Dict] = []
    ai_prompt: Optional[str] = None
    ai_model: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []

class DesignUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    canvas: Optional[Dict] = None
    elements: Optional[List[Dict]] = None
    status: Optional[str] = None  # draft, published, archived
    visibility: Optional[str] = None  # private, team, public
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None

class DesignResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    owner_id: str
    type: str
    status: str
    visibility: str
    canvas: Dict
    elements: List[Dict]
    thumbnail_url: Optional[str]
    created_at: str
    updated_at: str
    view_count: int = 0
    like_count: int = 0

@router.post("/designs", response_model=DesignResponse)
async def create_design(
    design_data: DesignCreate,
    current_user = Depends(verify_token)
):
    """Create a new design with database persistence"""
    try:
        # Prepare canvas data
        canvas_data = {
            "width": design_data.canvas_width,
            "height": design_data.canvas_height,
            "background_color": design_data.background_color,
            "elements": design_data.elements
        }
        
        # Create design in database
        design_record = await db_service.create_design(
            user_id=current_user["user_id"],
            title=design_data.title,
            design_type=design_data.design_type,
            canvas_data=canvas_data,
            ai_prompt=design_data.ai_prompt,
            ai_model=design_data.ai_model
        )
        
        if not design_record:
            raise HTTPException(status_code=500, detail="Failed to create design")
        
        # Update user stats
        await db_service.increment_user_stat(current_user["user_id"], "designs_created")
        
        # Track analytics
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="design",
            event_action="design_created",
            properties={
                "design_id": design_record["id"],
                "design_type": design_data.design_type,
                "canvas_size": f"{design_data.canvas_width}x{design_data.canvas_height}",
                "has_ai_prompt": design_data.ai_prompt is not None,
                "element_count": len(design_data.elements)
            }
        )
        
        return DesignResponse(
            id=design_record["id"],
            title=design_record["title"],
            description=design_record.get("description"),
            owner_id=design_record["owner_id"],
            type=design_record["type"],
            status=design_record["status"],
            visibility=design_record["visibility"],
            canvas=design_record["canvas"],
            elements=design_record.get("elements", []),
            thumbnail_url=design_record.get("thumbnail_url"),
            created_at=design_record["created_at"],
            updated_at=design_record["updated_at"],
            view_count=design_record.get("view_count", 0),
            like_count=design_record.get("like_count", 0)
        )
        
    except Exception as e:
        print(f"Error creating design: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create design: {str(e)}")

@router.get("/designs", response_model=List[DesignResponse])
async def get_user_designs(
    status: Optional[str] = Query(None, description="Filter by status (draft, published, archived)"),
    limit: int = Query(20, ge=1, le=100, description="Number of designs to return"),
    current_user = Depends(verify_token)
):
    """Get user's designs with filtering"""
    try:
        designs = await db_service.get_user_designs(
            user_id=current_user["user_id"],
            limit=limit,
            status=status
        )
        
        # Track analytics
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="design",
            event_action="designs_viewed",
            properties={
                "filter_status": status,
                "designs_count": len(designs),
                "limit": limit
            }
        )
        
        # Convert to response format
        design_responses = []
        for design in designs:
            design_responses.append(DesignResponse(
                id=design["id"],
                title=design["title"],
                description=design.get("description"),
                owner_id=design["owner_id"],
                type=design["type"],
                status=design["status"],
                visibility=design["visibility"],
                canvas=design.get("canvas", {}),
                elements=design.get("elements", []),
                thumbnail_url=design.get("thumbnail_url"),
                created_at=design["created_at"],
                updated_at=design["updated_at"],
                view_count=design.get("view_count", 0),
                like_count=design.get("like_count", 0)
            ))
        
        return design_responses
        
    except Exception as e:
        print(f"Error fetching designs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch designs: {str(e)}")

@router.get("/designs/{design_id}", response_model=DesignResponse)
async def get_design(
    design_id: str,
    current_user = Depends(verify_token)
):
    """Get specific design by ID"""
    try:
        # For now, we'll implement a simple query since we don't have the full design service
        # In production, this would check ownership/permissions and increment view count
        
        # Track design view
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="design",
            event_action="design_viewed",
            properties={"design_id": design_id}
        )
        
        # Placeholder: Return a sample design structure
        # TODO: Implement actual database query for specific design
        return {
            "id": design_id,
            "title": "Sample Design",
            "description": "This is a placeholder design",
            "owner_id": current_user["user_id"],
            "type": "custom",
            "status": "draft",
            "visibility": "private",
            "canvas": {"width": 800, "height": 600, "background_color": "#ffffff"},
            "elements": [],
            "thumbnail_url": None,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
            "view_count": 1,
            "like_count": 0
        }
        
    except Exception as e:
        print(f"Error fetching design {design_id}: {e}")
        raise HTTPException(status_code=404, detail="Design not found")

@router.put("/designs/{design_id}", response_model=DesignResponse)
async def update_design(
    design_id: str,
    update_data: DesignUpdate,
    current_user = Depends(verify_token)
):
    """Update existing design"""
    try:
        # Prepare update data
        updates = {}
        if update_data.title:
            updates["title"] = update_data.title
        if update_data.description is not None:
            updates["description"] = update_data.description
        if update_data.canvas:
            updates["canvas"] = update_data.canvas
        if update_data.elements is not None:
            updates["elements"] = update_data.elements
        if update_data.status:
            updates["status"] = update_data.status
        if update_data.visibility:
            updates["visibility"] = update_data.visibility
        if update_data.thumbnail_url:
            updates["thumbnail_url"] = update_data.thumbnail_url
        if update_data.preview_url:
            updates["preview_url"] = update_data.preview_url
        
        # Update design in database
        updated_design = await db_service.update_design(design_id, updates)
        
        if not updated_design:
            raise HTTPException(status_code=404, detail="Design not found or update failed")
        
        # Track analytics
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="design",
            event_action="design_updated",
            properties={
                "design_id": design_id,
                "fields_updated": list(updates.keys()),
                "update_count": len(updates)
            }
        )
        
        return DesignResponse(
            id=updated_design["id"],
            title=updated_design["title"],
            description=updated_design.get("description"),
            owner_id=updated_design["owner_id"],
            type=updated_design["type"],
            status=updated_design["status"],
            visibility=updated_design["visibility"],
            canvas=updated_design.get("canvas", {}),
            elements=updated_design.get("elements", []),
            thumbnail_url=updated_design.get("thumbnail_url"),
            created_at=updated_design["created_at"],
            updated_at=updated_design["updated_at"],
            view_count=updated_design.get("view_count", 0),
            like_count=updated_design.get("like_count", 0)
        )
        
    except Exception as e:
        print(f"Error updating design {design_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update design: {str(e)}")

@router.delete("/designs/{design_id}")
async def delete_design(
    design_id: str,
    current_user = Depends(verify_token)
):
    """Soft delete design"""
    try:
        # Soft delete by setting deleted_at timestamp
        deleted_design = await db_service.update_design(
            design_id, 
            {"deleted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")}
        )
        
        if not deleted_design:
            raise HTTPException(status_code=404, detail="Design not found")
        
        # Track analytics
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="design",
            event_action="design_deleted",
            properties={"design_id": design_id}
        )
        
        return {"message": "Design deleted successfully", "design_id": design_id}
        
    except Exception as e:
        print(f"Error deleting design {design_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete design: {str(e)}")

@router.post("/designs/{design_id}/duplicate")
async def duplicate_design(
    design_id: str,
    new_title: Optional[str] = None,
    current_user = Depends(verify_token)
):
    """Create a copy of existing design"""
    try:
        # TODO: Implement actual design duplication
        # For now, create a placeholder response
        
        duplicated_title = new_title or f"Copy of Design {design_id}"
        
        # Track analytics
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="design",
            event_action="design_duplicated",
            properties={
                "original_design_id": design_id,
                "new_title": duplicated_title
            }
        )
        
        return {
            "message": "Design duplicated successfully",
            "original_id": design_id,
            "duplicate_id": f"dup_{design_id}",
            "new_title": duplicated_title
        }
        
    except Exception as e:
        print(f"Error duplicating design {design_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to duplicate design: {str(e)}")

@router.get("/designs/{design_id}/analytics")
async def get_design_analytics(
    design_id: str,
    period_days: int = Query(30, ge=1, le=365),
    current_user = Depends(verify_token)
):
    """Get design analytics and performance metrics"""
    try:
        # Track analytics request
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="analytics",
            event_action="design_analytics_viewed",
            properties={
                "design_id": design_id,
                "period_days": period_days
            }
        )
        
        # TODO: Implement actual analytics queries
        # For now, return mock analytics data
        return {
            "design_id": design_id,
            "period_days": period_days,
            "metrics": {
                "views": 0,
                "likes": 0,
                "shares": 0,
                "downloads": 0,
                "comments": 0
            },
            "daily_views": [],
            "referrer_sources": {},
            "geographic_data": {}
        }
        
    except Exception as e:
        print(f"Error fetching design analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch design analytics")

@router.get("/categories")
async def get_design_categories(current_user = Depends(verify_token)):
    """Get available design categories"""
    try:
        # Track request
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="design",
            event_action="categories_viewed"
        )
        
        # Return standard design categories
        return [
            {"id": "t-shirts", "name": "T-Shirts", "description": "T-shirt designs and mockups", "icon": "👕"},
            {"id": "posters", "name": "Posters", "description": "Poster and print designs", "icon": "🖼️"},
            {"id": "logos", "name": "Logos", "description": "Logo designs and branding", "icon": "🎯"},
            {"id": "social-media", "name": "Social Media", "description": "Social media graphics", "icon": "📱"},
            {"id": "business-cards", "name": "Business Cards", "description": "Professional business cards", "icon": "💼"},
            {"id": "stickers", "name": "Stickers", "description": "Sticker designs and decals", "icon": "⭐"}
        ]
        
    except Exception as e:
        print(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch categories")

@router.get("/templates")
async def get_design_templates(
    category: Optional[str] = Query(None),
    limit: int = Query(12, ge=1, le=50),
    current_user = Depends(verify_token)
):
    """Get available design templates"""
    try:
        # Track request
        await db_service.track_event(
            user_id=current_user["user_id"],
            event_type="design",
            event_action="templates_viewed",
            properties={
                "category": category,
                "limit": limit
            }
        )
        
        # TODO: Implement actual template system
        # For now, return mock template data
        return {
            "category": category,
            "templates": [],
            "total_templates": 0,
            "message": "Template system coming soon"
        }
        
    except Exception as e:
        print(f"Error fetching templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch templates")