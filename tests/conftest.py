import pytest
import os
import asyncio

# Ensure test DB is isolated
os.environ["SQLITE_DB_PATH"] = "test_observatory.db"

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(autouse=True)
def clean_test_db():
    yield
    if os.path.exists("test_observatory.db"):
        try:
            os.remove("test_observatory.db")
        except Exception:
            pass
