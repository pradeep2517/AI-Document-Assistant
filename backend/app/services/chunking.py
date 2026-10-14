import re
from typing import List, Dict, Any
from app.config import settings


class ChunkItem:
    def __init__(
        self,
        chunk_index: int,
        page_number: int,
        text: str,
        token_count: int,
        char_start: int = 0,
        char_end: int = 0
    ):
        self.chunk_index = chunk_index
        self.page_number = page_number
        self.text = text
        self.token_count = token_count
        self.char_start = char_start
        self.char_end = char_end

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_index": self.chunk_index,
            "page_number": self.page_number,
            "text": self.text,
            "token_count": self.token_count,
            "char_start": self.char_start,
            "char_end": self.char_end,
        }


def split_text_recursive(
    text: str,
    max_chunk_size: int = 500,
    chunk_overlap: int = 100,
    separators: List[str] | None = None
) -> List[str]:
    """
    Splits text recursively using natural semantic boundaries:
    paragraphs, sentences, clauses, and words.
    """
    if separators is None:
        separators = ["\n\n", "\n", ". ", "? ", "! ", "; ", " ", ""]

    if len(text) <= max_chunk_size:
        clean = text.strip()
        return [clean] if clean else []

    # Find the highest level separator that splits the text
    sep = separators[-1]
    for candidate in separators:
        if candidate in text:
            sep = candidate
            break

    splits = text.split(sep) if sep else list(text)
    chunks: List[str] = []
    current_chunk = ""

    for s in splits:
        piece = s if not sep else (s + sep)
        if len(current_chunk) + len(piece) <= max_chunk_size:
            current_chunk += piece
        else:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            
            # If a single piece exceeds max_chunk_size, recursively subdivide it
            if len(piece) > max_chunk_size:
                sub_seps = separators[separators.index(sep) + 1 :] if sep in separators else [""]
                sub_chunks = split_text_recursive(piece, max_chunk_size, chunk_overlap, sub_seps)
                chunks.extend(sub_chunks)
                current_chunk = ""
            else:
                # Add overlap from the end of previous chunk if possible
                overlap_text = current_chunk[-chunk_overlap:] if chunk_overlap > 0 and len(current_chunk) > chunk_overlap else ""
                current_chunk = overlap_text + piece

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def chunk_document_pages(
    pages: List[Dict[str, Any]],
    chunk_size: int = settings.CHUNK_SIZE,
    chunk_overlap: int = settings.CHUNK_OVERLAP
) -> List[ChunkItem]:
    """
    Chunks document page-by-page to guarantee exact page references
    for grounded citations and source verification.
    """
    chunks: List[ChunkItem] = []
    global_chunk_index = 0

    for page in pages:
        page_num = page["page_number"]
        page_text = page.get("text", "").strip()
        if not page_text:
            continue

        raw_chunks = split_text_recursive(
            text=page_text,
            max_chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        char_offset = 0
        for rc in raw_chunks:
            if not rc.strip():
                continue
            
            # Approximate token count (average ~4 chars per token)
            token_count = max(1, len(rc) // 4)
            char_end = char_offset + len(rc)

            chunks.append(ChunkItem(
                chunk_index=global_chunk_index,
                page_number=page_num,
                text=rc,
                token_count=token_count,
                char_start=char_offset,
                char_end=char_end
            ))
            char_offset = char_end
            global_chunk_index += 1

    return chunks
