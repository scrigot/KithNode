"""Shim: re-exports everything from bot_config.py.

Bot modules do `from config import USER_PROFILE` — this resolves here
and forwards to bot_config.py (the renamed original config.py).
"""
from bot_config import *  # noqa: F401,F403
