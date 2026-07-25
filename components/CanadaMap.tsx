import React, { useState } from 'react';
import {
  MAP_VIEWBOX,
  PROVINCE_PATHS,
  PROVINCE_LABEL_ANCHORS,
  PROVINCE_RENDERED_AREA,
} from './canadaGeography';

/**
 * A choropleth of Canada.
 *
 * Geometry is real province boundaries projected with a Lambert Conformal
 * Conic projection (see scripts/generate-map-paths.mjs), replacing the
 * hand-approximated coordinates this component used to carry.
 *
 * It also handles data *coverage*, where the important state is not "low value"
 * but "no data at all". Those two look identical on a normal choropleth — both
 * end up pale — which would quietly misrepresent a gap in the corpus as a real
 * finding. So `available: false` regions render with a hatch pattern and are
 * excluded from the colour scale entirely.
 */
export interface RegionDatum {
  id: string;
  name: string;
  /** Drives the colour ramp. Ignored when `available` is false. */
  value: number;
  /** Formatted value shown in the tooltip, e.g. "24,002 decisions". */
  primaryLabel: string;
  /** Optional second tooltip line, e.g. coverage years. */
  secondaryLabel?: string;
  /** False = jurisdiction not present in the dataset. */
  available: boolean;
}

interface CanadaMapProps {
  data: Map<string, RegionDatum>;
  selectedId: string;
  onSelect: (id: string) => void;
  /** Upper bound of the colour ramp. Defaults to the max value in `data`. */
  maxValue?: number;
  /** Shown when hovering a region flagged unavailable. */
  unavailableNote?: string;
}

const PROVINCE_NAMES: Record<string, string> = {
  '1': 'Alberta',
  '2': 'British Columbia',
  '3': 'Manitoba',
  '4': 'New Brunswick',
  '5': 'Newfoundland & Lab.',
  '6': 'Nova Scotia',
  '7': 'Ontario',
  '8': 'P.E.I.',
  '9': 'Quebec',
  '10': 'Saskatchewan',
  '11': 'N.W.T.',
  '12': 'Nunavut',
  '13': 'Yukon',
};

const ABBREV: Record<string, string> = {
  '1': 'AB', '2': 'BC', '3': 'MB', '4': 'NB', '5': 'NL', '6': 'NS', '7': 'ON',
  '8': 'PE', '9': 'QC', '10': 'SK', '11': 'NT', '12': 'NU', '13': 'YT',
};

/**
 * Callouts for provinces too small to hold a label at this scale.
 *
 * Nova Scotia is a narrow peninsula (its centroid sits ~2.6px from a coastline)
 * and PEI renders at ~107px², so both need their labels in open water. New
 * Brunswick is roomy enough (~12.6px clearance) and keeps an inline label.
 *
 * The leader routes are not eyeballed — they were checked against every
 * province ring with a segment-intersection test, because the obvious
 * left-to-right routes all cut straight through Nova Scotia. PEI in particular
 * has only one clean exit: due north through the ~13px channel between
 * Newfoundland island (which ends at y≈465) and Cape Breton (which starts at
 * y≈478), then east. Moving these points by hand risks a leader crossing land,
 * so re-run that check if you change them.
 */
const CALLOUTS: Record<string, { label: [number, number]; leader: string }> = {
  // Prince Edward Island — north through the Newfoundland/Cape Breton channel.
  '8': { label: [854, 471], leader: '745,500 745,471 848,471' },
  // Nova Scotia — south-east into the open Atlantic.
  '6': { label: [854, 540], leader: '748,524 848,540' },
};

/** Below this rendered area a province gets no inline label. */
const INLINE_LABEL_MIN_AREA = 1200;

/** Small provinces get smaller type so the label stays within the shape. */
const SMALL_LABEL_MAX_AREA = 4000;

const RAMP = ['#dbeafe', '#93c5fd', '#60a5fa', '#2563eb', '#1e3a8a'];

