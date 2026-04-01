"""KithNode API — FastAPI wrapper around the cold outreach bot intelligence layer."""

import os
import sys

from dotenv import load_dotenv

# Load .env BEFORE any bot module imports (database.py reads KITHNODE_DB_PATH on import)
load_dotenv()

# Add core/ to sys.path so bot modules' bare imports resolve
# e.g. `import database as db`, `from config import USER_PROFILE`
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "core"))

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import contacts, discover, import_contacts, outreach, preferences, signals, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    # database.py calls init_db() on import — DB is ready by now
    yield


app = FastAPI(
    title="KithNode API",
    description="Intelligence layer for warm outreach signals",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow Next.js dev server and production
cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stats.router)
app.include_router(contacts.router)
app.include_router(signals.router)
app.include_router(outreach.router)
app.include_router(discover.router)
app.include_router(import_contacts.router)
app.include_router(preferences.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
