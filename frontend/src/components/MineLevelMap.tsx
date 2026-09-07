import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { fetchMines, type Mine } from '../utils/regulatoryReports';
import { PageLayout } from './common/PageLayout';
import { Dropdown } from './common/Dropdown';

interface SectionLayout {
  section: number;
  polygon: [number, number][];
  centroid: [number, number];
}

interface MineLevelData {
  level: string;
  section_count: number;
  boundary: [number, number][];
  view_box: [number, number, number, number];
  sections: SectionLayout[];
}

interface LocatedIssue {
  mine_id: string;
  level: string;
  section: number;
  status: string;
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

// Caldera hex values directly, not Tailwind classes — these fill/stroke an
// SVG polygon, which can't take a `bg-*`/`text-*` utility class.
const STATUS_COLORS = {
  open: { fill: 'rgba(252,80,0,0.35)', stroke: '#fc5000', text: '#fc5000' }, // Ember
  clear: { fill: '#f7f6f2', stroke: 'rgba(7,6,7,0.15)', text: '#070607' }, // Limestone
};

const CARD_W = 700;
const CARD_H = 400;

const MULTI_MINE_ROLES = ['corporate_manager', 'regulator', 'admin'];

const pointsToPath = (points: [number, number][]): string =>
  points.length ? 'M' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z' : '';

function buildRenderLayout(level: MineLevelData, openSections: Set<number>) {
  const [viewMinX, viewMinY, viewWidth, viewHeight] = level.view_box;
  const boundaryPath = pointsToPath(level.boundary);

  const cells: Cell[] = level.sections.map((section) => {
    const status = openSections.has(section.section) ? 'open' : 'clear';
    const colors = STATUS_COLORS[status];
    return {
      key: `${level.level}-${section.section}`,
      num: section.section,
      pathD: pointsToPath(section.polygon),
      leftPct: (((section.centroid[0] - viewMinX) / viewWidth) * 100).toFixed(2) + '%',
      topPct: (((section.centroid[1] - viewMinY) / viewHeight) * 100).toFixed(2) + '%',
      fill: colors.fill,
      stroke: colors.stroke,
      strokeWidth: 1.5,
      textColor: colors.text,
    };
  });

  const containScale = Math.min(CARD_W / viewWidth, CARD_H / viewHeight);
  const fitW = viewWidth * containScale;
  const fitH = viewHeight * containScale;

  return {
    cells,
    boundaryPath,
    viewBox: `${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`,
    fitWPct: ((fitW / CARD_W) * 100).toFixed(3) + '%',
    fitHPct: ((fitH / CARD_H) * 100).toFixed(3) + '%',
  };
}

export const MineLevelMap = () => {
  const user = useAuthStore((state) => state.user);
  const needsMinePicker = user?.role ? MULTI_MINE_ROLES.includes(user.role) : false;

  const [mines, setMines] = useState<Mine[]>([]);
  const [selectedMineId, setSelectedMineId] = useState('');
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

  // Multi-mine roles pick a mine first; single-mine roles skip this entirely.
  useEffect(() => {
    if (!needsMinePicker) return;
    fetchMines()
      .then((data) => {
        setMines(data);
        setSelectedMineId((current) => current || data[0]?.id || '');
      })
      .catch(() => setMines([]));
  }, [needsMinePicker]);

  useEffect(() => {
    if (needsMinePicker && !selectedMineId) return;

    const params = needsMinePicker ? { mine_id: selectedMineId } : undefined;

    const loadLevels = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get<MineLevelData[]>('/mine-levels', { params });
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
          // Keyed by mine too — level+section numbers can repeat across
          // different mines, so this must not collapse issues from other
          // mines onto whichever mine is currently selected.
          if (issue.status === 'open') open.add(`${issue.mine_id}-${issue.level}-${issue.section}`);
        }
        setOpenLocations(open);
      } catch {
        setOpenLocations(new Set());
      }
    };
    loadLevels();
    loadOpenIssues();
  }, [needsMinePicker, selectedMineId]);

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
    if (!selectedLevel || (needsMinePicker && !selectedMineId)) return set;
    const mineId = needsMinePicker ? selectedMineId : null;
    for (const key of openLocations) {
      const [keyMineId, lvl, sec] = key.split('-');
      if (mineId && keyMineId !== mineId) continue;
      if (lvl === selectedLevel) set.add(Number(sec));
    }
    return set;
  }, [openLocations, selectedLevel, selectedMineId, needsMinePicker]);

  const layout = useMemo(() => {
    if (!activeLevel) return null;
    return buildRenderLayout(activeLevel, openSectionsForLevel);
  }, [activeLevel, openSectionsForLevel]);

  const selectedCell = layout?.cells.find((c) => c.key === selectedKey) || null;

  return (
    <PageLayout title="Mine Level Map" subtitle="Underground layout by level and section" badge="Live Layout">
      <div className="space-y-4 mt-4">
        {needsMinePicker && (
          <div className="max-w-xs">
            <Dropdown
              value={selectedMineId}
              onChange={(v) => { setSelectedMineId(v); setSelectedLevel(null); setSelectedKey(null); }}
              options={mines.map((mine) => ({ value: mine.id, label: mine.name }))}
              placeholder="Select a mine..."
            />
          </div>
        )}

        {isLoading && <p className="text-sm font-mono text-obsidian/60">Loading mine layout…</p>}
        {!isLoading && sortedLevels.length === 0 && (
          <p className="text-sm font-mono text-obsidian/60">No levels configured for this mine yet.</p>
        )}

        <div className="flex gap-2 flex-wrap">
          {sortedLevels.map((lvl) => {
            const active = lvl.level === selectedLevel;
            return (
              <button
                key={lvl.level}
                onClick={() => { setSelectedLevel(lvl.level); setSelectedKey(null); setPan({ x: 0, y: 0 }); }}
                className={`cursor-pointer font-bold text-[11px] uppercase tracking-wide px-4 py-2 rounded-pill flex flex-col items-start gap-0.5 transition-colors ${
                  active ? 'bg-ember text-chalk' : 'bg-limestone text-obsidian/60 hover:bg-chalk'
                }`}
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
              <button onClick={() => setZoom((z) => Math.max(z - 25, 50))} className="cursor-pointer w-6.5 h-6.5 bg-pumice border border-obsidian/10 text-obsidian/60 font-mono font-bold text-sm rounded-sm hover:text-ember hover:border-ember/50">–</button>
              <span className="min-w-10.5 text-center font-mono text-[11px] text-obsidian/60 leading-6.5">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(z + 25, 250))} className="cursor-pointer w-6.5 h-6.5 bg-pumice border border-obsidian/10 text-obsidian/60 font-mono font-bold text-sm rounded-sm hover:text-ember hover:border-ember/50">+</button>
            </div>

            <div
              onPointerDown={startPan}
              className="relative w-full mx-auto overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing select-none bg-limestone"
              style={{ maxWidth: 700, aspectRatio: '700 / 400', touchAction: 'none' }}
            >
              <div
                className="absolute top-1/2 left-1/2"
                style={{
                  width: layout.fitWPct, height: layout.fitHPct,
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                }}
              >
                <svg viewBox={layout.viewBox} className="absolute inset-0 w-full h-full block">
                  <path d={layout.boundaryPath} fill="#e2e2df" stroke="#070607" strokeOpacity={0.15} strokeWidth={3} />
                  {layout.cells.map((cell) => (
                    <path
                      key={cell.key}
                      d={cell.pathD}
                      fill={cell.fill}
                      stroke={selectedKey === cell.key ? '#fc5000' : cell.stroke}
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

        <div className="flex gap-4 flex-wrap items-center font-mono text-[11px] text-obsidian/60 bg-pumice border border-obsidian/10 px-3.5 py-2.5 rounded">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-ember inline-block" />Open issue</span>
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-limestone border border-obsidian/15 inline-block" />Clear</span>
        </div>

        <div className="bg-limestone rounded-2xl px-4.5 py-3.5 flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 inline-block"
            style={{ background: selectedCell ? selectedCell.stroke : '#e2e2df' }}
          />
          <div>
            <div className="font-display text-xs tracking-wide text-obsidian">
              {selectedCell ? `LEVEL ${selectedLevel} · SECTION ${selectedCell.num}` : 'NO SECTION SELECTED'}
            </div>
            <div className="text-xs text-obsidian/50 mt-0.5">
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
