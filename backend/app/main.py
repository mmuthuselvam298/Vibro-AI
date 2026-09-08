import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import create_db_and_tables
from .api import (
    engines_router,
    missions_router,
    telemetry_router,
    faults_router,
    maintenance_router,
    health_router,
    prognostics_router,
    vibration_router,
    digital_twin_router,
    websocket_router,
    simulation_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables are created and schema compatible
    create_db_and_tables()
    yield
    # Shutdown: clean up resources if needed


app = FastAPI(
    title="Vibro-AI Backend",
    description="Digital Twin Backend API for MALE UAV Piston Engine Health Monitoring",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Configuration for local frontend and production Vercel frontend
allowed_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,https://vibro-ai-main.vercel.app",
)
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/health")
def health_check():
    """Health check endpoint for monitoring service status."""
    return {
        "status": "healthy",
        "service": "vibro-ai-backend",
        "version": "0.1.0",
    }


# Include modular API routers
app.include_router(engines_router, prefix="/api")
app.include_router(missions_router, prefix="/api")
app.include_router(telemetry_router, prefix="/api")
app.include_router(faults_router, prefix="/api")
app.include_router(maintenance_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(prognostics_router, prefix="/api")
app.include_router(vibration_router, prefix="/api")
app.include_router(digital_twin_router, prefix="/api")
app.include_router(simulation_router, prefix="/api")
app.include_router(websocket_router)