from datetime import datetime
from sqlalchemy import String, BigInteger, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from app.db.base import Base
import enum


class OsmType(str, enum.Enum):
    node     = "node"
    way      = "way"
    relation = "relation"


class OsmBarrier(Base):
    __tablename__ = "osm_barriers"

    id:           Mapped[int]           = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    osm_id:       Mapped[int]           = mapped_column(BigInteger, unique=True, nullable=False)
    osm_type:     Mapped[OsmType]       = mapped_column(SAEnum(OsmType), nullable=False)
    location:     Mapped[object]        = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    geometry:     Mapped[object | None] = mapped_column(Geometry("GEOMETRY", srid=4326), nullable=True)
    barrier_type: Mapped[str]           = mapped_column(String(50), nullable=False)
    tags:         Mapped[dict]          = mapped_column(JSONB, default=dict)
    wheelchair:   Mapped[str | None]    = mapped_column(String(20), nullable=True)
    synced_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
