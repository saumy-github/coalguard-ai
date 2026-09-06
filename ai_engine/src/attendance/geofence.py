"""
Geofencing Utility
==================
Calculates the great-circle distance (in metres) between two GPS coordinates
using the Haversine formula and enforces a configurable site radius.

Constants:
    GEOFENCE_RADIUS_M   — Hard limit enforced by the attendance endpoint (100 m).
"""

from __future__ import annotations

import math

# Strict on-site boundary enforced on every attendance mark attempt.
GEOFENCE_RADIUS_M: float = 100.0


def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Return the great-circle distance in **metres** between two GPS points.

    Args:
        lat1: Latitude of point A  (decimal degrees).
        lon1: Longitude of point A (decimal degrees).
        lat2: Latitude of point B  (decimal degrees).
        lon2: Longitude of point B (decimal degrees).

    Returns:
        Distance in metres (float).
    """
    R = 6_371_000.0  # Earth radius in metres

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def is_within_geofence(
    user_lat: float,
    user_lon: float,
    site_lat: float,
    site_lon: float,
    radius_m: float = GEOFENCE_RADIUS_M,
) -> tuple[bool, float]:
    """Check whether the user's GPS position lies within the site geofence.

    Args:
        user_lat: User latitude  (decimal degrees).
        user_lon: User longitude (decimal degrees).
        site_lat: Site latitude  (decimal degrees).
        site_lon: Site longitude (decimal degrees).
        radius_m: Geofence radius in metres (default: 100 m).

    Returns:
        Tuple of (within_fence: bool, distance_metres: float).
    """
    dist = haversine_distance(user_lat, user_lon, site_lat, site_lon)
    return (dist <= radius_m, round(dist, 2))
