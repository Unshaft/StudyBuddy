from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    anthropic_api_key: str
    voyage_api_key: str
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"

    # Modèles IA
    vision_model: str = "claude-sonnet-4-6"
    correction_model: str = "claude-sonnet-4-6"
    embedding_model: str = "voyage-3"
    embedding_dimensions: int = 1024

    # RAG
    chunk_size: int = 800
    chunk_overlap: int = 100
    retrieval_top_k: int = 5
    specialist_top_k: int = 7          # Plus de chunks pour les spécialistes

    # Agents spécialistes
    evaluator_model: str = "claude-haiku-4-5-20251001"   # Modèle léger pour l'évaluation
    specialist_max_tokens: int = 2048
    evaluator_max_tokens: int = 512
    max_rag_iterations: int = 2        # Limite de re-queries RAG par session

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
