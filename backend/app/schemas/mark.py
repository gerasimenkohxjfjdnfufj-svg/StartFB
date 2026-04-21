from pydantic import BaseModel, model_validator
from typing import Optional, Any
from app.models.mark import MarkCategory


class MarkCreate(BaseModel):
    lat: float
    lng: float
    category: MarkCategory
    type: str
    comment: Optional[str] = None
    photo_url: Optional[str] = None


class MarkResponse(BaseModel):
    id: str
    lat: float
    lng: float
    category: str
    type: str
    comment: Optional[str]
    photo_url: Optional[str]
    votes: int
    source: str

    class Config:
        from_attributes = True

    @model_validator(mode='before')
    @classmethod
    def extract_coords_and_id(cls, data: Any) -> Any:
        # Если это ORM-объект, извлекаем координаты из geometry и конвертируем UUID
        if hasattr(data, '__class__') and hasattr(data, 'location'):
            from geoalchemy2.shape import to_shape
            shape = to_shape(data.location)
            return {
                'id':        str(data.id),
                'lat':       shape.y,
                'lng':       shape.x,
                'category':  data.category.value if hasattr(data.category, 'value') else data.category,
                'type':      data.type,
                'comment':   data.comment,
                'photo_url': data.photo_url,
                'votes':     data.votes,
                'source':    data.source.value if hasattr(data.source, 'value') else data.source,
            }
        return data


class MarkVoteRequest(BaseModel):
    vote: str  # confirm | deny
