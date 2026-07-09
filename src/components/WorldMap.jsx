import React, { useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';

// The projection + country outlines are computed once at module load — they
// never change, so there's no reason to recompute them on every render.
const WIDTH = 900;
const HEIGHT = 470;
const world = feature(worldData, worldData.objects.countries);
const projection = geoNaturalEarth1().fitExtent(
  [[6, 6], [WIDTH - 6, HEIGHT - 6]],
  world,
);
const drawPath = geoPath(projection);
const COUNTRY_PATHS = world.features.map((f, i) => ({ id: `c${i}`, d: drawPath(f) }));

// Group raw pins by location and place each cluster at its lat/lng. The more
// visitors from one place, the bigger the dot.
function useClusters(pins) {
  return useMemo(() => {
    const groups = new Map();
    for (const p of pins) {
      if (p.lat == null || p.lng == null) continue;
      const key = `${p.country_code || p.country}|${p.state_code || p.state || ''}`;
      const g = groups.get(key) || {
        key, country: p.country, state: p.state, lat: p.lat, lng: p.lng, count: 0,
      };
      g.count += 1;
      groups.set(key, g);
    }
    const clusters = [];
    for (const g of groups.values()) {
      const xy = projection([g.lng, g.lat]);
      if (!xy) continue;
      clusters.push({ ...g, x: xy[0], y: xy[1] });
    }
    // Draw larger clusters last so they sit on top.
    return clusters.sort((a, b) => a.count - b.count);
  }, [pins]);
}

// Absolute sizing (NOT normalised to the max) so a single-person location stays
// a small dot instead of ballooning to the max radius whenever every count is
// equal. Values are in the 900×470 viewBox's user units, capped so a big cluster
// never swallows neighbouring states.
const radiusFor = (count) => Math.min(2.6 + 1.7 * Math.sqrt(count), 12);

export default function WorldMap({ pins = [], mineKey = null }) {
  const clusters = useClusters(pins);
  const [hover, setHover] = useState(null); // { cluster, x, y }
  const total = pins.filter((p) => p.lat != null && p.lng != null).length;

  return (
    <div className="worldmap">
      <style>{`
        .worldmap { position: relative; width: 100%; }
        .worldmap svg { width: 100%; height: auto; display: block; }
        .wm-country { fill: #e9ede9; stroke: var(--surface); stroke-width: 0.5; transition: fill .3s; }
        .worldmap:hover .wm-country { fill: #e3e8e4; }
        .wm-pin { cursor: pointer; transition: transform .18s var(--ease); transform-box: fill-box; transform-origin: center; }
        .wm-pin:hover { transform: scale(1.18); }
        .wm-dot { fill: var(--teal); fill-opacity: 0.78; stroke: #fff; stroke-width: 1.5; }
        .wm-dot.mine { fill: var(--gold); fill-opacity: 0.95; }
        .wm-halo { fill: var(--teal); fill-opacity: 0.18; transform-box: fill-box; transform-origin: center; animation: wmPulse 2.6s var(--ease) infinite; }
        .wm-halo.mine { fill: var(--gold); }
        @keyframes wmPulse { 0% { transform: scale(1); opacity: .5; } 70%,100% { transform: scale(2.4); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .wm-halo { animation: none; } }
        .wm-tip {
          position: absolute; z-index: 6; pointer-events: none; transform: translate(-50%, -115%);
          background: var(--ink); color: #fff; padding: 0.5rem 0.75rem; border-radius: var(--r-sm);
          box-shadow: var(--shadow-md); font-size: 0.8rem; white-space: nowrap; line-height: 1.35;
        }
        .wm-tip b { color: var(--gold); }
        .wm-tip .wm-tip-loc { font-weight: 700; }
        .wm-empty { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
      `}</style>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`World map showing ${total} community ${total === 1 ? 'pin' : 'pins'}`}>
        <g>
          {COUNTRY_PATHS.map((c) => (
            <path key={c.id} className="wm-country" d={c.d} />
          ))}
        </g>
        <g>
          {clusters.map((c) => {
            const r = radiusFor(c.count);
            const mine = c.key === mineKey;
            return (
              <g
                key={c.key}
                className="wm-pin"
                onMouseEnter={() => setHover({ cluster: c })}
                onMouseMove={() => setHover({ cluster: c })}
                onMouseLeave={() => setHover(null)}
              >
                <circle className={`wm-halo ${mine ? 'mine' : ''}`} cx={c.x} cy={c.y} r={r} />
                <circle className={`wm-dot ${mine ? 'mine' : ''}`} cx={c.x} cy={c.y} r={r} />
              </g>
            );
          })}
        </g>
      </svg>

      {hover && (
        <div
          className="wm-tip"
          style={{ left: `${(hover.cluster.x / WIDTH) * 100}%`, top: `${(hover.cluster.y / HEIGHT) * 100}%` }}
        >
          <div className="wm-tip-loc">
            {hover.cluster.state ? `${hover.cluster.state}, ` : ''}{hover.cluster.country}
          </div>
          <div><b>{hover.cluster.count}</b> {hover.cluster.count === 1 ? 'person' : 'people'} here</div>
        </div>
      )}

      {total === 0 && (
        <div className="wm-empty">
          <span className="badge badge-soft">Be the first to put yourself on the map ✦</span>
        </div>
      )}
    </div>
  );
}
