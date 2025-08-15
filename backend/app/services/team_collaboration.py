"""
Team Collaboration Service
Advanced team workspace management with RBAC and real-time collaboration
"""

from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import json
import asyncio
import os

from fastapi import HTTPException, status
from supabase import create_client, Client
from models.team import (
    Team, TeamCreate, TeamUpdate, TeamMembership, TeamInvitation,
    TeamRole, InvitationStatus, TeamSettings, TeamActivity
)
from models.common import SecurityContext, Money
from .caching import CachingService
from .webhook import WebhookService

class TeamCollaborationService:
    """Enterprise team collaboration with real-time features"""
    
    def __init__(self):
        self.supabase: Client = create_client(
            url=os.getenv("SUPABASE_URL"),
            key=os.getenv("SUPABASE_SERVICE_KEY")
        )
        self.cache = CachingService()
        self.webhook_service = WebhookService()
        
        # Real-time connections
        self.active_sessions = {}  # user_id -> {team_id, socket_info}
        self.team_rooms = {}       # team_id -> {users, activity}
        
        # Permission hierarchy
        self.role_hierarchy = {
            TeamRole.GUEST: 1,
            TeamRole.VIEWER: 2,
            TeamRole.EDITOR: 3,
            TeamRole.MANAGER: 4,
            TeamRole.ADMIN: 5,
            TeamRole.OWNER: 6
        }
        
        # Default permissions by role
        self.default_permissions = {
            TeamRole.GUEST: ["read"],
            TeamRole.VIEWER: ["read", "comment"],
            TeamRole.EDITOR: ["read", "comment", "write", "share"],
            TeamRole.MANAGER: ["read", "comment", "write", "share", "manage_members"],
            TeamRole.ADMIN: ["read", "comment", "write", "share", "manage_members", "manage_settings"],
            TeamRole.OWNER: ["all"]
        }
    
    async def create_team(
        self,
        team_data: TeamCreate,
        user_context: SecurityContext
    ) -> Team:
        """Create new team with owner membership"""
        try:
            team = Team(
                id=uuid4(),
                name=team_data.name,
                description=team_data.description,
                owner_id=user_context.user_id,
                plan=team_data.plan,
                slug=self._generate_slug(team_data.name),
                created_at=datetime.utcnow()
            )
            
            # Set plan limits
            self._set_plan_limits(team, team_data.plan)
            
            # Store team in database
            result = self.supabase.table("teams")\
                .insert(team.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create team"
                )
            
            # Create owner membership
            owner_membership = TeamMembership(
                id=uuid4(),
                team_id=team.id,
                user_id=user_context.user_id,
                role=TeamRole.OWNER,
                invited_by=user_context.user_id,
                joined_at=datetime.utcnow(),
                permissions=["all"],
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            self.supabase.table("team_memberships")\
                .insert(owner_membership.dict())\
                .execute()
            
            # Cache team data
            await self.cache.set(f"team:{team.id}", team.dict(), ttl=3600)
            await self.cache.set(f"team_slug:{team.slug}", team.id, ttl=3600)
            
            # Log activity
            await self._log_activity(
                team.id,
                user_context.user_id,
                "team_created",
                f"Created team '{team.name}'"
            )
            
            return team
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create team: {str(e)}"
            )
    
    async def get_team(
        self,
        team_id: UUID,
        user_context: SecurityContext
    ) -> Team:
        """Get team with access control"""
        try:
            # Check cache first
            cached = await self.cache.get(f"team:{team_id}")
            if cached:
                team = Team(**cached)
            else:
                # Query database
                result = self.supabase.table("teams")\
                    .select("*")\
                    .eq("id", str(team_id))\
                    .eq("is_deleted", False)\
                    .execute()
                
                if not result.data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Team not found"
                    )
                
                team = Team(**result.data[0])
                await self.cache.set(f"team:{team_id}", team.dict(), ttl=3600)
            
            # Check team access
            membership = await self._get_user_membership(team_id, user_context.user_id)
            if not membership and team.owner_id != user_context.user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
            
            return team
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get team: {str(e)}"
            )
    
    async def update_team(
        self,
        team_id: UUID,
        update_data: TeamUpdate,
        user_context: SecurityContext
    ) -> Team:
        """Update team with permission check"""
        try:
            team = await self.get_team(team_id, user_context)
            
            # Check permissions
            if not await self._check_team_permission(team_id, user_context.user_id, "manage_settings"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to update team"
                )
            
            # Apply updates
            update_dict = update_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                if hasattr(team, field):
                    setattr(team, field, value)
            
            team.updated_at = datetime.utcnow()
            
            # Update database
            result = self.supabase.table("teams")\
                .update(team.dict())\
                .eq("id", str(team_id))\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update team"
                )
            
            # Update cache
            await self.cache.set(f"team:{team_id}", team.dict(), ttl=3600)
            
            # Log activity
            await self._log_activity(
                team_id,
                user_context.user_id,
                "team_updated",
                f"Updated team settings"
            )
            
            return team
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update team: {str(e)}"
            )
    
    async def invite_member(
        self,
        team_id: UUID,
        email: str,
        role: TeamRole,
        user_context: SecurityContext,
        custom_message: Optional[str] = None
    ) -> TeamInvitation:
        """Invite new team member"""
        try:
            team = await self.get_team(team_id, user_context)
            
            # Check permissions
            if not await self._check_team_permission(team_id, user_context.user_id, "manage_members"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to invite members"
                )
            
            # Check team limits
            current_members = await self._get_team_member_count(team_id)
            if current_members >= team.max_members:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Team member limit reached"
                )
            
            # Check if user already exists
            existing_membership = await self._get_membership_by_email(team_id, email)
            if existing_membership:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User already a team member"
                )
            
            # Check for existing invitation
            existing_invitation = await self._get_pending_invitation(team_id, email)
            if existing_invitation:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Invitation already sent"
                )
            
            # Create invitation
            invitation = TeamInvitation(
                id=uuid4(),
                team_id=team_id,
                invited_by=user_context.user_id,
                email=email.lower(),
                role=role,
                message=custom_message,
                permissions=self.default_permissions.get(role, []),
                expires_at=datetime.utcnow() + timedelta(days=7),
                token=self._generate_invitation_token(),
                created_at=datetime.utcnow()
            )
            
            # Store invitation
            result = self.supabase.table("team_invitations")\
                .insert(invitation.dict())\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create invitation"
                )
            
            # Send invitation email (mock)
            await self._send_invitation_email(invitation, team)
            
            # Log activity
            await self._log_activity(
                team_id,
                user_context.user_id,
                "member_invited",
                f"Invited {email} as {role.value}"
            )
            
            return invitation
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to invite member: {str(e)}"
            )
    
    async def accept_invitation(
        self,
        invitation_token: str,
        user_context: SecurityContext
    ) -> TeamMembership:
        """Accept team invitation"""
        try:
            # Get invitation
            result = self.supabase.table("team_invitations")\
                .select("*")\
                .eq("token", invitation_token)\
                .eq("status", InvitationStatus.PENDING)\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invitation not found or expired"
                )
            
            invitation = TeamInvitation(**result.data[0])
            
            # Check expiration
            if datetime.utcnow() > invitation.expires_at:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invitation has expired"
                )
            
            # Get user email to verify match
            user_result = self.supabase.table("users")\
                .select("email")\
                .eq("id", str(user_context.user_id))\
                .execute()
            
            if not user_result.data or user_result.data[0]["email"] != invitation.email:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Email mismatch"
                )
            
            # Create membership
            membership = TeamMembership(
                id=uuid4(),
                team_id=invitation.team_id,
                user_id=user_context.user_id,
                role=invitation.role,
                permissions=invitation.permissions,
                invited_by=invitation.invited_by,
                joined_at=datetime.utcnow(),
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            # Store membership
            member_result = self.supabase.table("team_memberships")\
                .insert(membership.dict())\
                .execute()
            
            if not member_result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create membership"
                )
            
            # Update invitation status
            self.supabase.table("team_invitations")\
                .update({
                    "status": InvitationStatus.ACCEPTED,
                    "responded_at": datetime.utcnow().isoformat()
                })\
                .eq("id", str(invitation.id))\
                .execute()
            
            # Update team member count
            self.supabase.table("teams")\
                .update({"current_members": "current_members + 1"})\
                .eq("id", str(invitation.team_id))\
                .execute()
            
            # Invalidate caches
            await self.cache.delete(f"team:{invitation.team_id}")
            await self.cache.delete_pattern(f"membership:{invitation.team_id}:*")
            
            # Log activity
            await self._log_activity(
                invitation.team_id,
                user_context.user_id,
                "member_joined",
                f"Joined team as {invitation.role.value}"
            )
            
            return membership
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to accept invitation: {str(e)}"
            )
    
    async def update_member_role(
        self,
        team_id: UUID,
        member_user_id: UUID,
        new_role: TeamRole,
        user_context: SecurityContext
    ) -> TeamMembership:
        """Update team member role"""
        try:
            # Check permissions
            if not await self._check_team_permission(team_id, user_context.user_id, "manage_members"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to manage members"
                )
            
            # Get current membership
            membership = await self._get_user_membership(team_id, member_user_id)
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Member not found"
                )
            
            # Prevent self-demotion from owner
            if (membership.user_id == user_context.user_id and 
                membership.role == TeamRole.OWNER and 
                new_role != TeamRole.OWNER):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot change own owner role"
                )
            
            # Update membership
            old_role = membership.role
            membership.role = new_role
            membership.permissions = self.default_permissions.get(new_role, [])
            membership.updated_at = datetime.utcnow()
            
            # Store update
            result = self.supabase.table("team_memberships")\
                .update(membership.dict())\
                .eq("id", str(membership.id))\
                .execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update member role"
                )
            
            # Update cache
            await self.cache.delete(f"membership:{team_id}:{member_user_id}")
            
            # Log activity
            await self._log_activity(
                team_id,
                user_context.user_id,
                "member_role_updated",
                f"Changed member role from {old_role.value} to {new_role.value}"
            )
            
            return membership
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update member role: {str(e)}"
            )
    
    async def remove_member(
        self,
        team_id: UUID,
        member_user_id: UUID,
        user_context: SecurityContext
    ) -> bool:
        """Remove team member"""
        try:
            # Check permissions
            if not await self._check_team_permission(team_id, user_context.user_id, "manage_members"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions to remove members"
                )
            
            # Get membership
            membership = await self._get_user_membership(team_id, member_user_id)
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Member not found"
                )
            
            # Prevent owner removal
            if membership.role == TeamRole.OWNER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove team owner"
                )
            
            # Remove membership
            result = self.supabase.table("team_memberships")\
                .delete()\
                .eq("id", str(membership.id))\
                .execute()
            
            # Update team member count
            self.supabase.table("teams")\
                .update({"current_members": "current_members - 1"})\
                .eq("id", str(team_id))\
                .execute()
            
            # Clear caches
            await self.cache.delete(f"membership:{team_id}:{member_user_id}")
            await self.cache.delete(f"team:{team_id}")
            
            # Log activity
            await self._log_activity(
                team_id,
                user_context.user_id,
                "member_removed",
                f"Removed member from team"
            )
            
            return True
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            return False
    
    async def get_team_members(
        self,
        team_id: UUID,
        user_context: SecurityContext
    ) -> List[Dict[str, Any]]:
        """Get team members with details"""
        try:
            # Check access
            await self.get_team(team_id, user_context)
            
            # Get memberships with user details
            result = self.supabase.table("team_memberships")\
                .select("*, users(*)")\
                .eq("team_id", str(team_id))\
                .eq("is_active", True)\
                .execute()
            
            members = []
            for data in result.data:
                membership = TeamMembership(**{k: v for k, v in data.items() if k != "users"})
                user_data = data.get("users", {})
                
                members.append({
                    "membership": membership.dict(),
                    "user": user_data,
                    "last_activity": await self._get_member_last_activity(team_id, membership.user_id)
                })
            
            return members
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            return []
    
    async def get_team_activity(
        self,
        team_id: UUID,
        user_context: SecurityContext,
        limit: int = 50
    ) -> List[TeamActivity]:
        """Get team activity feed"""
        try:
            # Check access
            await self.get_team(team_id, user_context)
            
            result = self.supabase.table("team_activities")\
                .select("*")\
                .eq("team_id", str(team_id))\
                .eq("is_public", True)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return [TeamActivity(**a) for a in result.data]
            
        except Exception as e:
            print(f"Get team activity error: {e}")
            return []
    
    def _generate_slug(self, name: str) -> str:
        """Generate team slug from name"""
        import re
        slug = name.lower().replace(' ', '-').replace('_', '-')
        slug = re.sub(r'[^a-z0-9-]', '', slug)
        return slug[:50]  # Limit length
    
    def _set_plan_limits(self, team: Team, plan: str):
        """Set team limits based on plan"""
        limits = {
            "free": {"members": 3, "designs": 10, "storage": 1.0, "ai_generations": 20},
            "starter": {"members": 10, "designs": 100, "storage": 10.0, "ai_generations": 200},
            "professional": {"members": 50, "designs": 1000, "storage": 100.0, "ai_generations": 2000},
            "enterprise": {"members": 500, "designs": 10000, "storage": 1000.0, "ai_generations": 20000}
        }
        
        plan_limits = limits.get(plan, limits["free"])
        team.max_members = plan_limits["members"]
        team.max_designs = plan_limits["designs"]
        team.max_storage_gb = plan_limits["storage"]
        team.max_ai_generations = plan_limits["ai_generations"]
    
    def _generate_invitation_token(self) -> str:
        """Generate secure invitation token"""
        import secrets
        return secrets.token_urlsafe(32)
    
    async def _get_user_membership(
        self, 
        team_id: UUID, 
        user_id: UUID
    ) -> Optional[TeamMembership]:
        """Get user's team membership"""
        try:
            # Check cache first
            cached = await self.cache.get(f"membership:{team_id}:{user_id}")
            if cached:
                return TeamMembership(**cached)
            
            # Query database
            result = self.supabase.table("team_memberships")\
                .select("*")\
                .eq("team_id", str(team_id))\
                .eq("user_id", str(user_id))\
                .eq("is_active", True)\
                .execute()
            
            if result.data:
                membership = TeamMembership(**result.data[0])
                # Cache for 30 minutes
                await self.cache.set(
                    f"membership:{team_id}:{user_id}",
                    membership.dict(),
                    ttl=1800
                )
                return membership
            
            return None
            
        except Exception:
            return None
    
    async def _check_team_permission(
        self, 
        team_id: UUID, 
        user_id: UUID, 
        permission: str
    ) -> bool:
        """Check if user has specific permission in team"""
        membership = await self._get_user_membership(team_id, user_id)
        if not membership:
            return False
        
        # Owner has all permissions
        if membership.role == TeamRole.OWNER:
            return True
        
        # Check specific permissions
        if "all" in membership.permissions:
            return True
        
        return permission in membership.permissions
    
    async def _get_team_member_count(self, team_id: UUID) -> int:
        """Get current team member count"""
        try:
            result = self.supabase.table("team_memberships")\
                .select("id", count="exact")\
                .eq("team_id", str(team_id))\
                .eq("is_active", True)\
                .execute()
            
            return result.count or 0
            
        except Exception:
            return 0
    
    async def _get_membership_by_email(
        self, 
        team_id: UUID, 
        email: str
    ) -> Optional[TeamMembership]:
        """Check if user with email is already a team member"""
        try:
            # Get user by email first
            user_result = self.supabase.table("users")\
                .select("id")\
                .eq("email", email.lower())\
                .execute()
            
            if not user_result.data:
                return None
            
            user_id = UUID(user_result.data[0]["id"])
            return await self._get_user_membership(team_id, user_id)
            
        except Exception:
            return None
    
    async def _get_pending_invitation(
        self, 
        team_id: UUID, 
        email: str
    ) -> Optional[TeamInvitation]:
        """Get pending invitation for email"""
        try:
            result = self.supabase.table("team_invitations")\
                .select("*")\
                .eq("team_id", str(team_id))\
                .eq("email", email.lower())\
                .eq("status", InvitationStatus.PENDING)\
                .execute()
            
            if result.data:
                return TeamInvitation(**result.data[0])
            
            return None
            
        except Exception:
            return None
    
    async def _send_invitation_email(self, invitation: TeamInvitation, team: Team):
        """Send invitation email (mock implementation)"""
        # In production, this would send actual email
        print(f"Sending invitation email to {invitation.email} for team {team.name}")
    
    async def _log_activity(
        self, 
        team_id: UUID, 
        user_id: UUID, 
        activity_type: str, 
        description: str
    ):
        """Log team activity"""
        try:
            activity = TeamActivity(
                id=uuid4(),
                team_id=team_id,
                user_id=user_id,
                activity_type=activity_type,
                title=description,
                is_public=True,
                created_at=datetime.utcnow()
            )
            
            self.supabase.table("team_activities")\
                .insert(activity.dict())\
                .execute()
            
        except Exception as e:
            print(f"Activity logging error: {e}")
    
    async def _get_member_last_activity(
        self, 
        team_id: UUID, 
        user_id: UUID
    ) -> Optional[datetime]:
        """Get member's last activity in team"""
        try:
            result = self.supabase.table("team_activities")\
                .select("created_at")\
                .eq("team_id", str(team_id))\
                .eq("user_id", str(user_id))\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if result.data:
                return datetime.fromisoformat(result.data[0]["created_at"])
            
            return None
            
        except Exception:
            return None