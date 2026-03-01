import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    opensky_base: str = "https://opensky-network.org/api"
    opensky_username: str = os.getenv("OPENSKY_USERNAME", "")
    opensky_password: str = os.getenv("OPENSKY_PASSWORD", "")
    aisstream_api_key: str = os.getenv("AISSTREAM_API_KEY", "")
    gfw_api_token: str = os.getenv("GFW_API_TOKEN", "")
    gfw_base: str = "https://gateway.api.globalfishingwatch.org/v3"
    cache_ttl_seconds: int = int(os.getenv("CREP_GATEWAY_CACHE_TTL", "30"))
    request_timeout_seconds: float = float(os.getenv("CREP_GATEWAY_TIMEOUT", "30"))
