# app/schemas/auth.py
from pydantic import BaseModel, EmailStr
from app.models.user import ProfileType


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    profile_type: ProfileType = ProfileType.wheelchair


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    profile_type: str

    class Config:
        from_attributes = True
