import logging
import json
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

# Active engine & session maker
active_engine = None
async_session_maker = None
is_postgres_active = False


async def init_db():
    global active_engine, async_session_maker, is_postgres_active
    
    # Try connecting to PostgreSQL first
    try:
        logger.info(f"Attempting connection to PostgreSQL: {settings.DATABASE_URL}")
        pg_engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
            connect_args={"timeout": 5}
        )
        async with pg_engine.begin() as conn:
            # Check if connection works
            await conn.execute(text("SELECT 1"))
            # Enable pgvector if available
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                logger.info("pgvector extension initialized or already enabled.")
            except Exception as ext_err:
                logger.warning(f"pgvector extension creation warning: {ext_err}")
            
            # Create tables
            await conn.run_sync(Base.metadata.create_all)
            
        active_engine = pg_engine
        async_session_maker = async_sessionmaker(active_engine, expire_on_commit=False, class_=AsyncSession)
        is_postgres_active = True
        logger.info("Successfully initialized PostgreSQL database with pgvector support.")
        return
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL ({e}).")
        if not settings.USE_SQLITE_FALLBACK:
            raise e
        logger.info(f"Falling back to SQLite database: {settings.SQLITE_URL}")

    # Fallback to SQLite
    sqlite_engine = create_async_engine(
        settings.SQLITE_URL,
        echo=False,
        pool_pre_ping=True
    )
    async with sqlite_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    active_engine = sqlite_engine
    async_session_maker = async_sessionmaker(active_engine, expire_on_commit=False, class_=AsyncSession)
    is_postgres_active = False
    logger.info("Successfully initialized SQLite database fallback with high-performance vector operations.")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    global async_session_maker
    if async_session_maker is None:
        await init_db()
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
