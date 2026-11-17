import { ArrowRightLeft, Columns, Sliders, Split } from "lucide-react";
import React, { useRef, useState } from "react";
import { useAppStore } from "../store";
import {
  ChangeCandidate,
  MonitoringArea,
  SatelliteObservation,
} from "../types";
import { MapViewer } from "./MapViewer";

interface TemporalComparisonProps {
  area?: MonitoringArea;
  observations?: SatelliteObservation[];
  candidates?: ChangeCandidate[];
  onSelectCandidate?: (cand: ChangeCandidate) => void;
}

export const TemporalComparisonWorkspace: React.FC<TemporalComparisonProps> = ({
  area,
  observations = [],
  candidates = [],
  onSelectCandidate,
}) => {
  const {
    comparisonMode,
    setComparisonMode,
    t1ObservationId,
    setT1ObservationId,
    t2ObservationId,
    setT2ObservationId,
    swipePosition,
    setSwipePosition,
    overlayOpacity,
    setOverlayOpacity,
    showDiffLayer,
    setShowDiffLayer,
    showChangePolygons,
    setShowChangePolygons,
    selectedCandidateId,
    setSelectedCandidateId,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const t1Obs =
    observations.find((o) => o.id === t1ObservationId) || observations[0];
  const t2Obs =
    observations.find((o) => o.id === t2ObservationId) ||
    observations[observations.length - 1];

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSwipePosition(percent);
  };

  const selectedCandidate = candidates.find(
    (c) => c.id === selectedCandidateId,
  );

  return (
    <div className="flex flex-col h-full bg-[#080d18] text-slate-100 select-none">
      {/* Workspace Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
          <button
            onClick={() => setComparisonMode("swipe")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              comparisonMode === "swipe"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Swipe Slider</span>
          </button>
          <button
            onClick={() => setComparisonMode("split")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              comparisonMode === "split"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>
          <button
            onClick={() => setComparisonMode("opacity")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              comparisonMode === "opacity"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Opacity Fade</span>
          </button>
        </div>

        {/* Date Pickers */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
            <span className="text-amber-400 font-semibold">T1 (Baseline):</span>
            <select
              value={t1ObservationId}
              onChange={(e) => setT1ObservationId(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="obs-s2-2016-08-15">
                2016-08-15 (Sentinel-2A)
              </option>
              <option value="obs-s2-2018-09-20">
                2018-09-20 (Sentinel-2B)
              </option>
            </select>
          </div>

          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />

          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800">
            <span className="text-emerald-400 font-semibold">
              T2 (Current):
            </span>
            <select
              value={t2ObservationId}
              onChange={(e) => setT2ObservationId(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="obs-s2-2021-07-10">
                2021-07-10 (Sentinel-2A)
              </option>
              <option value="obs-s2-2023-06-05">
                2023-06-05 (Sentinel-2B)
              </option>
            </select>
          </div>
        </div>

        {/* Layer Toggles & Sliders */}
        <div className="flex items-center gap-4 text-xs font-mono">
          {comparisonMode === "opacity" && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">T2 Opacity:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-24 accent-blue-500 cursor-pointer"
              />
              <span className="w-8 text-right text-slate-300">
                {overlayOpacity}%
              </span>
            </div>
          )}

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showDiffLayer}
              onChange={(e) => setShowDiffLayer(e.target.checked)}
              className="accent-blue-600 rounded"
            />
            <span>Difference Layer</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
            <input
              type="checkbox"
              checked={showChangePolygons}
              onChange={(e) => setShowChangePolygons(e.target.checked)}
              className="accent-blue-600 rounded"
            />
            <span>Change Polygons</span>
          </label>
        </div>
      </div>

      {/* Primary Workspace Viewport */}
      <div
        className="relative flex-1 min-h-[500px] overflow-hidden"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {comparisonMode === "swipe" && (
          <div className="relative w-full h-full">
            {/* T2 (Underneath / Full Layer) */}
            <div className="absolute inset-0">
              <MapViewer
                area={area}
                candidates={candidates}
                activeObservationId={t2ObservationId}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={(c) => {
                  setSelectedCandidateId(c.id);
                  if (onSelectCandidate) onSelectCandidate(c);
                }}
                showPolygons={showChangePolygons}
                showDiffOverlay={showDiffLayer}
                modeLabel="T2: 2021-07-10 (Industrial Expansion)"
              />
            </div>

            {/* T1 (Clipped Layer on Left) */}
            <div
              className="absolute inset-0 overflow-hidden border-r-2 border-white/90 shadow-2xl pointer-events-none"
              style={{ width: `${swipePosition}%` }}
            >
              <div
                className="w-full h-full relative"
                style={{ width: containerRef.current?.clientWidth || "100%" }}
              >
                <MapViewer
                  area={area}
                  candidates={[]}
                  activeObservationId={t1ObservationId}
                  showPolygons={false}
                  showDiffOverlay={false}
                  modeLabel="T1: 2016-08-15 (Baseline Undeveloped)"
                />
              </div>
            </div>

            {/* Draggable Divider Handle */}
            <div
              className="absolute top-0 bottom-0 w-8 -ml-4 flex items-center justify-center cursor-ew-resize z-40 select-none group"
              style={{ left: `${swipePosition}%` }}
              onMouseDown={handleMouseDown}
            >
              <div className="w-6 h-10 bg-white text-slate-900 rounded-md shadow-2xl flex items-center justify-center border border-slate-300 transition-transform group-hover:scale-110">
                <ArrowRightLeft className="w-3.5 h-3.5 font-bold" />
              </div>
            </div>
          </div>
        )}

        {comparisonMode === "split" && (
          <div className="grid grid-cols-2 h-full gap-1 p-1 bg-slate-950">
            {/* Left: T1 */}
            <div className="relative h-full">
              <MapViewer
                area={area}
                candidates={[]}
                activeObservationId={t1ObservationId}
                showPolygons={false}
                showDiffOverlay={false}
                modeLabel="T1: 2016-08-15 (Baseline)"
              />
            </div>

            {/* Right: T2 */}
            <div className="relative h-full">
              <MapViewer
                area={area}
                candidates={candidates}
                activeObservationId={t2ObservationId}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={(c) => {
                  setSelectedCandidateId(c.id);
                  if (onSelectCandidate) onSelectCandidate(c);
                }}
                showPolygons={showChangePolygons}
                showDiffOverlay={showDiffLayer}
                modeLabel="T2: 2021-07-10 (Expansion & Candidates)"
              />
            </div>
          </div>
        )}

        {comparisonMode === "opacity" && (
          <div className="relative w-full h-full">
            {/* T1 Baseline */}
            <div className="absolute inset-0">
              <MapViewer
                area={area}
                candidates={[]}
                activeObservationId={t1ObservationId}
                showPolygons={false}
                showDiffOverlay={false}
                modeLabel="T1: 2016 (Baseline)"
              />
            </div>

            {/* T2 Overlay with variable opacity */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ opacity: overlayOpacity / 100 }}
            >
              <MapViewer
                area={area}
                candidates={candidates}
                activeObservationId={t2ObservationId}
                selectedCandidateId={selectedCandidateId}
                showPolygons={showChangePolygons}
                showDiffOverlay={showDiffLayer}
                modeLabel={`T2: 2021 (Overlay ${overlayOpacity}%)`}
              />
            </div>
          </div>
        )}

        {/* Selected Candidate Inspector Drawer */}
        {selectedCandidate && (
          <div className="absolute bottom-4 left-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-4 shadow-2xl max-w-md w-full font-mono text-xs text-slate-200">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm uppercase text-white">
                  {selectedCandidate.candidate_category.replace("_", " ")}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({selectedCandidate.id})
                </span>
              </div>
              <button
                onClick={() => setSelectedCandidateId(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
              <div>
                Score:{" "}
                <span className="text-amber-400 font-bold">
                  {(selectedCandidate.score * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                Status:{" "}
                <span className="text-emerald-400 uppercase font-semibold">
                  {selectedCandidate.status}
                </span>
              </div>
              <div>
                Footprint Area:{" "}
                <span className="text-slate-100 font-semibold">
                  {Math.round(selectedCandidate.area_m2).toLocaleString()} m²
                </span>
              </div>
              <div>
                Method:{" "}
                <span className="text-slate-100">
                  {selectedCandidate.detection_method}
                </span>
              </div>
            </div>

            {/* Contributing Signals Bar */}
            <div className="mb-3 space-y-1">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Contributing Signals:
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span>Spectral Delta (NDBI/NDVI)</span>
                <span className="text-white">
                  {(
                    (selectedCandidate.contributing_signals
                      ?.spectral_magnitude || 0.8) * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{
                    width: `${(selectedCandidate.contributing_signals?.spectral_magnitude || 0.8) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1">
                <span>Clay Embedding Distance</span>
                <span className="text-white">
                  {(
                    (selectedCandidate.contributing_signals
                      ?.embedding_distance || 0.9) * 100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
                <div
                  className="bg-indigo-500 h-full"
                  style={{
                    width: `${(selectedCandidate.contributing_signals?.embedding_distance || 0.9) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              Linked Entity:{" "}
              <span className="text-blue-400 font-medium">
                {selectedCandidate.linked_entities?.[0]?.entity?.name ||
                  "Apex Logistics & Industrial Park (OSM)"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
