import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import random
import time
from datetime import datetime
from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import socketio

from data import (
    TENANTS,
    ANOMALIES,
    gen_hourly,
    gen_pf,
    gen_demand_util,
    gen_active_apparent,
    gen_load_factor,
    gen_phase_voltage,
    compute_bill,
)
from llm import answer_question

app = FastAPI(title="Cortex Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/tenants")
def list_tenants():
    return list(TENANTS.values())


@app.get("/api/tenant/{tenant_id}")
def get_tenant(tenant_id: str):
    return TENANTS[tenant_id]


@app.get("/api/power/hourly/{tenant_id}")
def power_hourly(tenant_id: str, range: str = "Today"):
    return gen_hourly(TENANTS[tenant_id], range)


@app.get("/api/power/pf/{tenant_id}")
def power_pf(tenant_id: str, range: str = "Today"):
    return gen_pf(TENANTS[tenant_id], range)


@app.get("/api/power/demand-util/{tenant_id}")
def power_demand_util(tenant_id: str, range: str = "Today"):
    return gen_demand_util(TENANTS[tenant_id], range)


@app.get("/api/power/active-apparent/{tenant_id}")
def power_active_apparent(tenant_id: str, range: str = "Today"):
    return gen_active_apparent(TENANTS[tenant_id], range)


@app.get("/api/power/load-factor/{tenant_id}")
def power_load_factor(tenant_id: str, range: str = "Today"):
    return gen_load_factor(TENANTS[tenant_id], range)


@app.get("/api/power/phase-voltage/{tenant_id}")
def power_phase_voltage(tenant_id: str, range: str = "Today"):
    return gen_phase_voltage(TENANTS[tenant_id], range)


@app.get("/api/anomalies/{tenant_id}")
def anomalies(tenant_id: str):
    return ANOMALIES[tenant_id]


@app.get("/api/bill/{tenant_id}")
def bill(tenant_id: str):
    return compute_bill(TENANTS[tenant_id])


@app.post("/api/chat/{tenant_id}")
def chat(
    tenant_id: str,
    body: dict,
    x_api_key: Optional[str] = Header(None),
    x_ai_provider: Optional[str] = Header(None)
):
    return answer_question(body.get("question", ""), TENANTS[tenant_id], x_api_key, x_ai_provider)


sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

ALERT_MESSAGES = [
    "Power Factor dipped below 0.86 on Meter-01",
    "md_kva approaching 95% of contracted demand",
    "THD(i) crossed 8% on Meter-02",
    "Phase imbalance above 3% detected",
]


@sio.on("connect", namespace="/telemetry")
async def telemetry_connect(sid, environ):
    print(f"Client connected to /telemetry: {sid}")


@sio.on("disconnect", namespace="/telemetry")
async def telemetry_disconnect(sid):
    print(f"Client disconnected from /telemetry: {sid}")


async def emit_alerts_loop():
    while True:
        alert = {
            "id": int(time.time() * 1000),
            "level": "high" if random.random() > 0.6 else "medium",
            "msg": random.choice(ALERT_MESSAGES),
            "time": datetime.now().strftime("%H:%M:%S"),
        }
        await sio.emit("alert", alert, namespace="/telemetry")
        await sio.sleep(10)


@app.on_event("startup")
async def start_background_tasks():
    sio.start_background_task(emit_alerts_loop)

# Export the combined ASGI app as 'app' for Vercel serverless environment compatibility
app = socket_app