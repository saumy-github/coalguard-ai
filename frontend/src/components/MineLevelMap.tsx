import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../utils/api';
import { PageLayout } from './common/PageLayout';

interface MineLevelData {
  level: string;
  section_count: number;
}

interface LocatedIssue {
  level: string;
  section: number;
  status: string;
}

interface Point {
  x: number;
  y: number;
}

interface Cell {
  key: string;
  num: number;
  pathD: string;
  leftPct: string;
  topPct: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textColor: string;
}

const STATUS_COLORS = {
  open: { fill: 'rgba(220,38,38,0.32)', stroke: '#dc2626', text: '#fca5a5' },
  clear: { fill: '#221b14', stroke: 'rgba(245,158,11,0.45)', text: '#c4bcae' },
};

const CARD_W = 700;
const CARD_H = 400;

// Deterministic pseudo-random, seeded by level + index — shapes stay stable across
// re-renders/reloads instead of reshuffling every time (a real "saved layout" would
// eventually persist these seeds/positions server-side; see backend discussion).
const rand = (seed: number) => {
  const x = Math.sin(seed * 99991 + 12345) * 43758.5453;
  return x - Math.floor(x);
};

const hullOf = (pts: Point[]): Point[] => {
  const s = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of s) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let k = s.length - 1; k >= 0; k--) {
    const p = s[k];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
};

const clipHalfPlane = (poly: Point[], dist: (p: Point) => number): Point[] => {
  const out: Point[] = [];
  for (let k = 0; k < poly.length; k++) {
    const curr = poly[k];
    const prev = poly[(k - 1 + poly.length) % poly.length];
    const dCurr = dist(curr);
    const dPrev = dist(prev);
    const currIn = dCurr <= 0;
    const prevIn = dPrev <= 0;
    if (currIn !== prevIn) {
      const t = dPrev / (dPrev - dCurr);
      out.push({ x: prev.x + t * (curr.x - prev.x), y: prev.y + t * (curr.y - prev.y) });
    }
    if (currIn) out.push(curr);
  }
  return out;
};

