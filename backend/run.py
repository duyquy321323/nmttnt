#!/usr/bin/env python3
"""
FastAPI Server Runner
Run this file to start the development server.

Requires: pip install -r requirements-api.txt -r requirements-dev.txt

Reload (mặc định bật): tiến trình cha của uvicorn vẫn chạy để theo dõi file; lỗi import
ở worker có thể khiến bạn tưởng "không thoát". Để cả process thoát khi cấu hình sai:

PowerShell: $env:UVICORN_RELOAD="false"; py run.py
"""

import os

import uvicorn

if __name__ == "__main__":
    _reload = os.getenv("UVICORN_RELOAD", "true").lower() in ("1", "true", "yes")
    _kw: dict = dict(
        host="127.0.0.1",
        port=8000,
        reload=_reload,
        log_level="info",
    )
    if _reload:
        _kw["reload_dirs"] = ["app"]
    uvicorn.run("app.main:app", **_kw)
