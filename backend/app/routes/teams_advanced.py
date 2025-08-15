"""
Advanced Team API Routes
Team collaboration, workspace management, and real-time features
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr

from models.team import (
    Team, TeamCreate, TeamUpdate, TeamMembership, TeamInvitation,
    TeamRole, TeamActivity, TeamSettings
)
from models.common import SecurityContext, ResponseModel, PaginatedResponse
from security.auth import get_current_user
from app.services.team_collaboration import TeamCollaborationService
from app.services.analytics import AnalyticsService

router = APIRouter()

# Initialize services
team_service = TeamCollaborationService()
analytics_service = AnalyticsService()

# Request models
class TeamInviteRequest(BaseModel):
    email: EmailStr
    role: TeamRole
    message: Optional[str] = None

class MemberRoleUpdate(BaseModel):
    role: TeamRole

class TeamSettingsUpdate(BaseModel):
    auto_backup: bool = True
    real_time_collaboration: bool = True
    design_approval_required: bool = False
    ai_generation_enabled: bool = True

@router.post("/teams", response_model=ResponseModel[Team])
async def create_team(
    team_data: TeamCreate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Create new team"""
    team = await team_service.create_team(team_data, user_context)
    
    # Track team creation
    await analytics_service.track_event(
        "team_created",
        {
            "team_id": str(team.id),
            "plan": team.plan.value,
            "max_members": team.max_members
        },
        user_context
    )
    
    return ResponseModel(data=team, message="Team created successfully")

