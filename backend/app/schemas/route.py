from pydantic import BaseModel
from typing import Optional


class PointInput(BaseModel):
    lat: float
    lng: float


class BuildRouteRequest(BaseModel):
    from_point: PointInput
    to_point: PointInput
    profile: str = "wheelchair"
    from_address: Optional[str] = None
    to_address: Optional[str] = None
    avoid_construction: bool = False


class RouteResponse(BaseModel):
    route_id: str
    distance_m: int
    duration_sec: int
    accessibility_score: int
    geometry: dict
    barriers: dict


class RateRouteRequest(BaseModel):
    stars: int
    comment: Optional[str] = None
