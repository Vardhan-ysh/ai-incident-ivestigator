import sys
import os

# Add the backend directory to the sys.path so we can import 'app'
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app

# This is the entry point for Vercel
# Vercel will look for an 'app' variable in this file
