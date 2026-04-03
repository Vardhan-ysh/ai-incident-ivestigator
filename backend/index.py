import sys
import os

# Add current directory to path so 'app' can be found
sys.path.append(os.path.dirname(__file__))

from app.main import app

# This entry point is used by Vercel to serve the FastAPI backend
# as a standalone service under the /_/backend prefix.
