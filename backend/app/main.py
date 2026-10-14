import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.api import documents, chat, health

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("docassistant")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing AI Document Assistant Application...")
    await init_db()
    logger.info("Database initialized successfully.")
    
    # Seed initial data if empty
    try:
        from app.database import async_session_maker
        from app.services.seed_service import seed_database_if_empty
        if async_session_maker:
            async with async_session_maker() as session:
                await seed_database_if_empty(session)
    except Exception as seed_err:
        logger.warning(f"Initial database seeding warning: {seed_err}")

    yield
    logger.info("Shutting down AI Document Assistant...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI Document Assistant with PyMuPDF OCR, sentence-transformers, pgvector, and grounded RAG citations.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "online"
    }
