import pytest
from app.services import youtube_service, chunking_service

def test_extract_video_id():
    """Test YouTube URL extraction with various formats."""
    valid_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtube.com/shorts/dQw4w9WgXcQ"
    ]
    
    for url in valid_urls:
        assert youtube_service.extract_video_id(url) == "dQw4w9WgXcQ"
        
    with pytest.raises(ValueError):
        youtube_service.extract_video_id("https://example.com/not-youtube")

def test_chunk_text_boundaries():
    """Test chunking logic with known text."""
    text = "Sentence one. Sentence two. Sentence three. Sentence four."
    # With chunk_size=30, "Sentence one. Sentence two. " is ~26 chars
    chunks = chunking_service.chunk_text(text, chunk_size=30, chunk_overlap=5)
    
    assert len(chunks) > 1
    assert "Sentence one." in chunks[0]["chunk_text"]
    assert chunks[0]["chunk_index"] == 0
    assert "start_char" in chunks[0]["metadata"]
    
def test_chunk_text_with_pages():
    """Test page-aware chunking for PDFs."""
    pages = [
        {"page_num": 1, "text": "Page one content."},
        {"page_num": 2, "text": "Page two content."}
    ]
    chunks = chunking_service.chunk_text_with_pages(pages, chunk_size=1000)
    
    assert len(chunks) == 2
    assert chunks[0]["metadata"]["source_page"] == 1
    assert chunks[1]["metadata"]["source_page"] == 2
    assert chunks[1]["chunk_index"] == 1
