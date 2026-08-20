from pydantic import BaseModel, Field

class CoreMeshTelemetryPayload(BaseModel):
    timestamp: int
    npu_load_pct: float = Field(ge=0.0, le=100.0)
    token_latency_ms: float
    chip_temp_celsius: float
    battery_drain_ma: int
