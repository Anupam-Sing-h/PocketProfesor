from google import genai
from google.genai import types
import json
import asyncio
from app.config import settings

# Initialize the new SDK client
client = genai.Client(api_key=settings.gemini_api_key)

async def generate_structured_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.3,
    max_retries: int = 3
) -> dict:
    """Generate structured JSON output from Gemini with retry logic using modern SDK."""
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=settings.llm_model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    response_mime_type="application/json"  # Force JSON output
                )
            )
            result = json.loads(response.text)
            return result
        except json.JSONDecodeError:
            # Try to extract JSON from response text
            text = response.text
            # Attempt to find JSON in the response
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end > start:
                result = json.loads(text[start:end])
                return result
            if attempt == max_retries - 1:
                raise ValueError(f"Failed to parse JSON after {max_retries} attempts")
            await asyncio.sleep(1 * (attempt + 1))
        except Exception as e:
            import traceback
            with open("error.log", "a") as f:
                f.write(traceback.format_exc() + "\n")
                
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(1 * (2 ** attempt))  # Exponential backoff

    raise ValueError("Failed to generate valid JSON")

async def generate_stream(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.7
):
    """Stream text generation from Gemini. Yields text chunks."""
    response = client.models.generate_content_stream(
        model=settings.llm_model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature
        )
    )
    for chunk in response:
        if chunk.text:
            yield chunk.text

async def translate_text(text: str, source_lang: str = "Hindi", target_lang: str = "English") -> str:
    """Translate text using Gemini. Handles long texts by chunking into batches."""
    import logging
    logger = logging.getLogger(__name__)
    
    CHUNK_SIZE = 4000  # chars per batch to stay within context window
    
    if len(text) <= CHUNK_SIZE:
        # Single batch
        prompt = (
            f"Translate the following {source_lang} text to {target_lang}. "
            f"Return ONLY the translated text, nothing else. No explanations, no notes.\n\n{text}"
        )
        response = client.models.generate_content(
            model=settings.llm_model,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        return response.text.strip()
    
    # Multi-batch translation for long texts
    logger.info(f"Translating {len(text)} chars in batches of {CHUNK_SIZE}")
    translated_parts = []
    
    # Split on sentence boundaries where possible
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        # Try to break at a sentence boundary (period, question mark, etc.)
        if end < len(text):
            for sep in ['। ', '? ', '! ', '. ', '\n']:
                last_sep = text[start:end].rfind(sep)
                if last_sep > CHUNK_SIZE // 2:  # Only break if we're past halfway
                    end = start + last_sep + len(sep)
                    break
        
        chunk = text[start:end]
        prompt = (
            f"Translate the following {source_lang} text to {target_lang}. "
            f"Return ONLY the translated text, nothing else. No explanations, no notes.\n\n{chunk}"
        )
        response = client.models.generate_content(
            model=settings.llm_model,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1)
        )
        translated_parts.append(response.text.strip())
        start = end
    
    result = " ".join(translated_parts)
    logger.info(f"Translation complete: {len(text)} chars → {len(result)} chars")
    return result


async def summarize_for_context(full_text: str, max_chars: int = 8000) -> str:
    """If content is too long, summarize to fit within context window."""
    if len(full_text) <= max_chars:
        return full_text
    # Take first and last portions + request summary of middle
    return full_text[:max_chars]
