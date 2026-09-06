"""
Generates a mine level's section layout (boundary + per-section polygons) —
ported from the algorithm that used to live entirely in
frontend/src/components/MineLevelMap.tsx, run once here instead of on every
client render. Deliberately schematic, not real surveyed geometry.
"""

import math

Point = tuple[float, float]

JITTER = 0.6


def _rand(seed: float) -> float:
    x = math.sin(seed * 99991 + 12345) * 43758.5453
    return x - math.floor(x)


def _hull_of(points: list[Point]) -> list[Point]:
    pts = sorted(points)

    def cross(o: Point, a: Point, b: Point) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower: list[Point] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    upper: list[Point] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    lower.pop()
    upper.pop()
    return lower + upper


def _clip_half_plane(poly: list[Point], dist) -> list[Point]:
    out: list[Point] = []
    n = len(poly)
    for k in range(n):
        curr = poly[k]
        prev = poly[(k - 1) % n]
        d_curr = dist(curr)
        d_prev = dist(prev)
        curr_in = d_curr <= 0
        prev_in = d_prev <= 0
        if curr_in != prev_in:
            t = d_prev / (d_prev - d_curr)
            out.append((prev[0] + t * (curr[0] - prev[0]), prev[1] + t * (curr[1] - prev[1])))
        if curr_in:
            out.append(curr)
    return out


def _poly_centroid(poly: list[Point]) -> Point:
    area = 0.0
    cx = 0.0
    cy = 0.0
    n = len(poly)
    for k in range(n):
        p1, p2 = poly[k], poly[(k + 1) % n]
        cr = p1[0] * p2[1] - p2[0] * p1[1]
        area += cr
        cx += (p1[0] + p2[0]) * cr
        cy += (p1[1] + p2[1]) * cr
    area *= 0.5
    if abs(area) < 1e-6:
        n2 = max(len(poly), 1)
        return (sum(p[0] for p in poly) / n2, sum(p[1] for p in poly) / n2)
    return (cx / (6 * area), cy / (6 * area))


def generate_level_layout(level: str, count: int) -> dict:
    cols = max(3, round(math.sqrt(count * 1.7)))
    spacing_x, spacing_y, pad = 96.0, 88.0, 56.0

    sites = []
    for i in range(count):
        row = i // cols
        idx_in_row = i % cols
        col = idx_in_row if row % 2 == 0 else cols - 1 - idx_in_row
        seed = ord(level[0]) * 1000 + i * 7
        rx = (_rand(seed) - 0.5) * spacing_x * 0.55 * JITTER
        ry = (_rand(seed + 1) - 0.5) * spacing_y * 0.55 * JITTER
        sites.append({"i": i, "cx": col * spacing_x + pad + rx, "cy": row * spacing_y + pad + ry})

    hull = _hull_of([(s["cx"], s["cy"]) for s in sites])
    hcx = sum(p[0] for p in hull) / len(hull)
    hcy = sum(p[1] for p in hull) / len(hull)
    margin = ((spacing_x + spacing_y) / 2) * 0.55

    seg_per_edge = 3
    ring: list[Point] = []
    for e in range(len(hull)):
        a, b = hull[e], hull[(e + 1) % len(hull)]
        for t in range(seg_per_edge):
            frac = t / seg_per_edge
            ring.append((a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac))

    boundary: list[Point] = []
    for idx, p in enumerate(ring):
        dx, dy = p[0] - hcx, p[1] - hcy
        dist = math.hypot(dx, dy) or 1
        ux, uy = dx / dist, dy / dist
        b_seed = ord(level[0]) * 97 + idx * 31
        extra = margin * (0.5 + _rand(b_seed) * 0.9) * max(JITTER, 0.25)
        out_dist = dist + margin * 0.4 + extra
        boundary.append((hcx + ux * out_dist, hcy + uy * out_dist))

    def voronoi_cell(site: dict) -> list[Point]:
        poly = boundary
        for other in sites:
            if other["i"] == site["i"]:
                continue
            midx = (site["cx"] + other["cx"]) / 2
            midy = (site["cy"] + other["cy"]) / 2
            dx = other["cx"] - site["cx"]
            dy = other["cy"] - site["cy"]
            poly = _clip_half_plane(poly, lambda p, midx=midx, midy=midy, dx=dx, dy=dy: (p[0] - midx) * dx + (p[1] - midy) * dy)
            if not poly:
                break
        return poly

    sections = []
    for site in sites:
        poly = voronoi_cell(site)
        centroid = _poly_centroid(poly) if poly else (site["cx"], site["cy"])
        sections.append(
            {
                "section": site["i"] + 1,
                "polygon": [[round(p[0], 2), round(p[1], 2)] for p in poly],
                "centroid": [round(centroid[0], 2), round(centroid[1], 2)],
            }
        )

    xs = [p[0] for p in boundary]
    ys = [p[1] for p in boundary]
    view_min_x, view_min_y = min(xs) - 8, min(ys) - 8
    view_max_x, view_max_y = max(xs) + 8, max(ys) + 8

    return {
        "boundary": [[round(p[0], 2), round(p[1], 2)] for p in boundary],
        "view_box": [
            round(view_min_x, 2),
            round(view_min_y, 2),
            round(view_max_x - view_min_x, 2),
            round(view_max_y - view_min_y, 2),
        ],
        "sections": sections,
    }
