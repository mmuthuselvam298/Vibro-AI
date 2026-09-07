from fastapi import FastAPI, HTTPException
from sqlmodel import Session, select

from .database import create_db_and_tables, engine
from .models.engine import Engine


app = FastAPI(
    title="Vibro-AI Backend",
    description="Backend API for the UAV Engine Digital Twin",
    version="0.1.0",
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "vibro-ai-backend",
        "version": "0.1.0",
    }


@app.post("/api/engines", response_model=Engine)
def create_engine(engine_data: Engine):
    with Session(engine) as session:
        session.add(engine_data)
        session.commit()
        session.refresh(engine_data)
        return engine_data


@app.get("/api/engines", response_model=list[Engine])
def get_engines():
    with Session(engine) as session:
        engines = session.exec(select(Engine)).all()
        return engines


@app.get("/api/engines/{engine_id}", response_model=Engine)
def get_engine(engine_id: int):
    with Session(engine) as session:
        engine_data = session.get(Engine, engine_id)

        if not engine_data:
            raise HTTPException(
                status_code=404,
                detail="Engine not found",
            )

        return engine_data