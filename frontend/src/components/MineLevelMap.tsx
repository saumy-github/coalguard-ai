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

const STATUS_COLORS = {
  open: { fill: 'rgba(239,68,68,0.2)', stroke: '#ef4444', text: '#fca5a5' },
  clear: { fill: '#18181b', stroke: '#3f3f46', text: '#a1a1aa' },
};

const CARD_W = 700;
const CARD_H = 400;

const MULTI_MINE_ROLES = ['corporate_manager', 'regulator', 'admin'];

const pointsToPath = (points: [number, number][]): string =>
  points.length ? 'M' + points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z' : '';

function buildRenderLayout(level: MineLevelData, openSections: Set<number>) {
  if (!level.view_box || level.view_box.length < 4 || !level.sections) {
    return null;
  }
  const [viewMinX, viewMinY, viewWidth, viewHeight] = level.view_box;
  if (!viewWidth || !viewHeight) return null;
  const boundaryPath = pointsToPath(level.boundary || []);

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
      } catch (err) {
        console.error('Failed to load mine levels:', err);
        setLevels([]);
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
    <PageLayout title="Mine Level Map" subtitle="Interactive underground layout by level and section" badge="Live Layout">
      <div className="space-y-6 mt-2">
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

        {isLoading && <p className="text-sm font-mono text-zinc-500">Loading mine layout…</p>}
        {!isLoading && sortedLevels.length === 0 && (
          <p className="text-sm font-mono text-zinc-500">No levels configured for this mine yet.</p>
        )}

        <div className="flex gap-2.5 flex-wrap">
          {sortedLevels.map((lvl) => {
            const active = lvl.level === selectedLevel;
            return (
              <button
                key={lvl.level}
                onClick={() => { setSelectedLevel(lvl.level); setSelectedKey(null); setPan({ x: 0, y: 0 }); }}
                className="cursor-pointer font-bold text-[11px] uppercase tracking-widest px-4 py-2.5 rounded-xl flex flex-col items-start gap-1 transition-all"
                style={{
                  background: active ? '#ffffff' : 'rgba(0,0,0,0.2)',
                  color: active ? '#18181b' : '#a1a1aa',
                  border: active ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: active ? '0 4px 15px rgba(255,255,255,0.1)' : 'none'
                }}
              >
                <span>LEVEL {lvl.level}</span>
                <span className={`font-mono font-medium text-[9px] ${active ? 'opacity-80' : 'opacity-60'} normal-case tracking-normal`}>
                  {lvl.section_count} sections
                </span>
              </button>
            );
          })}
        </div>

        {layout && (
          <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2rem] p-6 sm:p-8 border border-white/5 shadow-xl">
            <div className="flex justify-between items-center gap-3 flex-wrap mb-6">

              <div className="flex gap-4 flex-wrap items-center font-mono text-[11px] text-zinc-400 bg-black/30 border border-white/5 px-4 py-2.5 rounded-xl">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-[0_0_10px_rgba(239,68,68,0.5)]" />Active Issue</span>
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-zinc-600 inline-block" />Clear</span>
              </div>

              <div className="flex gap-1.5 items-center bg-black/30 border border-white/5 rounded-xl p-1">
                <button onClick={() => setZoom((z) => Math.max(z - 25, 50))} className="cursor-pointer w-8 h-8 flex items-center justify-center text-zinc-400 font-mono font-bold text-lg rounded-lg hover:bg-white/10 hover:text-white transition-colors">–</button>
                <span className="min-w-[3.5rem] text-center font-mono font-bold text-[11px] text-zinc-300">{zoom}%</span>
                <button onClick={() => setZoom((z) => Math.min(z + 25, 250))} className="cursor-pointer w-8 h-8 flex items-center justify-center text-zinc-400 font-mono font-bold text-lg rounded-lg hover:bg-white/10 hover:text-white transition-colors">+</button>
              </div>

            </div>

            <div
              onPointerDown={startPan}
              className="relative w-full mx-auto overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing select-none transition-shadow"
              style={{
                maxWidth: 700, aspectRatio: '700 / 400', touchAction: 'none',
                background: 'linear-gradient(145deg, #18181b, #09090b)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                borderLeft: '1px solid rgba(255,255,255,0.03)',
                boxShadow: 'inset 0 10px 40px -10px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.4)',
              }}
            >
              {/* Subtle map grid background */}
              <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
              ></div>

              <div
                className="absolute top-1/2 left-1/2"
                style={{
                  width: layout.fitWPct, height: layout.fitHPct,
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                }}
              >
                <svg viewBox={layout.viewBox} className="absolute inset-0 w-full h-full block" style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.8))' }}>
                  <path d={layout.boundaryPath} fill="#000000" stroke="#71717a" strokeWidth={3} strokeOpacity={0.8} />
                  {layout.cells.map((cell) => (
                    <path
                      key={cell.key}
                      d={cell.pathD}
                      fill={cell.fill}
                      stroke={selectedKey === cell.key ? '#ffffff' : cell.stroke}
                      strokeWidth={selectedKey === cell.key ? 4 : cell.strokeWidth}
                      className="cursor-pointer transition-colors duration-300"
                      onClick={() => setSelectedKey(cell.key)}
                      style={{ filter: selectedKey === cell.key ? 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' : 'none' }}
                    />
                  ))}
                </svg>
                {layout.cells.map((cell) => (
                  <div
                    key={cell.key}
                    onClick={() => setSelectedKey(cell.key)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer font-mono font-bold text-[11px] select-none pointer-events-none"
                    style={{ left: cell.leftPct, top: cell.topPct, color: selectedKey === cell.key ? '#ffffff' : cell.textColor }}
                  >
                    {cell.num}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-black/20 border border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-inner">
              <span
                className="w-3 h-3 rounded-full shrink-0 inline-block shadow-md"
                style={{ background: selectedCell ? selectedCell.stroke : 'rgba(255,255,255,0.1)' }}
              />
              <div>
                <div className="font-bold text-sm tracking-wide text-white">
                  {selectedCell ? `LEVEL ${selectedLevel} · SECTION ${selectedCell.num}` : 'NO SECTION SELECTED'}
                </div>
                <div className="text-sm font-mono text-zinc-500 mt-1">
                  {selectedCell
                    ? (openSectionsForLevel.has(selectedCell.num) ? 'Critical: Open issue reported at this section.' : 'Status: Clear (No issues reported)')
                    : 'Select a section on the map to view detailed status.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};
