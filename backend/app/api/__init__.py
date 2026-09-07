from .engines import router as engines_router
from .missions import router as missions_router
from .telemetry import router as telemetry_router
from .faults import router as faults_router
from .maintenance import router as maintenance_router
from .health import router as health_router
from .prognostics import router as prognostics_router
from .vibration import router as vibration_router

__all__ = [
    "engines_router",
    "missions_router",
    "telemetry_router",
    "faults_router",
    "maintenance_router",
    "health_router",
    "prognostics_router",
    "vibration_router",
]
