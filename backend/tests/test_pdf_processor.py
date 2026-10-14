import pytest
from pathlib import Path
from app.services.pdf_processor import extract_text_from_pdf


def test_extract_text_from_sample_pdf(sample_pdf_path):
    """Verifies PyMuPDF extracts text, counts pages, and generates summary correctly."""
    result = extract_text_from_pdf(sample_pdf_path)

    assert result.page_count == 3
    assert result.extracted_chars > 300
    assert len(result.pages) == 3
    assert result.pages[0]["page_number"] == 1
    assert "Renewable Energy and Smart Grid" in result.pages[0]["text"]
    assert "System Architecture" in result.pages[1]["text"]
    assert "Experimental Results" in result.pages[2]["text"]
    assert "renewable_energy_research.pdf" in result.summary


def test_extract_nonexistent_pdf():
    """Verifies proper error handling when PDF path is missing."""
    with pytest.raises(FileNotFoundError):
        extract_text_from_pdf("missing_nonexistent_file.pdf")
