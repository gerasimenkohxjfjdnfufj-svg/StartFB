from pydantic import BaseModel
from typing import Optional
from app.models.mark import MarkCategory


class MarkCreate(BaseModel):
    lat: float
    lng: float
    category: MarkCategory
    type: str
    comment: Optional[str] = None


class MarkResponse(BaseModel):
    id: str
    lat: float
    lng: float
    category: str
    type: str
    comment: Optional[str]
    votes: int
    source: str

    class Config:
        from_attributes = True


class MarkVoteRequest(BaseModel):
    vote: str  # confirm | deny
