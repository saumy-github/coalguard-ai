"""
Predictive Analytics Engine
=============================
Two capabilities:

1. **Sensor Anomaly Detection** — IsolationForest on live telemetry
   (methane, CO, air_velocity, temperature).  Returns per-sensor anomaly
   flags and an overall risk level (NORMAL / WARNING / CRITICAL).

2. **Production Limit Forecasting** — Prophet model fits daily production
   history and forecasts 30-day cumulative extraction against an
   Environmental Clearance (EC) cap.

Thresholds are derived from the coal-mine sensor attribute documentation
(see data/telemetry/yd7vw4c5mk-1/attribute_information.txt).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. SENSOR ANOMALY DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

class RiskLevel(str, Enum):
    """Risk classification for a telemetry snapshot."""
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


# Regulatory thresholds — sourced from Coal Mines Regulations 2017
# and the sensor attribute documentation.
SENSOR_THRESHOLDS: Dict[str, Dict[str, float]] = {
    "methane": {
        "warning": 1.0,    # %CH4 — warning threshold
        "critical": 1.5,   # %CH4 — alarm / switching-off threshold
    },
    "co": {
        "warning": 25.0,   # ppm — TWA exposure limit
        "critical": 50.0,  # ppm — STEL / immediate danger
    },
    "air_velocity": {
        "warning_low": 0.3,   # m/s — minimum ventilation
        "warning_high": 4.0,  # m/s — maximum comfortable velocity
        "critical_low": 0.1,  # m/s — dangerously stagnant
        "critical_high": 5.0, # m/s — equipment-damaging
    },
    "temperature": {
        "warning": 32.0,   # °C — heat-stress threshold
        "critical": 37.0,  # °C — danger zone
    },
}


@dataclass
class SensorAnomaly:
    """Anomaly assessment for a single sensor reading."""
    sensor: str
    value: float
    is_anomaly: bool
    risk_level: str
    threshold_info: str


@dataclass
class AnomalyReport:
    """Aggregate anomaly report for a telemetry snapshot."""
    overall_risk: str
    anomaly_count: int
    sensor_reports: List[Dict[str, Any]] = field(default_factory=list)
    isolation_forest_scores: Dict[str, float] = field(default_factory=dict)


# Pre-fitted IsolationForest trained on synthetic "normal" operating ranges.
# This avoids needing the raw telemetry zip at runtime.
_iso_forest: Optional[IsolationForest] = None


def _get_isolation_forest() -> IsolationForest:
    """Return a fitted IsolationForest for 4-feature telemetry vectors.

    The model is trained on synthetic samples drawn from the normal
    operating ranges of each sensor.  This is a bootstrap approach —
    replace with real data once the telemetry pipeline produces enough
    historical samples.
    """
    global _iso_forest
    if _iso_forest is not None:
        return _iso_forest

    rng = np.random.RandomState(42)
    n_samples = 5000

    # Normal operating ranges (from attribute docs)
    methane_normal = rng.uniform(0.0, 0.8, n_samples)
    co_normal = rng.uniform(0.0, 20.0, n_samples)
    air_vel_normal = rng.uniform(0.5, 3.5, n_samples)
    temp_normal = rng.uniform(18.0, 30.0, n_samples)

    X_train = np.column_stack([methane_normal, co_normal, air_vel_normal, temp_normal])

    _iso_forest = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
    )
    _iso_forest.fit(X_train)
    logger.info("IsolationForest fitted on %d synthetic samples.", n_samples)

    return _iso_forest


def _evaluate_sensor(
    sensor: str,
    value: float,
) -> SensorAnomaly:
    """Evaluate a single sensor reading against regulatory thresholds."""
    thresholds = SENSOR_THRESHOLDS.get(sensor, {})
    risk = RiskLevel.NORMAL
    info = "Within normal operating range."

    if sensor == "air_velocity":
        if value <= thresholds.get("critical_low", 0.1):
            risk = RiskLevel.CRITICAL
            info = f"Dangerously low air velocity ({value:.2f} m/s ≤ {thresholds['critical_low']} m/s)."
        elif value >= thresholds.get("critical_high", 5.0):
            risk = RiskLevel.CRITICAL
            info = f"Dangerously high air velocity ({value:.2f} m/s ≥ {thresholds['critical_high']} m/s)."
        elif value <= thresholds.get("warning_low", 0.3):
            risk = RiskLevel.WARNING
            info = f"Low air velocity ({value:.2f} m/s ≤ {thresholds['warning_low']} m/s)."
        elif value >= thresholds.get("warning_high", 4.0):
            risk = RiskLevel.WARNING
            info = f"High air velocity ({value:.2f} m/s ≥ {thresholds['warning_high']} m/s)."
    else:
        critical_thresh = thresholds.get("critical", float("inf"))
        warning_thresh = thresholds.get("warning", float("inf"))

        if value >= critical_thresh:
            risk = RiskLevel.CRITICAL
            info = f"{sensor.upper()} at {value:.2f} exceeds critical threshold ({critical_thresh})."
        elif value >= warning_thresh:
            risk = RiskLevel.WARNING
            info = f"{sensor.upper()} at {value:.2f} exceeds warning threshold ({warning_thresh})."

    return SensorAnomaly(
        sensor=sensor,
        value=value,
        is_anomaly=(risk != RiskLevel.NORMAL),
        risk_level=risk.value,
        threshold_info=info,
    )


def assess_anomaly(
    methane: float,
    co: float,
    air_velocity: float,
    temperature: float,
) -> AnomalyReport:
    """Evaluate a telemetry snapshot for anomalies.

    Combines threshold-based checks per sensor with an IsolationForest
    score across the full feature vector.

    Args:
        methane: Methane concentration (%CH4).
        co: Carbon monoxide concentration (ppm).
        air_velocity: Air velocity (m/s).
        temperature: Temperature (°C).

    Returns:
        ``AnomalyReport`` with per-sensor breakdown and overall risk.
    """
    readings = {
        "methane": methane,
        "co": co,
        "air_velocity": air_velocity,
        "temperature": temperature,
    }

    # Per-sensor threshold evaluation
    sensor_reports: List[Dict[str, Any]] = []
    risk_levels: List[RiskLevel] = []

    for sensor, value in readings.items():
        result = _evaluate_sensor(sensor, value)
        sensor_reports.append(
            {
                "sensor": result.sensor,
                "value": result.value,
                "is_anomaly": result.is_anomaly,
                "risk_level": result.risk_level,
                "threshold_info": result.threshold_info,
            }
        )
        risk_levels.append(RiskLevel(result.risk_level))

    # IsolationForest scoring
    iso_forest = _get_isolation_forest()
    X = np.array([[methane, co, air_velocity, temperature]])
    iso_score = float(iso_forest.score_samples(X)[0])
    iso_prediction = int(iso_forest.predict(X)[0])  # 1 = normal, -1 = anomaly

    if iso_prediction == -1:
        # IsolationForest flagged anomaly — escalate to at least WARNING
        if RiskLevel.CRITICAL not in risk_levels:
            risk_levels.append(RiskLevel.WARNING)

    # Overall risk = worst case
    if RiskLevel.CRITICAL in risk_levels:
        overall = RiskLevel.CRITICAL
    elif RiskLevel.WARNING in risk_levels:
        overall = RiskLevel.WARNING
    else:
        overall = RiskLevel.NORMAL

    anomaly_count = sum(1 for r in sensor_reports if r["is_anomaly"])

    return AnomalyReport(
        overall_risk=overall.value,
        anomaly_count=anomaly_count,
        sensor_reports=sensor_reports,
        isolation_forest_scores={
            "anomaly_score": round(iso_score, 6),
            "is_outlier": iso_prediction == -1,
        },
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 2. PRODUCTION LIMIT FORECASTING
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ForecastResult:
    """30-day production forecast and EC-cap compliance verdict."""
    forecast_days: int
    cumulative_forecast_tonnes: float
    ec_cap_tonnes: float
    remaining_capacity_tonnes: float
    compliance_status: str   # "COMPLIANT" | "AT_RISK" | "EXCEEDED"
    daily_forecast: List[Dict[str, Any]] = field(default_factory=list)


def forecast_production(
    history: List[Dict[str, Any]],
    ec_cap_tonnes: float,
    forecast_days: int = 30,
) -> ForecastResult:
    """Forecast future extraction and assess EC-cap compliance.

    Uses linear trend regression with confidence bands derived from
    historical residual standard deviation. This is a lightweight
    alternative to Prophet that avoids the CmdStan dependency while
    producing comparable short-horizon forecasts.

    Args:
        history: List of dicts with keys ``date`` (ISO string) and
                 ``production_tonnes`` (float).
        ec_cap_tonnes: Environmental Clearance cap in tonnes.
        forecast_days: Number of days to forecast (default: 30).

    Returns:
        ``ForecastResult`` with daily forecast, cumulative total,
        and compliance verdict.
    """
    df = pd.DataFrame(history)
    df.rename(columns={"date": "ds", "production_tonnes": "y"}, inplace=True)
    df["ds"] = pd.to_datetime(df["ds"])
    df = df.sort_values("ds").reset_index(drop=True)

    # Historical cumulative
    historical_cumulative = float(df["y"].sum())

    # Fit linear trend: y = slope * t + intercept
    n = len(df)
    t = np.arange(n, dtype=float)
    y = df["y"].values.astype(float)

    if n >= 2:
        slope, intercept = np.polyfit(t, y, 1)
    else:
        # Single data point — assume flat production
        slope = 0.0
        intercept = float(y[0]) if n == 1 else 0.0

    # Residual standard deviation for confidence bands
    fitted = slope * t + intercept
    residuals = y - fitted
    residual_std = float(np.std(residuals)) if n >= 2 else float(np.mean(y)) * 0.1

    # Generate forecast
    last_date = df["ds"].iloc[-1]
    daily_forecast: List[Dict[str, Any]] = []
    cumulative_forecast = 0.0

    for i in range(1, forecast_days + 1):
        t_future = n + i - 1
        yhat = slope * t_future + intercept
        yhat = max(0.0, yhat)  # no negative production

        # Confidence band widens with horizon
        band = residual_std * (1 + 0.02 * i)  # slight widening over time
        lower = max(0.0, yhat - 1.96 * band)
        upper = max(0.0, yhat + 1.96 * band)

        forecast_date = last_date + pd.Timedelta(days=i)
        cumulative_forecast += yhat

        daily_forecast.append(
            {
                "date": forecast_date.strftime("%Y-%m-%d"),
                "predicted_tonnes": round(yhat, 2),
                "lower_bound": round(lower, 2),
                "upper_bound": round(upper, 2),
            }
        )

    total_projected = historical_cumulative + cumulative_forecast
    remaining = ec_cap_tonnes - total_projected

    if total_projected > ec_cap_tonnes:
        status = "EXCEEDED"
    elif remaining < (ec_cap_tonnes * 0.1):  # within 10% of cap
        status = "AT_RISK"
    else:
        status = "COMPLIANT"

    return ForecastResult(
        forecast_days=forecast_days,
        cumulative_forecast_tonnes=round(cumulative_forecast, 2),
        ec_cap_tonnes=ec_cap_tonnes,
        remaining_capacity_tonnes=round(remaining, 2),
        compliance_status=status,
        daily_forecast=daily_forecast,
    )

