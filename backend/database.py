import os
from sqlalchemy import create_engine, event  # type: ignore
from sqlalchemy.orm import sessionmaker  # type: ignore

# Use SQLite for easy local development (no PostgreSQL required)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "synchain.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_recycle=300,  # recycle connections every 5 min to avoid stale handles
)


# Enable WAL journal mode for better concurrent read/write
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
