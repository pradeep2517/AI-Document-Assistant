import os
import sys
from pathlib import Path
import pytest
import pytest_asyncio
import fitz
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Add backend directory to sys.path so app imports resolve
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.database import Base, get_db
from app.config import settings

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def test_db_session():
    """Provides a fresh, isolated in-memory SQLite database session for each test."""
    test_engine = create_async_engine(TEST_DB_URL, echo=False)
    async_session = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(test_db_session):
    """Provides an HTTP test client connected to the FastAPI app with test DB override."""
    async def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def sample_pdf_path(tmp_path_factory):
    """Generates a high-quality multi-page PDF for testing PDF extraction and RAG."""
    temp_dir = tmp_path_factory.mktemp("pdf_data")
    pdf_path = temp_dir / "renewable_energy_research.pdf"

    doc = fitz.open()

    # Page 1: Introduction and Abstract
    p1 = doc.new_page()
    p1.insert_text(
        (50, 72),
        "Renewable Energy and Smart Grid Innovations: A Comprehensive Study\n\n"
        "Abstract\n"
        "Contrastive learning and deep neural networks have emerged as powerful frameworks\n"
        "for modeling power grid resilience and renewable energy fluctuations.\n"
        "This research explores photovoltaic power forecasting and battery storage strategies.\n\n"
        "1. Introduction\n"
        "Modern energy distribution requires real-time balancing between intermittent solar\n"
        "and wind generation sources. Machine learning provides proactive anomaly detection.",
        fontsize=11
    )

    # Page 2: Architecture & Methodology
    p2 = doc.new_page()
    p2.insert_text(
        (50, 72),
        "2. System Architecture\n"
        "The proposed system uses a dual-branch transformer model trained on telemetry data.\n"
        "Branch A processes meteorological forecasts including solar irradiance and wind velocity.\n"
        "Branch B monitors real-time sub-station voltage and load profiles.\n\n"
        "Contrastive embeddings are projected into a 384-dimensional latent space to measure\n"
        "stability margins and trigger load-shedding safeguards automatically.",
        fontsize=11
    )

    # Page 3: Evaluation Results
    p3 = doc.new_page()
    p3.insert_text(
        (50, 72),
        "3. Experimental Results\n"
        "Extensive testing across 12 power grid microgrids demonstrated a 24.3% reduction\n"
        "in peak-hour forecasting error (RMSE: 0.042, MAE: 0.031).\n\n"
        "4. Conclusion\n"
        "The integration of proactive vector representations guarantees grid stability while\n"
        "maximizing the dispatch efficiency of stored renewable energy.",
        fontsize=11
    )

    doc.save(pdf_path)
    doc.close()

    return str(pdf_path)
