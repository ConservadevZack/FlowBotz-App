from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import jwt
import bcrypt
from datetime import datetime, timedelta
import os

router = APIRouter()
security = HTTPBearer()

# Pydantic models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    # TODO: Implement with Supabase
    # For now, return mock response
    mock_user = {
        "id": "user_123",
        "email": user_data.email,
        "full_name": user_data.full_name,
        "avatar_url": None,
        "created_at": datetime.utcnow()
    }
    
    access_token = create_access_token(data={"sub": user_data.email})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=mock_user
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Authenticate user and return JWT token"""
    # TODO: Implement with Supabase
    # For now, return mock response
    mock_user = {
        "id": "user_123",
        "email": credentials.email,
        "full_name": "Test User",
        "avatar_url": None,
        "created_at": datetime.utcnow()
    }
    
    access_token = create_access_token(data={"sub": credentials.email})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=mock_user
    )

@router.get("/me", response_model=UserProfile)
async def get_current_user(current_user = Depends(verify_token)):
    """Get current user profile"""
    # TODO: Implement with Supabase
    # For now, return mock response
    return UserProfile(
        id="user_123",
        email=current_user.get("sub"),
        full_name="Test User",
        avatar_url=None,
        created_at=datetime.utcnow()
    )

@router.post("/logout")
async def logout(current_user = Depends(verify_token)):
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}