"""
Enhanced authentication and authorization for FlowBotz API
Implements secure JWT handling with refresh tokens and proper validation
"""
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any, List
import jwt
import bcrypt
from datetime import datetime, timedelta
import secrets
import hashlib
import hmac
import os
import re
from enum import Enum


class UserRole(str, Enum):
    """User roles for authorization"""
    ADMIN = "admin"
    PREMIUM = "premium"
    USER = "user"
    GUEST = "guest"


class TokenType(str, Enum):
    """JWT token types"""
    ACCESS = "access"
    REFRESH = "refresh"


class UserLogin(BaseModel):
    """User login request model with validation"""
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserRegister(BaseModel):
    """User registration request model with validation"""
    email: EmailStr
    password: str
    confirm_password: str
    full_name: Optional[str] = None
    terms_accepted: bool
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('terms_accepted')
    def terms_must_be_accepted(cls, v):
        if not v:
            raise ValueError('Terms and conditions must be accepted')
        return v
    
    @validator('full_name')
    def validate_full_name(cls, v):
        if v and len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters')
        return v.strip() if v else None


class TokenResponse(BaseModel):
    """Token response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


class RefreshTokenRequest(BaseModel):
    """Refresh token request model"""
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    """Password change request model"""
    current_password: str
    new_password: str
    confirm_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class AuthConfig:
    """Authentication configuration"""
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY")
        self.refresh_secret_key = os.getenv("JWT_REFRESH_SECRET_KEY")
        
        if not self.secret_key:
            raise ValueError("JWT_SECRET_KEY environment variable is required")
        
        if not self.refresh_secret_key:
            # Generate a different secret for refresh tokens
            self.refresh_secret_key = hashlib.sha256(
                (self.secret_key + "refresh").encode()
            ).hexdigest()
        
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 15  # Short-lived access tokens
        self.refresh_token_expire_days = 30    # Longer-lived refresh tokens
        self.password_reset_expire_hours = 1   # Password reset tokens
        
        # Rate limiting
        self.max_login_attempts = 5
        self.lockout_duration_minutes = 30


class SecurityAuth:
    """Enhanced authentication class with security best practices"""
    
    def __init__(self):
        self.config = AuthConfig()
        self.security = HTTPBearer(auto_error=False)
        
        # In-memory stores (should be replaced with Redis in production)
        self.failed_attempts = {}  # Track failed login attempts
        self.blacklisted_tokens = set()  # Blacklisted JWTs
        self.refresh_tokens = {}  # Active refresh tokens
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception:
            return False
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.config.access_token_expire_minutes)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": TokenType.ACCESS,
            "jti": self.generate_secure_token(16)  # Unique token ID
        })
        
        encoded_jwt = jwt.encode(to_encode, self.config.secret_key, algorithm=self.config.algorithm)
        return encoded_jwt
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        to_encode = {
            "sub": user_id,
            "exp": datetime.utcnow() + timedelta(days=self.config.refresh_token_expire_days),
            "iat": datetime.utcnow(),
            "type": TokenType.REFRESH,
            "jti": self.generate_secure_token(16)
        }
        
        encoded_jwt = jwt.encode(to_encode, self.config.refresh_secret_key, algorithm=self.config.algorithm)
        
        # Store refresh token (in production, use Redis with expiration)
        self.refresh_tokens[encoded_jwt] = {
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        return encoded_jwt
    
    def verify_access_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode access token"""
        try:
            # Check if token is blacklisted
            if token in self.blacklisted_tokens:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
                )
            
            payload = jwt.decode(
                token, 
                self.config.secret_key, 
                algorithms=[self.config.algorithm]
            )
            
            # Verify token type
            if payload.get("type") != TokenType.ACCESS:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Access token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    
    def verify_refresh_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode refresh token"""
        try:
            # Check if refresh token exists and is active
            if token not in self.refresh_tokens or not self.refresh_tokens[token]["is_active"]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            payload = jwt.decode(
                token, 
                self.config.refresh_secret_key, 
                algorithms=[self.config.algorithm]
            )
            
            # Verify token type
            if payload.get("type") != TokenType.REFRESH:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            # Remove expired token
            self.refresh_tokens.pop(token, None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate refresh token"
            )
    
    def revoke_token(self, token: str):
        """Add token to blacklist"""
        self.blacklisted_tokens.add(token)
    
    def revoke_refresh_token(self, token: str):
        """Revoke refresh token"""
        if token in self.refresh_tokens:
            self.refresh_tokens[token]["is_active"] = False
    
    def revoke_all_user_tokens(self, user_id: str):
        """Revoke all tokens for a user"""
        for token, data in self.refresh_tokens.items():
            if data["user_id"] == user_id:
                data["is_active"] = False
    
    def check_rate_limit(self, identifier: str) -> bool:
        """Check if identifier is rate limited"""
        now = datetime.utcnow()
        
        if identifier in self.failed_attempts:
            attempts = self.failed_attempts[identifier]
            
            # Clean old attempts
            attempts["timestamps"] = [
                ts for ts in attempts["timestamps"] 
                if now - ts < timedelta(minutes=self.config.lockout_duration_minutes)
            ]
            
            if len(attempts["timestamps"]) >= self.config.max_login_attempts:
                return False  # Rate limited
        
        return True
    
    def record_failed_attempt(self, identifier: str):
        """Record a failed login attempt"""
        now = datetime.utcnow()
        
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = {"timestamps": []}
        
        self.failed_attempts[identifier]["timestamps"].append(now)
    
    def clear_failed_attempts(self, identifier: str):
        """Clear failed attempts for identifier"""
        self.failed_attempts.pop(identifier, None)
    
    async def get_current_user(
        self, 
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
    ) -> Dict[str, Any]:
        """Get current authenticated user"""
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        token = credentials.credentials
        payload = self.verify_access_token(token)
        
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role", UserRole.USER),
            "permissions": payload.get("permissions", []),
            "token_id": payload.get("jti")
        }
    
    async def get_current_active_user(
        self,
        current_user: dict = Depends(get_current_user)
    ) -> Dict[str, Any]:
        """Get current active user (not disabled)"""
        # In production, check if user is active in database
        if current_user.get("disabled"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        return current_user
    
    def require_role(self, required_role: UserRole):
        """Dependency to require specific role"""
        async def check_role(current_user: dict = Depends(self.get_current_active_user)):
            user_role = UserRole(current_user.get("role", UserRole.USER))
            
            # Role hierarchy: admin > premium > user > guest
            role_hierarchy = {
                UserRole.GUEST: 0,
                UserRole.USER: 1,
                UserRole.PREMIUM: 2,
                UserRole.ADMIN: 3
            }
            
            if role_hierarchy.get(user_role, 0) < role_hierarchy.get(required_role, 0):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. Required role: {required_role}"
                )
            
            return current_user
        
        return check_role
    
    def require_permission(self, required_permission: str):
        """Dependency to require specific permission"""
        async def check_permission(current_user: dict = Depends(self.get_current_active_user)):
            permissions = current_user.get("permissions", [])
            
            if required_permission not in permissions:
                # Check if user has admin role (grants all permissions)
                if current_user.get("role") != UserRole.ADMIN:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required permission: {required_permission}"
                    )
            
            return current_user
        
        return check_permission


# Global auth instance
auth = SecurityAuth()

# Export commonly used dependencies
get_current_user = auth.get_current_user
get_current_active_user = auth.get_current_active_user
require_admin = auth.require_role(UserRole.ADMIN)
require_premium = auth.require_role(UserRole.PREMIUM)