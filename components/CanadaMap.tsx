import React, { useState } from 'react';

/**
 * A stylized choropleth of Canada.
 *
 * Generalized from an earlier reversal-rate-only version so it can also carry
 * data-coverage, where the important state is not "low value" but "no data at
 * all". Those two look identical on a normal choropleth — both end up pale —
 * which would quietly misrepresent a gap in the corpus as a real finding. So
 * `available: false` regions render with a hatch pattern and are excluded from
 * the colour scale entirely.
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

// Accurate SVG paths for Canadian Provinces/Territories
// ViewBox 0 0 950 800 (Approximation of Lambert Conformal Conic projection)
const PATHS: Record<string, string> = {
  // British Columbia (2)
  '2': 'M177.3,612.3l-2.4-3.1l-14.9-37.1l-22.3-43.1l-11.8-19.6l-5.5-27.4l-11.8-14.9l-13.3-8.6l-18.8-18l-14.1-1.6l-29-23.5l3.1-13.3l12.5-9.4l4.7-21.2l29.8,2.4l11.8-21.2l9.4-4.7l4.7-18l141.2,19.6l3.1,302.7L177.3,612.3z M84.8,610l12.5-12.5l14.1,2.4l20.4,14.1l-3.1,22l-14.9,2.4l-11-9.4L84.8,610z',
  
  // Alberta (1)
  '1': 'M253.3,653.1L254.1,350.4l75.3-2.4l0.8,116.8l54.1,189.8l-72.1,0.8L253.3,653.1z',
  
  // Saskatchewan (10)
  '10': 'M384.3,654.6l-0.8-189.8l-0.8-116.8l105.1,1.6l-6.3,306.6L384.3,654.6z',
  
  // Manitoba (3)
  '3': 'M481.5,656.2l6.3-306.6l106.6,2.4l3.1,34.5l11,11.8l11.8,47.8l9.4,7.8l-3.1,20.4l-12.5,23.5l3.1,11.8l-12.5,14.1l-6.3,27.4l-3.1,22.7l-29.8,2.4l-2.4,80H481.5z',
  
  // Ontario (7)
  '7': 'M556.8,753.4l2.4-80l29.8-2.4l3.1-22.7l6.3-27.4l12.5-14.1l-3.1-11.8l12.5-23.5l3.1-20.4l-9.4-7.8l47.8-17.2l12.5,13.3l37.6,18.8l20.4,36.1l43.9,23.5l12.5,43.9l-20.4,18.8l-23.5,4.7l-9.4,26.7l-26.7,29l-43.9,13.3l-20.4-12.5l-20.4-26.7L556.8,753.4z',
  
  // Quebec (9)
  '9': 'M614.8,552.7l-12.5-13.3l-47.8,17.2l-11.8-47.8l-11-11.8l-3.1-34.5l-20.4-7.8l6.3-23.5l26.7-18.8l18.8-3.1l20.4-34.5l43.9,12.5l23.5,18.8l34.5,9.4l43.9-9.4l34.5,18.8l26.7,6.3l37.6,40.8l20.4,29.8l-12.5,29.8l-37.6,12.5l-20.4-18.8l-18.8,3.1l-12.5,20.4l-23.5,23.5l-12.5,20.4l-26.7,18.8l-34.5,29.8l-12.5-43.9L656,590.7L635.6,554.6L614.8,552.7z',
  
  // New Brunswick (4)
  '4': 'M771.6,679.7l-26.7-6.3l-26.7,14.1l-9.4-12.5l12.5-20.4l23.5-23.5l12.5-20.4l18.8-3.1l11,18.8l-4.7,23.5L771.6,679.7z',
  
  // Nova Scotia (6)
  '6': 'M777.9,675l18.8-12.5l26.7,23.5l-12.5,29.8l-37.6-12.5L777.9,675z',
  
  // PEI (8)
  '8': 'M795.1,643.6l18.8-3.1l6.3,6.3l-12.5,6.3L795.1,643.6z',
  
  // Newfoundland & Labrador (5) (Labrador + Island)
  '5': 'M733.9,566l12.5-29.8l-20.4-29.8l-37.6-40.8l23.5-9.4l34.5,18.8l43.9,29.8l26.7,40.8L733.9,566z M875.1,595l34.5-18.8l20.4,12.5l-12.5,43.9l-34.5,18.8L875.1,595z',
  
  // Yukon (13)
  '13': 'M177.3,309.6l-3.1-97.2l91,3.1l14.1,18.8l26.7,34.5l-9.4,37.6L254.1,350.4L177.3,309.6z',
  
  // Northwest Territories (11)
  '11': 'M296.6,306.5l9.4-37.6l23.5-34.5l34.5-12.5l91,9.4l43.9,43.9l-11,77.6l-105.1-1.6l-0.8-37.6L296.6,306.5z',
  
  // Nunavut (12)
  '12': 'M498.9,352.7l11-77.6l23.5-23.5l43.9-12.5l47.8,20.4l91,29.8l43.9,43.9l-26.7,6.3l-34.5-18.8l-43.9,9.4l-34.5-9.4l-23.5-18.8l-43.9-12.5l-20.4,34.5l-18.8,3.1l-6.3,23.5l20.4,7.8l3.1,34.5l-106.6-2.4L498.9,352.7z M650,150 l50,-30 l40,10 l-20,50 z' // Very simplified islands
};

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
  '13': 'Yukon'
};

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
  // skewed (BC Supreme Court alone is roughly a third of the provincial
  // corpus), and a linear ramp would render everything except the largest
  // jurisdiction as the same pale wash.
  const getFill = (id: string) => {
    const d = data.get(id);
    if (!d || !d.available) return 'url(#unavailableHatch)';
    if (ceiling <= 0 || d.value <= 0) return '#eff6ff';
    const t = Math.sqrt(d.value / ceiling);
    if (t < 0.2) return '#dbeafe';
    if (t < 0.4) return '#93c5fd';
    if (t < 0.6) return '#60a5fa';
    if (t < 0.8) return '#2563eb';
    return '#1e3a8a';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
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

  return (
    <div className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden border border-slate-100" onMouseMove={handleMouseMove}>

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

      {/* SVG ViewBox adjusted to better fit the coordinates */}
      <svg viewBox="0 0 950 800" className="w-full h-full max-h-[400px]">
        <defs>
          {/* Diagonal hatch marks jurisdictions absent from the corpus, so a
              coverage gap can never be mistaken for a low value. */}
          <pattern id="unavailableHatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill="#f1f5f9" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#cbd5e1" strokeWidth="2.5" />
          </pattern>
        </defs>
        <g transform="translate(0, 20)">
          {Object.entries(PATHS).map(([id, path]) => {
            const d = data.get(id);
            const isAvailable = !!d?.available;
            const isSelected = selectedId === id;
            const isHovered = hoveredId === id;
            return (
              <path
                key={id}
                d={path}
                fill={getFill(id)}
                stroke={isSelected ? '#C5A900' : '#ffffff'}
                strokeWidth={isSelected ? 3 : 1}
                className={`transition-colors duration-200 ${isAvailable ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed'}`}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => { if (isAvailable) onSelect(id === selectedId ? 'All' : id); }}
                style={{
                    filter: isSelected ? 'drop-shadow(0px 0px 4px rgba(197, 169, 0, 0.5))' : 'none',
                    opacity: hoveredId && !isHovered && !isSelected ? 0.6 : 1
                }}
              />
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <span>fewer</span>
          {['#dbeafe', '#93c5fd', '#60a5fa', '#2563eb', '#1e3a8a'].map(c => (
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

      <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 italic">
        *Stylized Geographic Representation
      </div>
    </div>
  );
};

export default CanadaMap;