const CanadaMap: React.FC<CanadaMapProps> = ({
  data,
  selectedId,
  onSelect,
  maxValue,
  unavailableNote = 'Not in this dataset',
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const allRegions: RegionDatum[] = [];
  data.forEach(d => allRegions.push(d));
  const available = allRegions.filter(d => d.available);
  const ceiling =
    maxValue ?? (available.length ? Math.max(...available.map(d => d.value)) : 0);

  // Sequential blue ramp on a square-root scale: decision volume is heavily
  // skewed (BC Supreme Court alone is roughly half the provincial corpus), and
  // a linear ramp would render everything except the largest jurisdiction as
  // the same pale wash.
  const rampIndex = (value: number) => {
    if (ceiling <= 0 || value <= 0) return -1;
    const t = Math.sqrt(value / ceiling);
    return Math.min(RAMP.length - 1, Math.floor(t * RAMP.length));
  };

  const getFill = (id: string) => {
    const d = data.get(id);
    if (!d || !d.available) return 'url(#unavailableHatch)';
    const i = rampIndex(d.value);
    return i < 0 ? '#eff6ff' : RAMP[i];
  };

  // Keep label text legible against whatever sits underneath it.
  const labelColor = (id: string) => {
    const d = data.get(id);
    if (!d || !d.available) return '#94a3b8';
    return rampIndex(d.value) >= 3 ? '#ffffff' : '#1e293b';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const hoverData = hoveredId
    ? data.get(hoveredId) ?? {
        id: hoveredId,
        name: PROVINCE_NAMES[hoveredId] ?? 'Unknown',
        value: 0,
        primaryLabel: unavailableNote,
        available: false,
      }
    : null;

  const ids = Object.keys(PROVINCE_PATHS);

  return (
    <div
      className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden border border-slate-100"
      onMouseMove={handleMouseMove}
    >
      {/* Tooltip */}
      {hoveredId && hoverData && (
        <div
          className="absolute z-10 pointer-events-none bg-slate-900 text-white text-xs p-2 rounded shadow-lg transform -translate-y-full -translate-x-1/2 mt-[-10px] whitespace-nowrap"
          style={{ left: mousePos.x, top: mousePos.y }}
        >
          <p className="font-bold">{hoverData.name}</p>
          {hoverData.available ? (
            <>
              <p className="font-mono text-scc-gold mt-1">{hoverData.primaryLabel}</p>
              {hoverData.secondaryLabel && (
                <p className="text-slate-400 mt-0.5">{hoverData.secondaryLabel}</p>
              )}
            </>
          ) : (
            <p className="text-slate-400 mt-1 italic">{unavailableNote}</p>
          )}
        </div>
      )}

      <svg viewBox={MAP_VIEWBOX} className="w-full h-full max-h-[440px]" role="img" aria-label="Map of Canada by province">
        <defs>
          {/* Diagonal hatch marks jurisdictions absent from the corpus, so a
              coverage gap can never be mistaken for a low value. */}
          <pattern
            id="unavailableHatch"
            width="7"
            height="7"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="7" height="7" fill="#f1f5f9" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#cbd5e1" strokeWidth="2.5" />
          </pattern>
        </defs>

        <g>
          {ids.map(id => {
            const d = data.get(id);
            const isAvailable = !!d?.available;
            const isSelected = selectedId === id;
            const isHovered = hoveredId === id;
            return (
              <path
                key={id}
                d={PROVINCE_PATHS[id]}
                fill={getFill(id)}
                stroke={isSelected ? '#C5A900' : '#ffffff'}
                strokeWidth={isSelected ? 2 : 0.8}
                strokeLinejoin="round"
                className={`transition-[fill,opacity] duration-200 ${
                  isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => { if (isAvailable) onSelect(id === selectedId ? 'All' : id); }}
                style={{
                  filter: isSelected ? 'drop-shadow(0px 0px 5px rgba(197, 169, 0, 0.55))' : 'none',
                  opacity: hoveredId && !isHovered && !isSelected ? 0.55 : 1,
                }}
              />
            );
          })}
        </g>

        {/* Leader lines for the callouts, drawn under the text. */}
        <g pointerEvents="none">
          {Object.entries(CALLOUTS).map(([id, { leader }]) => (
            <polyline
              key={`leader-${id}`}
              points={leader}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.9"
              opacity={hoveredId && hoveredId !== id ? 0.4 : 1}
              className="transition-opacity duration-200"
            />
          ))}
        </g>

        {/* Province labels */}
        <g pointerEvents="none" fontFamily="Inter, sans-serif" fontWeight="700">
          {ids.map(id => {
            const callout = CALLOUTS[id];
            const area = PROVINCE_RENDERED_AREA[id];
            const inline = !callout && area >= INLINE_LABEL_MIN_AREA;
            if (!callout && !inline) return null;

            const [x, y] = callout ? callout.label : PROVINCE_LABEL_ANCHORS[id];
            const dim = hoveredId && hoveredId !== id;

            return (
              <text
                key={`label-${id}`}
                x={x}
                y={y}
                textAnchor={callout ? 'start' : 'middle'}
                dominantBaseline="middle"
                fontSize={callout ? 13 : area < SMALL_LABEL_MAX_AREA ? 11 : 14}
                fill={callout ? '#475569' : labelColor(id)}
                opacity={dim ? 0.45 : 1}
                className="transition-opacity duration-200 select-none"
              >
                {ABBREV[id]}
              </text>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <span>fewer</span>
          {RAMP.map(c => (
            <span key={c} className="w-3.5 h-2.5 rounded-[1px]" style={{ backgroundColor: c }} />
          ))}
          <span>more</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="12" height="10" className="rounded-[1px]">
            <rect width="12" height="10" fill="url(#unavailableHatch)" />
          </svg>
          <span>no data</span>
        </div>
      </div>
    </div>
  );
};

export default CanadaMap;
