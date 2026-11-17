import { Clock, Download, FileText, Search, ShieldCheck } from "lucide-react";
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAppStore } from "../store";
import { ChangeCandidate } from "../types";

export const ChangeLedgerView: React.FC = () => {
  const { setActiveTab, setSelectedCandidateId } = useAppStore();
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<ChangeCandidate | null>(
    null,
  );
  const [historyRevs, setHistoryRevs] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);

  useEffect(() => {
    loadLedger();
  }, [statusFilter, categoryFilter, search]);

  const loadLedger = async () => {
    try {
      const res = await api.listCandidates({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        search: search || undefined,
      });
      setCandidates(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetail = async (c: ChangeCandidate) => {
    setSelectedEntry(c);
    try {
      const [revs, evs] = await Promise.all([
        api.getCandidateHistory(c.id),
        fetch(`/api/v1/changes/${c.id}/evidence`)
          .then((r) => r.json())
          .catch(() => ({ data: [] })),
      ]);
      setHistoryRevs(revs.data || []);
      setEvidenceList(evs.data || []);
    } catch (err) {
      setHistoryRevs([]);
      setEvidenceList([]);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span>Historical Change Ledger</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Permanent, audited change register for physical infrastructure
            modifications.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <a
            href={api.getExportUrl("geojson")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GeoJSON</span>
          </a>
          <a
            href={api.getExportUrl("csv")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <a
            href={api.getExportUrl("report")}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded shadow transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download Report (.md)</span>
          </a>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-lg font-mono text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search candidate ID, category, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 outline-none"
        >
          <option value="">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="detected">Detected</option>
          <option value="under_review">Under Review</option>
          <option value="needs_more_evidence">Needs More Evidence</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 outline-none"
        >
          <option value="">All Categories</option>
          <option value="new_construction">New Construction</option>
          <option value="building_expansion">Building Expansion</option>
          <option value="road_development">Road Development</option>
          <option value="land_clearing">Land Clearing</option>
        </select>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Candidate ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Area (m²)</th>
                <th className="py-3 px-4">Timeline</th>
                <th className="py-3 px-4">Revision</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {candidates.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => handleOpenDetail(c)}
                  className="hover:bg-slate-800/50 cursor-pointer transition text-slate-300"
                >
                  <td className="py-3 px-4 font-bold text-white">{c.id}</td>
                  <td className="py-3 px-4 uppercase text-slate-200">
                    {c.candidate_category.replace("_", " ")}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                  </td>
                  <td className="py-3 px-4 text-amber-400 font-bold">
                    {(c.score * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-white">
                    {Math.round(c.area_m2).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-400">2016 → 2021</td>
                  <td className="py-3 px-4 text-slate-400">
                    v{c.revision_number}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCandidateId(c.id);
                        setActiveTab("comparison");
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded border border-slate-700 transition"
                    >
                      Inspect Map
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revision History & Evidence Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 max-w-2xl w-full max-h-[85vh] overflow-y-auto font-mono text-xs space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <span className="font-bold text-sm text-white">
                  Change Record: {selectedEntry.id}
                </span>
                <span className="ml-2 text-slate-400 font-normal">
                  ({selectedEntry.candidate_category})
                </span>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Candidate Metadata Summary */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded border border-slate-800 text-[11px]">
              <div>
                Score:{" "}
                <span className="text-amber-400 font-bold">
                  {(selectedEntry.score * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                Current Status:{" "}
                <span className="text-emerald-400 uppercase font-bold">
                  {selectedEntry.status}
                </span>
              </div>
              <div>
                Area:{" "}
                <span className="text-white">
                  {Math.round(selectedEntry.area_m2).toLocaleString()} m²
                </span>
              </div>
              <div>
                Detection Engine:{" "}
                <span className="text-slate-300">
                  {selectedEntry.detection_method}
                </span>
              </div>
            </div>

            {/* Traceable Supporting Evidence Chain */}
            <div>
              <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  Supporting Geospatial Evidence ({evidenceList.length})
                </span>
              </h4>

              <div className="space-y-2">
                {evidenceList.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded flex flex-col gap-1"
                  >
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-emerald-400 uppercase tracking-wide">
                        {ev.evidence_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {ev.created_at?.slice(0, 10)}
                      </span>
                    </div>
                    <div className="text-slate-300 text-xs">
                      {ev.description}
                    </div>
                    <div className="text-slate-500 text-[10px] truncate font-mono">
                      Ref: {ev.reference_url}
                    </div>
                  </div>
                ))}
                {evidenceList.length === 0 && (
                  <div className="text-slate-500 italic p-2 bg-slate-950/40 rounded border border-slate-900">
                    No discrete raster evidence references attached.
                  </div>
                )}
              </div>
            </div>

            {/* Revision Audit History */}
            <div>
              <h4 className="font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Audited Decision Revisions ({historyRevs.length})</span>
              </h4>

              <div className="space-y-2">
                {historyRevs.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded"
                  >
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-white">
                        Revision v{rev.revision_number}
                      </span>
                      <span className="text-slate-500">
                        {rev.created_at?.slice(0, 19).replace("T", " ")}
                      </span>
                    </div>
                    <div className="text-slate-300 mt-1">
                      Reason:{" "}
                      <span className="text-blue-300 font-semibold">
                        {rev.reason}
                      </span>{" "}
                      | By: {rev.analyst_name}
                    </div>
                    {rev.notes && (
                      <div className="text-slate-400 mt-1 italic">
                        "{rev.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedCandidateId(selectedEntry.id);
                  setSelectedEntry(null);
                  setActiveTab("review");
                }}
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
              >
                Open in Verification Workbench
              </button>
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
