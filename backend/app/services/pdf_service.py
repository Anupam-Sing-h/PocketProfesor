import fitz  # PyMuPDF
from fastapi import HTTPException
import io

def validate_pdf(file_bytes: bytes, filename: str) -> None:
    """Validates if the file is a PDF and within size limits."""
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 20MB)")
    
    if not filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    try:
        fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        raise HTTPException(status_code=400, detail="Corrupted or invalid PDF file")

async def extract_pdf_text(file_bytes: bytes, filename: str) -> dict:
    """
    Extracts text from an uploaded PDF file.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = []
        full_text_parts = []
        
        for page_num, page in enumerate(doc, 1):
            text = page.get_text("text")
            if text.strip():
                pages.append({"page_num": page_num, "text": text})
                full_text_parts.append(text)
        
        full_text = "\n\n".join(full_text_parts)
        
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="PDF contains no extractable text")
            
        title = filename.rsplit(".", 1)[0]
        
        return {
            "title": title,
            "full_text": full_text,
            "page_count": len(doc),
            "pages": pages
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract PDF text: {str(e)}")