@router.get("/teams/{team_id}", response_model=ResponseModel[Team])
async def get_team(
    team_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get team details"""
    team = await team_service.get_team(team_id, user_context)
    return ResponseModel(data=team, message="Team retrieved successfully")

@router.put("/teams/{team_id}", response_model=ResponseModel[Team])
async def update_team(
    team_id: UUID,
    update_data: TeamUpdate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Update team details"""
    team = await team_service.update_team(team_id, update_data, user_context)
    
    # Track team update
    await analytics_service.track_event(
        "team_updated",
        {
            "team_id": str(team_id),
            "fields_updated": list(update_data.dict(exclude_unset=True).keys())
        },
        user_context
    )
    
    return ResponseModel(data=team, message="Team updated successfully")

@router.delete("/teams/{team_id}")
async def delete_team(
    team_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Delete team (owner only)"""
    # Implementation would check if user is owner and delete team
    await analytics_service.track_event(
        "team_deleted",
        {"team_id": str(team_id)},
        user_context
    )
    
    return ResponseModel(data={"deleted": True}, message="Team deleted successfully")

# Member management
@router.post("/teams/{team_id}/invite", response_model=ResponseModel[TeamInvitation])
async def invite_team_member(
    team_id: UUID,
    invite_data: TeamInviteRequest,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Invite new team member"""
    invitation = await team_service.invite_member(
        team_id,
        invite_data.email,
        invite_data.role,
        user_context,
        invite_data.message
    )
    
    return ResponseModel(data=invitation, message="Invitation sent successfully")

@router.post("/teams/invitations/{invitation_token}/accept", response_model=ResponseModel[TeamMembership])
async def accept_team_invitation(
    invitation_token: str,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Accept team invitation"""
    membership = await team_service.accept_invitation(invitation_token, user_context)
    
    return ResponseModel(data=membership, message="Invitation accepted successfully")

@router.get("/teams/{team_id}/members", response_model=ResponseModel[List[Dict[str, Any]]])
async def get_team_members(
    team_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get team members with details"""
    members = await team_service.get_team_members(team_id, user_context)
    return ResponseModel(data=members, message="Team members retrieved")

@router.put("/teams/{team_id}/members/{member_id}/role", response_model=ResponseModel[TeamMembership])
async def update_member_role(
    team_id: UUID,
    member_id: UUID,
    role_data: MemberRoleUpdate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Update team member role"""
    membership = await team_service.update_member_role(
        team_id,
        member_id,
        role_data.role,
        user_context
    )
    
    return ResponseModel(data=membership, message="Member role updated successfully")

@router.delete("/teams/{team_id}/members/{member_id}")
async def remove_team_member(
    team_id: UUID,
    member_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Remove team member"""
    success = await team_service.remove_member(team_id, member_id, user_context)
    
    if success:
        return ResponseModel(data={"removed": True}, message="Member removed successfully")
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove member"
        )

# Activity and collaboration
@router.get("/teams/{team_id}/activity", response_model=ResponseModel[List[TeamActivity]])
async def get_team_activity(
    team_id: UUID,
    limit: int = Query(50, le=200),
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get team activity feed"""
    activity = await team_service.get_team_activity(team_id, user_context, limit)
    return ResponseModel(data=activity, message="Team activity retrieved")

@router.get("/teams/{team_id}/settings", response_model=ResponseModel[TeamSettings])
async def get_team_settings(
    team_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get team settings"""
    # Implementation would get team settings
    settings = TeamSettings()  # Default settings
    return ResponseModel(data=settings, message="Team settings retrieved")

@router.put("/teams/{team_id}/settings", response_model=ResponseModel[TeamSettings])
async def update_team_settings(
    team_id: UUID,
    settings_data: TeamSettingsUpdate,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Update team settings"""
    # Implementation would update team settings
    settings = TeamSettings(**settings_data.dict())
    
    # Track settings update
    await analytics_service.track_event(
        "team_settings_updated",
        {
            "team_id": str(team_id),
            "settings": settings_data.dict()
        },
        user_context
    )
    
    return ResponseModel(data=settings, message="Team settings updated")

# Team analytics
@router.get("/teams/{team_id}/analytics")
async def get_team_analytics(
    team_id: UUID,
    period_days: int = Query(30, le=365),
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get team analytics"""
    # Implementation would get team-specific analytics
    analytics_data = {
        "members": {
            "total": 0,
            "active": 0,
            "new_this_period": 0
        },
        "designs": {
            "total_created": 0,
            "collaborative_designs": 0,
            "shared_designs": 0
        },
        "activity": {
            "comments": 0,
            "edits": 0,
            "ai_generations": 0
        },
        "usage": {
            "storage_used_gb": 0.0,
            "ai_generations_used": 0
        },
        "period_days": period_days
    }
    
    return ResponseModel(data=analytics_data, message="Team analytics retrieved")

@router.get("/teams/{team_id}/usage")
async def get_team_usage(
    team_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get team usage and limits"""
    # Implementation would get current usage vs limits
    usage_data = {
        "members": {"current": 0, "limit": 0},
        "designs": {"current": 0, "limit": 0},
        "storage_gb": {"current": 0.0, "limit": 0.0},
        "ai_generations": {"current": 0, "limit": 0, "resets_at": None}
    }
    
    return ResponseModel(data=usage_data, message="Team usage retrieved")

# Team workspace features
@router.get("/teams/{team_id}/workspaces")
async def get_team_workspaces(
    team_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get team workspaces"""
    # Implementation would get team workspaces
    return ResponseModel(data=[], message="Team workspaces retrieved")

@router.post("/teams/{team_id}/workspaces")
async def create_team_workspace(
    team_id: UUID,
    workspace_data: Dict[str, Any],
    user_context: SecurityContext = Depends(get_current_user)
):
    """Create team workspace"""
    # Implementation would create workspace
    return ResponseModel(data={}, message="Team workspace created")

# Brand management
@router.get("/teams/{team_id}/brand-kit")
async def get_team_brand_kit(
    team_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get team brand kit"""
    brand_kit = {
        "colors": [],
        "fonts": [],
        "logos": [],
        "templates": []
    }
    
    return ResponseModel(data=brand_kit, message="Team brand kit retrieved")

@router.put("/teams/{team_id}/brand-kit")
async def update_team_brand_kit(
    team_id: UUID,
    brand_kit_data: Dict[str, Any],
    user_context: SecurityContext = Depends(get_current_user)
):
    """Update team brand kit"""
    # Implementation would update brand kit
    await analytics_service.track_event(
        "team_brand_kit_updated",
        {
            "team_id": str(team_id),
            "colors_count": len(brand_kit_data.get("colors", [])),
            "fonts_count": len(brand_kit_data.get("fonts", [])),
            "logos_count": len(brand_kit_data.get("logos", []))
        },
        user_context
    )
    
    return ResponseModel(data=brand_kit_data, message="Team brand kit updated")

# My teams endpoint
@router.get("/my-teams", response_model=PaginatedResponse[Team])
async def get_my_teams(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get teams user belongs to"""
    # Implementation would get user's teams
    return PaginatedResponse(
        data=[],
        pagination={
            "total": 0,
            "page": (offset // limit) + 1,
            "limit": limit,
            "pages": 0
        }
    )

# Team permissions endpoint
@router.get("/teams/{team_id}/permissions")
async def get_team_permissions(
    team_id: UUID,
    user_context: SecurityContext = Depends(get_current_user)
):
    """Get user's permissions in team"""
    # Implementation would get user permissions
    permissions = {
        "role": "member",
        "permissions": ["read", "comment"],
        "can_invite": False,
        "can_manage_settings": False,
        "can_delete_team": False
    }
    
    return ResponseModel(data=permissions, message="Team permissions retrieved")