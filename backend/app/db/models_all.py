# Импортируется только в alembic/env.py
from app.db.base import Base  # noqa
from app.models.user import User  # noqa
from app.models.route import Route, RouteRating  # noqa
from app.models.mark import Mark, MarkVote  # noqa
from app.models.osm import OsmBarrier  # noqa