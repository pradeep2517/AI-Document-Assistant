import io
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import fitz  # PyMuPDF
from PIL import Image
import pytesseract
from app.config import settings

logger = logging.getLogger(__name__)

# Configure tesseract executable if needed
if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


class PDFProcessingResult:
    def __init__(
        self,
        page_count: int,
        extracted_chars: int,
        ocr_applied: bool,
        ocr_pages: List[int],
        pages: List[Dict[str, Any]],
        full_text: str,
        summary: str
    ):
        self.page_count = page_count
        self.extracted_chars = extracted_chars
        self.ocr_applied = ocr_applied
        self.ocr_pages = ocr_pages
        self.pages = pages
        self.full_text = full_text
        self.summary = summary

    def to_dict(self) -> Dict[str, Any]:
        return {
            "page_count": self.page_count,
            "extracted_chars": self.extracted_chars,
            "ocr_applied": self.ocr_applied,
            "ocr_pages_count": len(self.ocr_pages),
            "ocr_pages": self.ocr_pages,
            "pages": self.pages,
            "summary": self.summary,
        }


def extract_text_from_pdf(file_path: str | Path, force_ocr: bool = False) -> PDFProcessingResult:
    """
    Extracts text from a PDF file page by page using PyMuPDF.
    If a page contains little or no text (e.g. scanned document or image),
    Tesseract OCR is automatically invoked on a rendered pixmap of that page.
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"PDF file does not exist: {file_path}")

    pages_data: List[Dict[str, Any]] = []
    ocr_pages: List[int] = []
    total_chars = 0
    full_text_list: List[str] = []

    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
        logger.info(f"Opened PDF '{file_path.name}' with {page_count} pages.")

        for page_index in range(page_count):
            page_num = page_index + 1
            page = doc[page_index]
            
            # Step 1: Direct digital text extraction
            direct_text = page.get_text("text").strip()
            images_list = page.get_images(full=True)
            
            is_ocr = False
            page_text = direct_text

            # Step 2: Trigger OCR if text is below threshold or forced
            should_ocr = force_ocr or (len(direct_text) < settings.OCR_CHAR_THRESHOLD and len(images_list) > 0) or (len(direct_text) == 0)

            if should_ocr:
                logger.info(f"Page {page_num} in '{file_path.name}' has low direct text ({len(direct_text)} chars). Running Tesseract OCR...")
                try:
                    pix = page.get_pixmap(dpi=settings.OCR_DPI)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img).strip()
                    
                    if len(ocr_text) > len(direct_text):
                        page_text = ocr_text
                        is_ocr = True
                        ocr_pages.append(page_num)
                        logger.info(f"OCR successfully extracted {len(ocr_text)} characters from page {page_num}.")
                except Exception as ocr_err:
                    logger.warning(f"OCR failed for page {page_num}: {ocr_err}. Retaining direct text.")
                    page_text = direct_text

            clean_text = " ".join(page_text.split())
            char_count = len(clean_text)
            total_chars += char_count

            pages_data.append({
                "page_number": page_num,
                "text": clean_text,
                "char_count": char_count,
                "is_ocr": is_ocr,
                "images_count": len(images_list)
            })

            if clean_text:
                full_text_list.append(f"--- Page {page_num} ---\n{clean_text}")

        doc.close()

    except Exception as e:
        logger.error(f"Error processing PDF {file_path}: {e}")
        raise RuntimeError(f"Failed to process PDF: {str(e)}")

    full_text = "\n\n".join(full_text_list)
    ocr_applied = len(ocr_pages) > 0

    # Generate an intelligent initial summary from the first 2-3 pages
    initial_sample = full_text[:1800].strip()
    summary = (
        f"Document '{file_path.name}' containing {page_count} page(s) and {total_chars:,} characters. "
        + (f"OCR was applied to {len(ocr_pages)} scanned page(s). " if ocr_applied else "Direct text extracted. ")
        + f"Preview: {initial_sample[:300]}..." if len(initial_sample) > 300 else initial_sample
    )

    return PDFProcessingResult(
        page_count=page_count,
        extracted_chars=total_chars,
        ocr_applied=ocr_applied,
        ocr_pages=ocr_pages,
        pages=pages_data,
        full_text=full_text,
        summary=summary
    )
