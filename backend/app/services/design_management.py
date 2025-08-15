"""
Design Management Service
Advanced design versioning, history tracking, and cloud storage integration
"""

from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import json
import hashlib
import asyncio
import os
from pathlib import Path

from fastapi import HTTPException, status
from supabase import create_client, Client
from models.design import (
    Design, DesignCreate, DesignUpdate, DesignVersion, 
    DesignTemplate, DesignShare, DesignCollaboration, DesignCanvas
)
from models.common import PaginatedResponse, SecurityContext
from .caching import CachingService

class DesignManagementService:
    """Enterprise design management with versioning and collaboration"""
    
    def __init__(self):
        self.supabase: Client = create_client(
            url=os.getenv("SUPABASE_URL"),
            key=os.getenv("SUPABASE_SERVICE_KEY")
        )
        self.cache = CachingService()
        self.storage_bucket = "designs"
        self.max_versions = 50  # Maximum versions per design
        self.auto_save_interval = 30  # seconds
        
    async def create_design(
        self, 
        design_data: DesignCreate, 
        user_context: SecurityContext
    ) -> Design:
        """Create a new design with initial version"""
        try:
            design_id = uuid4()
            now = datetime.utcnow()
            
            # Create design record
            design = Design(
                id=design_id,
                title=design_data.title,
                description=design_data.description,
                owner_id=user_context.user_id,
                team_id=design_data.team_id,
                type=design_data.type,
                visibility=design_data.visibility,
                category_id=design_data.category_id,
                tags=design_data.tags,
                canvas=design_data.canvas or DesignCanvas(),
                created_at=now,
                updated_at=now
            )
            
            # Insert into database
            result = self.supabase.table("designs").insert(design.dict()).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create design"
                )
            
            # Create initial version
            await self.create_version(design_id, design, user_context.user_id)
            
            # Upload initial design data to cloud storage
            await self._upload_design_data(design_id, design.dict())
            
            # Update cache
            await self.cache.set(f"design:{design_id}", design.dict(), ttl=3600)
            
            return design
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create design: {str(e)}"
            )
    
    async def get_design(
        self, 
        design_id: UUID, 
        user_context: SecurityContext,
        include_versions: bool = False
    ) -> Design:
        """Get design by ID with access control"""
        # Check cache first
        cached = await self.cache.get(f"design:{design_id}")
        if cached:
            design = Design(**cached)
        else:
            # Fetch from database
            result = self.supabase.table("designs")\
                .select("*")\
                .eq("id", str(design_id))\
                .eq("is_deleted", False)\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Design not found"
                )
            
            design = Design(**result.data[0])
            await self.cache.set(f"design:{design_id}", design.dict(), ttl=3600)
        
        # Access control
        if not await self._check_design_access(design, user_context, "read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to access design"
            )
        
        if include_versions:
            design.versions = await self.get_design_versions(design_id, user_context)
        
        return design
    
    async def update_design(
        self, 
        design_id: UUID, 
        update_data: DesignUpdate,
        user_context: SecurityContext,
        create_version: bool = True
    ) -> Design:
        """Update design and optionally create new version"""
        # Get existing design
        design = await self.get_design(design_id, user_context)
        
        # Check write permissions
        if not await self._check_design_access(design, user_context, "write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update design"
            )
        
        # Apply updates
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(design, field):
                setattr(design, field, value)
        
        design.updated_at = datetime.utcnow()
        
        # Update database
        result = self.supabase.table("designs")\
            .update(design.dict())\
            .eq("id", str(design_id))\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update design"
            )
        
        # Create version if significant changes
        if create_version and self._is_significant_change(update_data):
            await self.create_version(design_id, design, user_context.user_id)
        
        # Update cloud storage
        await self._upload_design_data(design_id, design.dict())
        
        # Update cache
        await self.cache.set(f"design:{design_id}", design.dict(), ttl=3600)
        await self.cache.delete(f"user_designs:{design.owner_id}")
        
        return design
    
    async def create_version(
        self, 
        design_id: UUID, 
        design: Design,
        user_id: UUID,
        title: Optional[str] = None
    ) -> DesignVersion:
        """Create a new version of the design"""
        try:
            # Get current version count
            result = self.supabase.table("design_versions")\
                .select("version_number")\
                .eq("design_id", str(design_id))\
                .order("version_number", desc=True)\
                .limit(1)\
                .execute()
            
            next_version = 1
            if result.data:
                next_version = result.data[0]["version_number"] + 1
            
            # Create version
            version = DesignVersion(
                id=uuid4(),
                design_id=design_id,
                version_number=next_version,
                title=title or f"Version {next_version}",
                canvas=design.canvas,
                elements=design.elements,
                metadata=design.metadata,
                created_by=user_id,
                created_at=datetime.utcnow()
            )
            
            # Generate preview
            preview_url = await self._generate_version_preview(design, version.id)
            version.preview_url = preview_url
            
            # Insert version
            result = self.supabase.table("design_versions")\
                .insert(version.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create design version"
                )
            
            # Update design's current version
            self.supabase.table("designs")\
                .update({"current_version": next_version})\
                .eq("id", str(design_id))\
                .execute()
            
            # Clean up old versions if limit exceeded
            await self._cleanup_old_versions(design_id)
            
            return version
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create version: {str(e)}"
            )
    
    async def get_design_versions(
        self, 
        design_id: UUID, 
        user_context: SecurityContext,
        limit: int = 20
    ) -> List[DesignVersion]:
        """Get version history for a design"""
        # Check access
        design = await self.get_design(design_id, user_context)
        
        result = self.supabase.table("design_versions")\
            .select("*")\
            .eq("design_id", str(design_id))\
            .order("version_number", desc=True)\
            .limit(limit)\
            .execute()
        
        versions = [DesignVersion(**v) for v in result.data]
        return versions
    
    async def restore_version(
        self, 
        design_id: UUID, 
        version_number: int,
        user_context: SecurityContext
    ) -> Design:
        """Restore design to a specific version"""
        # Get design and check permissions
        design = await self.get_design(design_id, user_context)
        
        if not await self._check_design_access(design, user_context, "write"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to restore version"
            )
        
        # Get version data
        result = self.supabase.table("design_versions")\
            .select("*")\
            .eq("design_id", str(design_id))\
            .eq("version_number", version_number)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Version not found"
            )
        
        version = DesignVersion(**result.data[0])
        
        # Create backup of current state
        await self.create_version(
            design_id, 
            design, 
            user_context.user_id,
            f"Backup before restore to v{version_number}"
        )
        
        # Restore version data
        update_data = DesignUpdate(
            canvas=version.canvas,
            elements=version.elements,
            metadata=version.metadata
        )
        
        return await self.update_design(design_id, update_data, user_context)
    
    async def share_design(
        self, 
        design_id: UUID,
        share_type: str,
        permissions: List[str],
        user_context: SecurityContext,
        shared_with_email: Optional[str] = None,
        expires_hours: Optional[int] = None
    ) -> DesignShare:
        """Share design with specific permissions"""
        design = await self.get_design(design_id, user_context)
        
        if not await self._check_design_access(design, user_context, "share"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to share design"
            )
        
        expires_at = None
        if expires_hours:
            expires_at = datetime.utcnow() + timedelta(hours=expires_hours)
        
        share = DesignShare(
            id=uuid4(),
            design_id=design_id,
            shared_by=user_context.user_id,
            share_type=share_type,
            permissions=permissions,
            expires_at=expires_at,
            created_at=datetime.utcnow()
        )
        
        # If sharing with specific user
        if shared_with_email:
            # Look up user by email
            user_result = self.supabase.table("users")\
                .select("id")\
                .eq("email", shared_with_email)\
                .execute()
            
            if user_result.data:
                share.shared_with = UUID(user_result.data[0]["id"])
        
        # Generate secure share token
        share_token = self._generate_share_token(design_id, user_context.user_id)
        
        # Insert share record
        result = self.supabase.table("design_shares")\
            .insert(share.dict())\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create design share"
            )
        
        return share
    
    async def duplicate_design(
        self, 
        design_id: UUID,
        user_context: SecurityContext,
        new_title: Optional[str] = None
    ) -> Design:
        """Create a copy of an existing design"""
        # Get original design
        original = await self.get_design(design_id, user_context)
        
        if not await self._check_design_access(original, user_context, "read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to duplicate design"
            )
        
        # Create duplicate
        duplicate_data = DesignCreate(
            title=new_title or f"Copy of {original.title}",
            description=original.description,
            type=original.type,
            visibility=original.visibility,
            tags=original.tags,
            canvas=original.canvas,
            team_id=original.team_id
        )
        
        duplicate = await self.create_design(duplicate_data, user_context)
        
        # Copy elements
        duplicate.elements = original.elements
        await self.update_design(duplicate.id, DesignUpdate(elements=original.elements), user_context)
        
        return duplicate
    
    async def _check_design_access(
        self, 
        design: Design, 
        user_context: SecurityContext, 
        action: str
    ) -> bool:
        """Check if user has permission to perform action on design"""
        # Owner has all permissions
        if design.owner_id == user_context.user_id:
            return True
        
        # Admin has all permissions
        if user_context.role == "admin":
            return True
        
        # Check team permissions
        if design.team_id and user_context.team_id == design.team_id:
            # Check specific team permissions
            team_perms = await self._get_team_permissions(user_context.user_id, design.team_id)
            return f"design_{action}" in team_perms
        
        # Check collaboration permissions
        if action == "read" and design.visibility == "public":
            return True
        
        collab = await self._get_design_collaboration(design.id, user_context.user_id)
        if collab:
            return self._check_collaboration_permission(collab, action)
        
        return False
    
    def _is_significant_change(self, update_data: DesignUpdate) -> bool:
        """Determine if changes warrant a new version"""
        significant_fields = ["canvas", "elements", "title"]
        return any(getattr(update_data, field) is not None for field in significant_fields)
    
    async def _upload_design_data(self, design_id: UUID, data: Dict[str, Any]) -> str:
        """Upload design data to cloud storage"""
        try:
            file_path = f"designs/{design_id}/data.json"
            json_data = json.dumps(data, default=str)
            
            result = self.supabase.storage\
                .from_(self.storage_bucket)\
                .upload(file_path, json_data.encode())
            
            if result.get("error"):
                raise Exception(result["error"]["message"])
            
            return file_path
            
        except Exception as e:
            # Log error but don't fail the operation
            print(f"Failed to upload design data: {e}")
            return ""
    
    async def _generate_version_preview(self, design: Design, version_id: UUID) -> str:
        """Generate preview image for design version"""
        # This would integrate with a canvas rendering service
        # For now, return a placeholder
        return f"https://api.flowbotz.com/previews/{version_id}"
    
    async def _cleanup_old_versions(self, design_id: UUID):
        """Remove old versions beyond the limit"""
        result = self.supabase.table("design_versions")\
            .select("id")\
            .eq("design_id", str(design_id))\
            .order("version_number", desc=True)\
            .offset(self.max_versions)\
            .execute()
        
        if result.data:
            old_version_ids = [v["id"] for v in result.data]
            self.supabase.table("design_versions")\
                .delete()\
                .in_("id", old_version_ids)\
                .execute()
    
    def _generate_share_token(self, design_id: UUID, user_id: UUID) -> str:
        """Generate secure token for design sharing"""
        data = f"{design_id}:{user_id}:{datetime.utcnow().isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    async def _get_team_permissions(self, user_id: UUID, team_id: UUID) -> List[str]:
        """Get user's permissions in a team"""
        result = self.supabase.table("team_memberships")\
            .select("permissions")\
            .eq("user_id", str(user_id))\
            .eq("team_id", str(team_id))\
            .eq("is_active", True)\
            .execute()
        
        if result.data:
            return result.data[0].get("permissions", [])
        return []
    
    async def _get_design_collaboration(self, design_id: UUID, user_id: UUID) -> Optional[DesignCollaboration]:
        """Get user's collaboration record for design"""
        result = self.supabase.table("design_collaborations")\
            .select("*")\
            .eq("design_id", str(design_id))\
            .eq("user_id", str(user_id))\
            .eq("is_active", True)\
            .execute()
        
        if result.data:
            return DesignCollaboration(**result.data[0])
        return None
    
    def _check_collaboration_permission(self, collaboration: DesignCollaboration, action: str) -> bool:
        """Check if collaboration allows specific action"""
        role_permissions = {
            "viewer": ["read"],
            "commenter": ["read", "comment"],
            "editor": ["read", "comment", "write"],
            "admin": ["read", "comment", "write", "share", "delete"]
        }
        
        allowed_actions = role_permissions.get(collaboration.role, [])
        return action in allowed_actions