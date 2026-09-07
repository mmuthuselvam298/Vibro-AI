from .engines import router as engines_router
from .missions import router as missions_router
from .telemetry import router as telemetry_router
from .faults import router as faults_router
from .maintenance import router as maintenance_router

__all__ = [
    "engines_router",
    "missions_router",
    "telemetry_router",
    "faults_router",
    "maintenance_router",
]
