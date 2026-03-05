from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

if not settings.supabase_url or not settings.supabase_service_key:
    logger.error("Supabase URL or Service Key is missing from .env file!")

try:
    supabase: Client = create_client(settings.supabase_url, settings.supabase_service_key)
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    # We allow the app to start but subsequent DB calls will fail with clearer logs
    supabase = None
