# app/schemas/auth.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.user import ProfileType, UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.user
    profile_type: Optional[ProfileType] = None  # только для role=user


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    profile_type: Optional[str] = None

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if hasattr(obj, '__dict__'):
            data = {
                "id": str(obj.id),
                "email": obj.email,
                "name": obj.name,
                "role": str(obj.role.value if hasattr(obj.role, 'value') else obj.role),
                "profile_type": str(obj.profile_type.value) if obj.profile_type else None,
            }
            return cls(**data)
        return super().model_validate(obj, **kwargs)


TokenResponse.model_rebuild()
