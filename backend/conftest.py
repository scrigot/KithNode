"""Root conftest — sets up sys.path for bot module imports."""

import os
import sys

# Add core/ to sys.path so bare imports (import database as db) resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app", "core"))
