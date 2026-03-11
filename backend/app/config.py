import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # API & App Settings
    app_name: str = 'AI Incident Investigator API'
    debug: bool = False

    # Database Settings
    database_url: str = 'sqlite:///./data/incidents.db'

    # ChromaDB Cloud Settings
    chroma_api_key: str = ''
    chroma_tenant: str = ''
    chroma_database: str = 'ai-incident-investigator'
    chroma_collection_name: str = 'incidents'

    # Google Gemini Settings
    gemini_api_key: str = ''
    embedding_model: str = 'models/gemini-embedding-001'
    reasoning_model: str = 'gemini-2.0-flash'

    # Pipeline Hyperparameters
    retrieval_k: int = 5
    calib_alpha: float = 2.5
    calib_beta: float = -1.25

    # Optional Admin Key (for mock auth)
    api_key: str = 'admin-secret-key'

    model_config = SettingsConfigDict(
        env_file=['.env', '../.env'], env_file_encoding='utf-8', extra='ignore'
    )


settings = Settings()
