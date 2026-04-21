import uuid
from datetime import datetime
from sqlalchemy import String, Integer, SmallInteger, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from app.db.base import Base


class Route(Base):
    __tablename__ = "routes"

    id:                  Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:             Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    profile_type:        Mapped[str]       = mapped_column(String(20), nullable=False)
    from_address:        Mapped[str]       = mapped_column(Text, nullable=False)
    to_address:          Mapped[str]       = mapped_column(Text, nullable=False)
    from_point:          Mapped[object]    = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    to_point:            Mapped[object]    = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    geometry:            Mapped[object]    = mapped_column(Geometry("LINESTRING", srid=4326), nullable=True)
    distance_m:          Mapped[int]       = mapped_column(Integer, nullable=True)
    duration_sec:        Mapped[int]       = mapped_column(Integer, nullable=True)
    accessibility_score: Mapped[int]       = mapped_column(SmallInteger, nullable=True)
    barriers_found:      Mapped[dict]      = mapped_column(JSONB, default=dict)
    created_at:          Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Связи
    user:   Mapped["User"]         = relationship("User", back_populates="routes")
    rating: Mapped["RouteRating | None"] = relationship("RouteRating", back_populates="route", uselist=False)


class RouteRating(Base):
    __tablename__ = "route_ratings"

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_id:   Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("routes.id"))
    user_id:    Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    stars:      Mapped[int]       = mapped_column(SmallInteger, nullable=False)
    comment:    Mapped[str | None]= mapped_column(Text, nullable=True)
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    route: Mapped["Route"] = relationship("Route", back_populates="rating")
