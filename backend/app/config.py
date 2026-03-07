from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    supabase_url: str = ""
    supabase_service_key: str = ""
    frontend_url: str = "http://localhost:3000"
    embedding_model: str = "models/text-embedding-004"
    llm_model: str = "models/gemini-2.0-flash"
    youtube_cookies: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
