from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from models import Base, AgentRun, Step, Tool
import os
import requests
import time
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database Connection - Use absolute path to avoid confusion
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'agent_control.db')}")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agent Control Room API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency for database session
def get_db():
    db = Session(bind=engine)
    try:
        yield db
    finally:
        db.close()

# API Key and Model (as provided in prompt)
OPENROUTER_API_KEY = "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"
MODEL = "nvidia/nemotron-3-super-120b-a12b:free"

@app.post("/runs")
def create_run(user_input: str, db: Session = Depends(get_db)):
    run = AgentRun(user_input=user_input)
    db.add(run)
    db.commit()
    db.refresh(run)
    return {"id": run.id, "status": "running"}

@app.get("/runs")
def list_runs(db: Session = Depends(get_db)):
    runs = db.query(AgentRun).order_by(AgentRun.created_at.desc()).all()
    return [
        {
            "id": run.id,
            "user_input": run.user_input,
            "final_output": run.final_output,
            "status": run.status,
            "total_cost": run.total_cost,
            "total_latency": run.total_latency,
            "created_at": run.created_at
        } for run in runs
    ]

@app.get("/runs/{run_id}")
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    steps = db.query(Step).filter(Step.run_id == run_id).all()
    return {
        "id": run.id,
        "user_input": run.user_input,
        "final_output": run.final_output,
        "status": run.status,
        "total_cost": run.total_cost,
        "total_latency": run.total_latency,
        "created_at": run.created_at,
        "steps": [
            {
                "id": step.id,
                "step_type": step.step_type,
                "input": step.input,
                "output": step.output,
                "latency": step.latency,
                "cost": step.cost,
                "timestamp": step.timestamp
            } for step in steps
        ]
    }

@app.post("/runs/{run_id}/execute")
def execute_agent(run_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    background_tasks.add_task(run_agent_flow, run_id)
    return {"message": "Execution started"}

def run_agent_flow(run_id: str):
    db = Session(bind=engine)
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    
    start_time = time.time()
    
    # 1. Simulate LLM Step
    llm_step_id = str(uuid.uuid4())
    step_start = time.time()
    
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": run.user_input}],
            }
        )
        response_data = response.json()
        latency = (time.time() - step_start) * 1000
        
        output_content = response_data['choices'][0]['message']['content']
        tokens = response_data.get('usage', {}).get('total_tokens', 0)
        cost = tokens * 0.0000000  # "free" model
        
        llm_step = Step(
            id=llm_step_id,
            run_id=run_id,
            step_type="LLM",
            input={"prompt": run.user_input},
            output={"response": output_content, "tokens": tokens},
            latency=latency,
            cost=cost
        )
        db.add(llm_step)
        
        # 2. Update Run
        run.status = "success"
        run.final_output = output_content
        run.total_cost += cost
        run.total_latency += latency
        db.commit()
        
    except Exception as e:
        run.status = "failure"
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
