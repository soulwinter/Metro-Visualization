import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def get_amap_key():
    """
    Get AMap API key from environment variable.
    If not found in environment, fall back to default key (not recommended for production)
    """
    return os.getenv('AMAP_API_KEY')

# Other API configuration settings can be added here
AMAP_BASE_URL = "https://restapi.amap.com"
