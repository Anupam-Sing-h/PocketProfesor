import re

def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    metadata: dict = None
) -> list[dict]:
    """
    Splits text into overlapping chunks, respecting sentence boundaries.
    """
    if not text:
        return []

    # Use regex to find sentence boundaries (. ! ? followed by whitespace or end of string)
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    
    chunks = []
    current_sentences = []
    current_length = 0
    start_char = 0
    
    def add_chunk(chunk_text_str, start_c):
        """Helper to append a chunk."""
        # Ensure minimum chunk size of 100 characters (don't create tiny trailing chunks)
        # However, if it's the only text we have, we must add it.
        # This minimum check is mostly for trailing chunks.
        chunks.append({
            "chunk_text": chunk_text_str,
            "chunk_index": len(chunks),
            "metadata": {
                **(metadata or {}),
                "start_char": start_c,
                "end_char": start_c + len(chunk_text_str)
            }
        })
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # Edge case: single sentence exceeds chunk_size
        if len(sentence) > chunk_size:
            # If we already have accumulated sentences, flush them first
            if current_sentences:
                chunk_str = " ".join(current_sentences)
                add_chunk(chunk_str, start_char)
                start_char += len(chunk_str) + 1
                current_sentences = []
                current_length = 0
                
            # Split the long sentence by words
            words = sentence.split()
            current_words = []
            curr_word_len = 0
            
            for word in words:
                if curr_word_len + len(word) + (1 if current_words else 0) > chunk_size and current_words:
                    word_chunk = " ".join(current_words)
                    add_chunk(word_chunk, start_char)
                    start_char += len(word_chunk) + 1
                    
                    # Word-level overlap handling (approximate)
                    # Keep words that fit in overlap
                    overlap_words = []
                    overlap_len = 0
                    for w in reversed(current_words):
                        if overlap_len + len(w) + 1 <= chunk_overlap:
                            overlap_words.insert(0, w)
                            overlap_len += len(w) + 1
                        else:
                            break
                    
                    current_words = overlap_words
                    current_words.append(word)
                    curr_word_len = sum(len(w) for w in current_words) + len(current_words) - 1
                else:
                    current_words.append(word)
                    curr_word_len += len(word) + (1 if len(current_words) > 1 else 0)
            
            if current_words:
                word_chunk = " ".join(current_words)
                current_sentences = [word_chunk]
                current_length = len(word_chunk)
            continue
            
        sentence_len = len(sentence)
        
        # If adding this sentence exceeds chunk size and we already have sentences
        if current_length + sentence_len + (1 if current_sentences else 0) > chunk_size and current_sentences:
            chunk_str = " ".join(current_sentences)
            add_chunk(chunk_str, start_char)
            
            # Create overlap: drop sentences from start until length <= chunk_overlap
            while current_sentences and current_length > chunk_overlap:
                removed_sentence = current_sentences.pop(0)
                current_length -= len(removed_sentence) + (1 if current_sentences else 0)
                start_char += len(removed_sentence) + 1
                
            current_sentences.append(sentence)
            current_length += sentence_len + (1 if current_sentences else 0)
        else:
            current_sentences.append(sentence)
            current_length += sentence_len + (1 if len(current_sentences) > 1 else 0)
            
    # Add final chunk
    if current_sentences:
        chunk_str = " ".join(current_sentences)
        # Avoid creating tiny trailing chunks (<100 chars) unless it's the only chunk
        if len(chunk_str) >= 100 or len(chunks) == 0:
            add_chunk(chunk_str, start_char)
        elif chunks:
            # Append tiny trailing text to the previous chunk if possible, or just ignore it
            # The spec says "don't create tiny trailing chunks". We can just merge it into the last one.
            prev_chunk = chunks[-1]
            prev_chunk["chunk_text"] += " " + chunk_str
            prev_chunk["metadata"]["end_char"] += len(chunk_str) + 1
            
    return chunks

def chunk_text_with_pages(pages: list[dict], chunk_size: int = 1000, chunk_overlap: int = 200) -> list[dict]:
    """
    Chunks text while preserving page number metadata for PDFs.
    """
    all_chunks = []
    
    for page in pages:
        page_num = page.get("page_num")
        text = page.get("text")
        
        page_chunks = chunk_text(
            text, 
            chunk_size=chunk_size, 
            chunk_overlap=chunk_overlap, 
            metadata={"source_page": page_num}
        )
        
        # Adjust chunk index globally
        for i, chunk in enumerate(page_chunks):
            chunk["chunk_index"] = len(all_chunks) + i
            
        all_chunks.extend(page_chunks)
        
    return all_chunks
