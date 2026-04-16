import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.shape import from_shape
from geoalchemy2.functions import ST_DWithin, ST_MakeEnvelope
from shapely.geometry import Point
from app.models.mark import Mark, MarkVote
from app.schemas.mark import MarkCreate


class MarkService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_in_bbox(
        self, south, west, north, east,
        category=None, source="all", limit=100,
    ) -> list:
        envelope = ST_MakeEnvelope(west, south, east, north, 4326)
        q = select(Mark).where(
            Mark.is_active == True,
            func.ST_Within(Mark.location, envelope),
        )
        if category:
            q = q.where(Mark.category == category)
        if source != "all":
            q = q.where(Mark.source == source)
        q = q.limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def create(self, body: MarkCreate, user_id: uuid.UUID) -> Mark:
        mark = Mark(
            user_id=user_id,
            location=from_shape(Point(body.lng, body.lat), srid=4326),
            category=body.category,
            type=body.type,
            comment=body.comment,
            source="user",
        )
        self.db.add(mark)
        await self.db.flush()
        return mark

    async def get_by_id(self, mark_id: str) -> Mark:
        result = await self.db.execute(
            select(Mark).where(Mark.id == uuid.UUID(mark_id))
        )
        return result.scalar_one_or_none()

    async def vote(self, mark_id: str, vote: str, user_id: uuid.UUID):
        # Проверяем, не голосовал ли уже
        existing = await self.db.execute(
            select(MarkVote).where(
                MarkVote.mark_id == uuid.UUID(mark_id),
                MarkVote.user_id == user_id,
            )
        )
        if existing.scalar_one_or_none():
            return {"status": "already_voted"}

        mark_vote = MarkVote(
            mark_id=uuid.UUID(mark_id),
            user_id=user_id,
            vote=vote,
        )
        self.db.add(mark_vote)

        # Обновляем счётчик
        result = await self.db.execute(select(Mark).where(Mark.id == uuid.UUID(mark_id)))
        mark = result.scalar_one_or_none()
        if mark:
            if vote == "confirm":
                mark.votes += 1
            elif vote == "deny" and mark.votes > 0:
                mark.votes -= 1

        await self.db.flush()
        return {"status": "ok", "vote": vote}
