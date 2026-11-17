import { Cpu, Play } from "lucide-react";
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { MapViewer } from "../components/MapViewer";
import { useAppStore } from "../store";
import { ChangeCandidate } from "../types";

export const ChangeDetectionView: React.FC = () => {
  const { setActiveTab, selectedCandidateId, setSelectedCandidateId } =
    useAppStore();
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    loadCandidates();
  }, [categoryFilter, minScore]);

  const loadCandidates = async () => {
    try {
      const res = await api.listCandidates({
        category: categoryFilter || undefined,
        min_score: minScore > 0 ? minScore : undefined,
      });
      setCandidates(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-900 border-b border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Change Detection Explorer</span>
          </span>

          <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
            <span className="text-slate-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 outline-none"
            >
              <option value="">All Categories</option>
              <option value="new_construction">New Construction</option>
              <option value="building_expansion">Building Expansion</option>
              <option value="road_development">Road Development</option>
              <option value="land_clearing">Land Clearing</option>
              <option value="vegetation_change">Vegetation Change</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Min Score:</span>
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              value={minScore * 100}
              onChange={(e) => setMinScore(Number(e.target.value) / 100)}
              className="w-20 accent-blue-500 cursor-pointer"
            />
            <span className="w-10 text-slate-300">
              {(minScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <button
          onClick={() => setActiveTab("comparison")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium shadow-sm transition"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Launch Temporal Workspace</span>
        </button>
      </div>

      {/* Main Split Layout: Map on left (2 cols), Details on right (1 col) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Left Map */}
        <div className="lg:col-span-2 relative h-full">
          <MapViewer
            candidates={candidates}
            selectedCandidateId={selectedCandidate?.id}
            onSelectCandidate={(c) => setSelectedCandidateId(c.id)}
            modeLabel="Detected Candidates Spatial Distribution"
          />
        </div>

        {/* Right Candidate List & Signals Inspector */}
        <div className="bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden font-mono text-xs">
          {/* Selected Candidate Inspector */}
          {selectedCandidate ? (
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm uppercase text-white">
                  {selectedCandidate.candidate_category.replace("_", " ")}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-400 border border-amber-800">
                  Score: {(selectedCandidate.score * 100).toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div>
                  ID: <span className="text-white">{selectedCandidate.id}</span>
                </div>
                <div>
                  Confidence:{" "}
                  <span className="text-white uppercase font-semibold">
                    {selectedCandidate.confidence_band}
                  </span>
                </div>
                <div>
                  Area:{" "}
                  <span className="text-white">
                    {Math.round(selectedCandidate.area_m2).toLocaleString()} m²
                  </span>
                </div>
                <div>
                  Status:{" "}
                  <span className="text-emerald-400 uppercase font-semibold">
                    {selectedCandidate.status}
                  </span>
                </div>
              </div>

              {/* Signals Breakdown */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Signal Contributors (Explainability):
                </div>

                {Object.entries(
                  selectedCandidate.contributing_signals || {},
                ).map(([sigKey, val]) => (
                  <div key={sigKey} className="space-y-0.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-300 capitalize">
                        {sigKey.replace("_", " ")}
                      </span>
                      <span className="text-white font-bold">
                        {(val * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded"
                        style={{ width: `${Math.min(val * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setActiveTab("review")}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition"
                >
                  Verify Candidate
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-slate-500">
              No candidate selected
            </div>
          )}

          {/* Candidate List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">
              Detected Candidates ({candidates.length})
            </div>
            {candidates.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCandidateId(c.id)}
                className={`p-3 rounded border transition cursor-pointer ${
                  selectedCandidate?.id === c.id
                    ? "bg-blue-950/40 border-blue-500 shadow-sm"
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase text-[11px]">
                    {c.candidate_category.replace("_", " ")}
                  </span>
                  <span className="text-amber-400 font-bold text-[11px]">
                    {(c.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{Math.round(c.area_m2).toLocaleString()} m²</span>
                  <span className="uppercase">{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