const polyCentroid = (poly: Point[]): Point => {
  let area = 0, cx = 0, cy = 0;
  for (let k = 0; k < poly.length; k++) {
    const p1 = poly[k], p2 = poly[(k + 1) % poly.length];
    const cr = p1.x * p2.y - p2.x * p1.y;
    area += cr;
    cx += (p1.x + p2.x) * cr;
    cy += (p1.y + p2.y) * cr;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-6) {
    const n = poly.length || 1;
    return { x: poly.reduce((a, p) => a + p.x, 0) / n, y: poly.reduce((a, p) => a + p.y, 0) / n };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
};

// Jitter/shape irregularity — fixed here since there's no tweak panel in the real app.
// Raise toward 1 for a rougher "real mine" look, lower toward 0 for a tidier grid feel.
const JITTER = 0.6;

function buildLayout(level: string, count: number, openSections: Set<number>) {
  const cols = Math.max(3, Math.round(Math.sqrt(count * 1.7)));
  const spacingX = 96, spacingY = 88, pad = 56;

  const sites: { i: number; cx: number; cy: number; seed: number }[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const idxInRow = i % cols;
    const col = row % 2 === 0 ? idxInRow : cols - 1 - idxInRow;
    const seed = level.charCodeAt(0) * 1000 + i * 7;
    const rx = (rand(seed) - 0.5) * spacingX * 0.55 * JITTER;
    const ry = (rand(seed + 1) - 0.5) * spacingY * 0.55 * JITTER;
    sites.push({ i, cx: col * spacingX + pad + rx, cy: row * spacingY + pad + ry, seed });
  }

  const hull = hullOf(sites.map((s) => ({ x: s.cx, y: s.cy })));
  const hcx = hull.reduce((a, p) => a + p.x, 0) / hull.length;
  const hcy = hull.reduce((a, p) => a + p.y, 0) / hull.length;
  const margin = ((spacingX + spacingY) / 2) * 0.55;

  const segPerEdge = 3;
  const ring: Point[] = [];
  for (let e = 0; e < hull.length; e++) {
    const a = hull[e], b = hull[(e + 1) % hull.length];
    for (let t = 0; t < segPerEdge; t++) ring.push({ x: a.x + (b.x - a.x) * (t / segPerEdge), y: a.y + (b.y - a.y) * (t / segPerEdge) });
  }
  const boundary = ring.map((p, idx) => {
    const dx = p.x - hcx, dy = p.y - hcy;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const bSeed = level.charCodeAt(0) * 97 + idx * 31;
    const extra = margin * (0.5 + rand(bSeed) * 0.9) * Math.max(JITTER, 0.25);
    const outDist = dist + margin * 0.4 + extra;
    return { x: hcx + ux * outDist, y: hcy + uy * outDist };
  });

  const viewMinX = Math.min(...boundary.map((p) => p.x)) - 8;
  const viewMinY = Math.min(...boundary.map((p) => p.y)) - 8;
  const viewMaxX = Math.max(...boundary.map((p) => p.x)) + 8;
  const viewMaxY = Math.max(...boundary.map((p) => p.y)) + 8;
  const viewWidth = viewMaxX - viewMinX;
  const viewHeight = viewMaxY - viewMinY;
  const boundaryPath = 'M' + boundary.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L') + 'Z';

  const voronoiCell = (site: { i: number; cx: number; cy: number }) => {
    let poly: Point[] = boundary;
    for (const other of sites) {
      if (other.i === site.i) continue;
      const midx = (site.cx + other.cx) / 2, midy = (site.cy + other.cy) / 2;
      const dx = other.cx - site.cx, dy = other.cy - site.cy;
      poly = clipHalfPlane(poly, (p) => (p.x - midx) * dx + (p.y - midy) * dy);
      if (poly.length === 0) break;
    }
    return poly;
  };

  const cells: Cell[] = sites.map((site) => {
    const poly = voronoiCell(site);
    const pathD = poly.length ? 'M' + poly.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L') + 'Z' : '';
    const label = poly.length ? polyCentroid(poly) : { x: site.cx, y: site.cy };
    const num = site.i + 1;
    const status = openSections.has(num) ? 'open' : 'clear';
    const colors = STATUS_COLORS[status];
    return {
      key: `${level}-${num}`,
      num,
      pathD,
      leftPct: (((label.x - viewMinX) / viewWidth) * 100).toFixed(2) + '%',
      topPct: (((label.y - viewMinY) / viewHeight) * 100).toFixed(2) + '%',
      fill: colors.fill,
      stroke: colors.stroke,
      strokeWidth: 1.5,
      textColor: colors.text,
    };
  });

  const containScale = Math.min(CARD_W / viewWidth, CARD_H / viewHeight);
  const fitW = viewWidth * containScale, fitH = viewHeight * containScale;

  return {
    cells,
    boundaryPath,
    viewBox: `${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`,
    fitWPct: ((fitW / CARD_W) * 100).toFixed(3) + '%',
    fitHPct: ((fitH / CARD_H) * 100).toFixed(3) + '%',
  };
}

export const MineLevelMap = () => {
  const [levels, setLevels] = useState<MineLevelData[]>([]);
  const [openLocations, setOpenLocations] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; panX: number; panY: number }>({
    dragging: false, startX: 0, startY: 0, panX: 0, panY: 0,
  });

  useEffect(() => {
    const loadLevels = async () => {
      try {
        const { data } = await api.get<MineLevelData[]>('/mine-levels');
        setLevels(data);
        if (data.length) setSelectedLevel([...data].sort((a, b) => a.level.localeCompare(b.level))[0].level);
      } finally {
        setIsLoading(false);
      }
    };
    const loadOpenIssues = async () => {
      try {
        const [personIssues, siteIssues] = await Promise.all([
          api.get<LocatedIssue[]>('/person-issues'),
          api.get<LocatedIssue[]>('/site-issues'),
        ]);
        const open = new Set<string>();
        for (const issue of [...personIssues.data, ...siteIssues.data]) {
          if (issue.status === 'open') open.add(`${issue.level}-${issue.section}`);
        }
        setOpenLocations(open);
      } catch {
        setOpenLocations(new Set());
      }
    };
    loadLevels();
    loadOpenIssues();
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      setPan({ x: dragRef.current.panX + (e.clientX - dragRef.current.startX), y: dragRef.current.panY + (e.clientY - dragRef.current.startY) });
    };
    const onUp = () => { dragRef.current.dragging = false; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const startPan = (e: React.PointerEvent) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };

  const sortedLevels = useMemo(() => [...levels].sort((a, b) => a.level.localeCompare(b.level)), [levels]);
  const activeLevel = sortedLevels.find((l) => l.level === selectedLevel);

  const openSectionsForLevel = useMemo(() => {
    const set = new Set<number>();
    if (!selectedLevel) return set;
    for (const key of openLocations) {
      const [lvl, sec] = key.split('-');
      if (lvl === selectedLevel) set.add(Number(sec));
    }
    return set;
  }, [openLocations, selectedLevel]);

  const layout = useMemo(() => {
    if (!activeLevel) return null;
    return buildLayout(activeLevel.level, activeLevel.section_count, openSectionsForLevel);
  }, [activeLevel, openSectionsForLevel]);

  const selectedCell = layout?.cells.find((c) => c.key === selectedKey) || null;

  return (
    <PageLayout title="Mine Level Map" subtitle="Underground layout by level and section" badge="Live Layout">
      <div className="space-y-4 mt-4">
        {isLoading && <p className="text-sm font-mono text-slate-400">Loading mine layout…</p>}
        {!isLoading && sortedLevels.length === 0 && (
          <p className="text-sm font-mono text-slate-400">No levels configured for this mine yet.</p>
        )}

        <div className="flex gap-2 flex-wrap">
          {sortedLevels.map((lvl) => {
            const active = lvl.level === selectedLevel;
            return (
              <button
                key={lvl.level}
                onClick={() => { setSelectedLevel(lvl.level); setSelectedKey(null); setPan({ x: 0, y: 0 }); }}
                className="cursor-pointer font-sora font-bold text-[11px] uppercase tracking-wide px-3.5 py-2 rounded-sm flex flex-col items-start gap-0.5"
                style={{
                  background: active ? '#f59e0b' : 'rgba(255,255,255,0.03)',
                  color: active ? '#110d0a' : '#a1a1aa',
                  border: active ? '1px solid #d97706' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <span>LEVEL {lvl.level}</span>
                <span className="font-mono font-medium text-[9px] opacity-75 normal-case tracking-normal">{lvl.section_count} sections</span>
              </button>
            );
          })}
        </div>

        {layout && (
          <>
            <div className="flex justify-end gap-1.5">
              <button onClick={() => setZoom((z) => Math.max(z - 25, 50))} className="cursor-pointer w-6.5 h-6.5 bg-white/3 border border-white/10 text-slate-400 font-mono font-bold text-sm rounded-sm hover:text-amber-500 hover:border-amber-500/50">–</button>
              <span className="min-w-10.5 text-center font-mono text-[11px] text-stone-400 leading-6.5">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(z + 25, 250))} className="cursor-pointer w-6.5 h-6.5 bg-white/3 border border-white/10 text-slate-400 font-mono font-bold text-sm rounded-sm hover:text-amber-500 hover:border-amber-500/50">+</button>
            </div>

            <div
              onPointerDown={startPan}
              className="relative w-full mx-auto overflow-hidden rounded cursor-grab active:cursor-grabbing select-none"
              style={{
                maxWidth: 700, aspectRatio: '700 / 400', touchAction: 'none',
                background: 'linear-gradient(145deg, rgba(31,24,19,0.8), rgba(20,15,12,0.95))',
                borderTop: '1px solid rgba(245,158,11,0.15)', borderLeft: '1px solid rgba(245,158,11,0.08)',
                borderRight: '1px solid rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(0,0,0,0.8)',
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.8)',
              }}
            >
              <div
                className="absolute top-1/2 left-1/2"
                style={{
                  width: layout.fitWPct, height: layout.fitHPct,
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                }}
              >
                <svg viewBox={layout.viewBox} className="absolute inset-0 w-full h-full block" style={{ filter: 'drop-shadow(0 16px 26px rgba(0,0,0,0.65))' }}>
                  <path d={layout.boundaryPath} fill="#171310" stroke="#f59e0b" strokeWidth={3} strokeOpacity={0.85} />
                  {layout.cells.map((cell) => (
                    <path
                      key={cell.key}
                      d={cell.pathD}
                      fill={cell.fill}
                      stroke={selectedKey === cell.key ? '#f59e0b' : cell.stroke}
                      strokeWidth={selectedKey === cell.key ? 4 : cell.strokeWidth}
                      className="cursor-pointer hover:brightness-125"
                      onClick={() => setSelectedKey(cell.key)}
                    />
                  ))}
                </svg>
                {layout.cells.map((cell) => (
                  <div
                    key={cell.key}
                    onClick={() => setSelectedKey(cell.key)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer font-mono font-bold text-[11px] select-none"
                    style={{ left: cell.leftPct, top: cell.topPct, color: cell.textColor }}
                  >
                    {cell.num}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex gap-4 flex-wrap items-center font-mono text-[11px] text-stone-400 bg-white/3 border border-white/6 px-3.5 py-2.5 rounded">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />Open issue</span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-white/20 inline-block" />Clear</span>
        </div>

        <div className="bg-linear-to-br from-[rgba(31,24,19,0.8)] to-[rgba(20,15,12,0.95)] border border-white/6 rounded px-4.5 py-3.5 flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
            style={{ background: selectedCell ? selectedCell.stroke : 'rgba(255,255,255,0.2)' }}
          />
          <div>
            <div className="font-sora font-bold text-xs tracking-wide text-[#f5f1ec]">
              {selectedCell ? `LEVEL ${selectedLevel} · SECTION ${selectedCell.num}` : 'NO SECTION SELECTED'}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {selectedCell
                ? (openSectionsForLevel.has(selectedCell.num) ? 'Open issue reported at this section' : 'No issues reported')
                : 'Click a section on the map to view its status.'}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
