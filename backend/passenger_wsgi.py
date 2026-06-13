import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
sys.stderr.write("Loading FastAPI app for Passenger...\n")

try:
    from app.main import app

    sys.stderr.write("FastAPI app imported successfully\n")

    # Passenger WSGI does not run FastAPI lifespan — bootstrap here instead.
    from app.db.init_db import ensure_default_admin, ensure_documents_storage
    from app.db.session import SessionLocal
    from app.services.embedding_service import get_embedding_service
    from app.services.rag_service import get_rag_service

    def ensure_app_started() -> None:
        ensure_documents_storage()
        db = SessionLocal()
        try:
            ensure_default_admin(db)
        finally:
            db.close()
        get_embedding_service()
        get_rag_service()

    ensure_app_started()
    sys.stderr.write("App bootstrap completed (storage, admin, embedding, RAG)\n")

    try:
        from a2wsgi import ASGIMiddleware

        application = ASGIMiddleware(app)
        sys.stderr.write("Using a2wsgi ASGIMiddleware\n")
    except ImportError:
        sys.stderr.write("a2wsgi not found, trying asgiref...\n")
        from asgiref.wsgi import WsgiToAsgi

        application = WsgiToAsgi(app)
        sys.stderr.write("Using asgiref WsgiToAsgi\n")

except Exception as e:
    import traceback

    _load_error_detail = str(e)
    sys.stderr.write(f"Error loading application: {_load_error_detail}\n")
    sys.stderr.write(traceback.format_exc() + "\n")

    def application(environ, start_response):
        error_msg = json.dumps(
            {"error": "Application failed to load", "detail": _load_error_detail}
        )
        body = error_msg.encode()
        start_response(
            "500 Internal Server Error",
            [
                ("Content-Type", "application/json"),
                ("Content-Length", str(len(body))),
            ],
        )
        return [body]
