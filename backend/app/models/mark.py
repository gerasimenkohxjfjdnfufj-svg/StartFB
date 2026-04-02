import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, BigInteger, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from app.db.base import Base
import enum


class MarkCategory(str, enum.Enum):
    obstacle = "obstacle"
    useful   = "useful"
    info     = "info"


class MarkSource(str, enum.Enum):
    user = "user"
    osm  = "osm"


class Mark(Base):
    __tablename__ = "marks"

    id:          Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id:     Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    location:    Mapped[object]         = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    category:    Mapped[MarkCategory]   = mapped_column(SAEnum(MarkCategory), nullable=False)
    type:        Mapped[str]            = mapped_column(String(50), nullable=False)
    comment:     Mapped[str | None]     = mapped_column(Text, nullable=True)
    photo_url:   Mapped[str | None]     = mapped_column(String(500), nullable=True)
    votes:       Mapped[int]            = mapped_column(Integer, default=0)
    is_verified: Mapped[bool]           = mapped_column(Boolean, default=False)
    is_active:   Mapped[bool]           = mapped_column(Boolean, default=True)
    osm_id:      Mapped[int | None]     = mapped_column(BigInteger, nullable=True)
    source:      Mapped[MarkSource]     = mapped_column(SAEnum(MarkSource), default=MarkSource.user)
    created_at:  Mapped[datetime]       = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at:  Mapped[datetime | None]= mapped_column(DateTime(timezone=True), nullable=True)

    user:  Mapped["User | None"] = relationship("User", back_populates="marks")
    votes_list: Mapped[list["MarkVote"]] = relationship("MarkVote", back_populates="mark")


class MarkVote(Base):
    __tablename__ = "mark_votes"

    id:         Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mark_id:    Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("marks.id"))
    user_id:    Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    vote:       Mapped[str]       = mapped_column(String(10), nullable=False)  # confirm | deny
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    mark: Mapped["Mark"] = relationship("Mark", back_populates="votes_list")
