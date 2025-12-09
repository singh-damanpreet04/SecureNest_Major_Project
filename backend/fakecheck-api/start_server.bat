@echo off
echo ========================================
echo Starting SecureNest FakeCheck API
echo ========================================
echo.
echo Server will start on http://localhost:8080
echo Press Ctrl+C to stop the server
echo.
python -m uvicorn app.main:app --reload --port 8080
