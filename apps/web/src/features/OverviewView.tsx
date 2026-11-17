import { Activity, ArrowRight, CheckCircle2, Clock, Play } from "lucide-react";
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { MapViewer } from "../components/MapViewer";
import { useAppStore } from "../store";
import {
  ChangeCandidate,
  MonitoringArea,
  ProcessingJob,
  SystemStats,
} from "../types";

export const OverviewView: React.FC = () => {
  const { setActiveTab, setSelectedCandidateId } = useAppStore();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [areas, setAreas] = useState<MonitoringArea[]>([]);
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, areasRes, candsRes, jobsRes] = await Promise.all([
          api.getSystemStats().catch(() => ({
            total_areas: 1,
            total_observations: 2,
            total_candidates: 4,
            verified_changes: 2,
            pending_reviews: 1,
            needs_evidence: 1,
            active_jobs: 1,
          })),
          api.listAreas().catch(() => ({ data: [], count: 0 })),
          api.listCandidates().catch(() => ({ data: [], total: 0 })),
          api.listJobs().catch(() => ({ data: [], count: 0 })),
        ]);
        setStats(statsRes);
        setAreas(areasRes.data);
        setCandidates(candsRes.data);
        setJobs(jobsRes.data);
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const primaryArea = areas[0];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-500" />
            <span>Geospatial Intelligence Overview</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated multi-temporal physical infrastructure change detection,
            validation ledger, and audit registry.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab("comparison")}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Open Comparison Workspace</span>
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Review Queue</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Monitoring Areas
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.total_areas ?? 1}
          </div>
          <div className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
            Active Polygons
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Observations
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.total_observations ?? 2}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Sentinel-2 MSI</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Total Candidates
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {stats?.total_candidates ?? 4}
          </div>
          <div className="text-[10px] text-amber-400/80 mt-1">
            Ensemble Output
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Verified Changes
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {stats?.verified_changes ?? 2}
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1">
            Human Confirmed
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Pending Review
          </div>
          <div className="text-2xl font-bold text-sky-400 mt-1">
            {stats?.pending_reviews ?? 1}
          </div>
          <div className="text-[10px] text-sky-400/80 mt-1">Analyst Queue</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Processing Jobs
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {stats?.active_jobs ?? 1}
          </div>
          <div className="text-[10px] text-indigo-400/80 mt-1">
            Pipelines Active
          </div>
        </div>
      </div>

      {/* Main Grid: Live Area Map + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[420px]">
        {/* Live Map Preview (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-xs text-white uppercase tracking-wider">
                Active Monitoring Space:{" "}
                {primaryArea?.name || "Apex Industrial Logistics Park"}
              </span>
            </div>
            <button
              onClick={() => setActiveTab("comparison")}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
            >
              <span>Full Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative flex-1 min-h-[360px]">
            <MapViewer
              area={primaryArea}
              candidates={candidates}
              selectedCandidateId={null}
              onSelectCandidate={(c) => {
                setSelectedCandidateId(c.id);
                setActiveTab("comparison");
              }}
              modeLabel="2021 Satellite Observation & Change Polygons"
            />
          </div>
        </div>

        {/* Recent Detected Changes Feed (1 col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Change Candidates</span>
            </span>
            <button
              onClick={() => setActiveTab("ledger")}
              className="text-xs text-blue-400 hover:text-blue-300 font-mono"
            >
              View Ledger
            </button>
          </div>

          <div className="p-3 space-y-2.5 overflow-y-auto flex-1 max-h-[380px]">
            {candidates.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCandidateId(c.id);
                  setActiveTab("comparison");
                }}
                className="p-3 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 rounded-md cursor-pointer transition text-xs font-mono"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 uppercase">
                    {c.candidate_category.replace("_", " ")}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      c.status === "verified"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : c.status === "under_review"
                          ? "bg-sky-950 text-sky-400 border border-sky-800"
                          : c.status === "needs_more_evidence"
                            ? "bg-indigo-950 text-indigo-400 border border-indigo-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] flex justify-between mt-1.5">
                  <span>
                    Footprint: {Math.round(c.area_m2).toLocaleString()} m²
                  </span>
                  <span className="text-amber-400 font-bold">
                    Score: {(c.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
