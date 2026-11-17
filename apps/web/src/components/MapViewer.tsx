import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import React, { useState } from "react";
import { ChangeCandidate, GeographicalEntity, MonitoringArea } from "../types";

interface MapViewerProps {
  area?: MonitoringArea;
  candidates?: ChangeCandidate[];
  entities?: GeographicalEntity[];
  activeObservationId?: string;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidate: ChangeCandidate) => void;
  showPolygons?: boolean;
  showDiffOverlay?: boolean;
  opacity?: number;
  interactive?: boolean;
  className?: string;
  modeLabel?: string;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  area,
  candidates = [],
  entities = [],
  activeObservationId = "obs-s2-2021-07-10",
  selectedCandidateId,
  onSelectCandidate,
  showPolygons = true,
  showDiffOverlay = false,
  opacity = 100,
  interactive = true,
  className = "",
  modeLabel,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredCandidate, setHoveredCandidate] =
    useState<ChangeCandidate | null>(null);

  const is2016 = activeObservationId.includes("2016");
  const rasterImg = is2016
    ? "/api/v1/imagery/obs-s2-2016-08-15/preview"
    : "/api/v1/imagery/obs-s2-2021-07-10/preview";

  // Fallback direct base64 gradient or pattern if raster endpoint is pending
  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "#10b981"; // green
      case "rejected":
        return "#ef4444"; // red
      case "under_review":
        return "#38bdf8"; // sky
      case "needs_more_evidence":
        return "#818cf8"; // indigo
      default:
        return "#f59e0b"; // amber / detected
    }
  };

  // Convert geo coordinates [-122.445, 37.765, -122.415, 37.785] to SVG viewport (0-1000)
  const minLon = area?.bbox?.[0] ?? -122.445;
  const minLat = area?.bbox?.[1] ?? 37.765;
  const maxLon = area?.bbox?.[2] ?? -122.415;
  const maxLat = area?.bbox?.[3] ?? 37.785;

  const projectToView = (lon: number, lat: number) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * 1000;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 1000;
    return [Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(1000, y))];
  };

  return (
    <div
      className={`relative w-full h-full bg-[#070b13] overflow-hidden select-none border border-slate-800 rounded-md ${className}`}
    >
      {/* Mode / Date Tag */}
      {modeLabel && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded shadow-md text-xs font-mono font-medium text-slate-200">
          <span
            className={`w-2 h-2 rounded-full ${is2016 ? "bg-amber-400" : "bg-emerald-400"}`}
          />
          {modeLabel}
        </div>
      )}

      {/* Cartographic Coordinate Banner */}
      <div className="absolute bottom-3 left-3 z-20 px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded text-[10px] font-mono text-slate-400">
        EPSG:4326 | 37.7750° N, 122.4300° W | 10m GSD (Sentinel-2)
      </div>

      {/* Zoom / Pan Controls */}
      {interactive && (
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-slate-900/90 border border-slate-700/80 rounded p-1 shadow-lg">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.3, 3))}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.3, 0.8))}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Interactive Canvas Area */}
      <div
        className="w-full h-full relative"
        style={{
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: "center center",
          transition: "transform 0.15s ease-out",
        }}
      >
        {/* Base Satellite Imagery Layer */}
        <img
          src={rasterImg}
          alt="Satellite Observation"
          className="w-full h-full object-cover pointer-events-none"
          style={{ opacity: opacity / 100 }}
          onError={(e) => {
            // High-contrast cartographic fallback styling if local server thumbnail endpoint is blocked
            (e.target as HTMLElement).style.display = "none";
          }}
        />

        {/* Difference Heatmap Overlay (if enabled) */}
        {showDiffOverlay && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-70"
            style={{
              background:
                "radial-gradient(ellipse at 65% 45%, rgba(245, 158, 11, 0.75) 0%, rgba(239, 68, 68, 0.45) 30%, transparent 65%)",
            }}
          />
        )}

        {/* Vector SVG Overlays for Boundary, Polygons, and Entities */}
        <svg
          viewBox="0 0 1000 1000"
          className="absolute inset-0 w-full h-full pointer-events-auto"
          preserveAspectRatio="none"
        >
          {/* AOI Boundary */}
          <rect
            x="20"
            y="20"
            width="960"
            height="960"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity="0.85"
          />

          {/* Candidate Change Polygons */}
          {showPolygons &&
            candidates.map((cand) => {
              const bbox = cand.bbox;
              const [p1x, p1y] = projectToView(bbox[0], bbox[3]); // min_lon, max_lat
              const [p2x, p2y] = projectToView(bbox[2], bbox[1]); // max_lon, min_lat
              const width = Math.max(16, p2x - p1x);
              const height = Math.max(16, p2y - p1y);

              const isSelected = selectedCandidateId === cand.id;
              const isHovered = hoveredCandidate?.id === cand.id;
              const color = getStatusColor(cand.status);

              return (
                <g
                  key={cand.id}
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => onSelectCandidate && onSelectCandidate(cand)}
                  onMouseEnter={() => setHoveredCandidate(cand)}
                  onMouseLeave={() => setHoveredCandidate(null)}
                >
                  {/* Fill & Stroke */}
                  <rect
                    x={p1x}
                    y={p1y}
                    width={width}
                    height={height}
                    fill={color}
                    fillOpacity={isSelected ? 0.45 : isHovered ? 0.35 : 0.22}
                    stroke={color}
                    strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
                    rx="3"
                  />
                  {/* Score badge in top corner */}
                  <circle cx={p1x + 8} cy={p1y + 8} r="6" fill={color} />
                  <text
                    x={p1x + 8}
                    y={p1y + 10}
                    textAnchor="middle"
                    fill="#000"
                    fontSize="7"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {Math.round(cand.score * 10)}
                  </text>
                </g>
              );
            })}

          {/* Geographical Entity Markers */}
          {entities.map((ent) => {
            const [ex, ey] = projectToView(ent.centroid[0], ent.centroid[1]);
            return (
              <g
                key={ent.id}
                transform={`translate(${ex}, ${ey})`}
                className="cursor-pointer"
              >
                <circle
                  r="10"
                  fill="#6366f1"
                  fillOpacity="0.25"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                />
                <circle r="4" fill="#a5b4fc" />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredCandidate && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-slate-700 p-2.5 rounded shadow-2xl text-xs font-mono max-w-xs"
            style={{
              top: "15%",
              right: "4%",
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-1.5 border-b border-slate-800 pb-1">
              <span className="font-semibold text-slate-100 uppercase tracking-wider text-[11px]">
                {hoveredCandidate.candidate_category.replace("_", " ")}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{
                  backgroundColor: `${getStatusColor(hoveredCandidate.status)}25`,
                  color: getStatusColor(hoveredCandidate.status),
                }}
              >
                {hoveredCandidate.status.replace("_", " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300 text-[11px]">
              <div>
                Score:{" "}
                <span className="text-white font-bold">
                  {(hoveredCandidate.score * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                Confidence:{" "}
                <span className="text-white uppercase">
                  {hoveredCandidate.confidence_band}
                </span>
              </div>
              <div>
                Area:{" "}
                <span className="text-white">
                  {Math.round(hoveredCandidate.area_m2).toLocaleString()} m²
                </span>
              </div>
              <div>
                Revision:{" "}
                <span className="text-white">
                  v{hoveredCandidate.revision_number}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-3 px-3 py-1 bg-slate-900/90 backdrop-blur border border-slate-800 rounded text-[11px] font-mono text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span>Detected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span>Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
          <span>Under Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
          <span>Rejected</span>
        </div>
      </div>
    </div>
  );
};
