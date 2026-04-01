from sqlalchemy import Column, String, Integer, DateTime, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_input = Column(String)
    final_output = Column(String, nullable=True)
    status = Column(String, default="running")  # "running", "success", "failure"
    total_cost = Column(Float, default=0.0)
    total_latency = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    steps = relationship("Step", back_populates="run", cascade="all, delete-orphan")

class Step(Base):
    __tablename__ = "steps"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, ForeignKey("agent_runs.id"))
    step_type = Column(String)  # "LLM", "TOOL"
    input = Column(JSON)
    output = Column(JSON)
    latency = Column(Float)  # in milliseconds
    cost = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    run = relationship("AgentRun", back_populates="steps")

class Tool(Base):
    __tablename__ = "tools"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True)
    description = Column(String)
