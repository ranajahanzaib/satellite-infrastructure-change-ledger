import {
  CheckCircle2,
  FileCheck,
  HelpCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAppStore } from "../store";
import { ChangeCandidate } from "../types";

export const ReviewQueueView: React.FC = () => {
  const { userRole, showNotification, setActiveTab, setSelectedCandidateId } =
    useAppStore();
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [activeCandidate, setActiveCandidate] =
    useState<ChangeCandidate | null>(null);

  // Form state
  const [reason, setReason] = useState("confirmed_physical_construction");
  const [correctedCategory, setCorrectedCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const res = await api.listCandidates();
      setCandidates(res.data);
      if (res.data.length > 0) {
        if (!activeCandidate) {
          setActiveCandidate(res.data[0]);
        } else {
          const updated = res.data.find((c) => c.id === activeCandidate.id);
          if (updated) {
            setActiveCandidate(updated);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecision = async (
    decisionType: "verify" | "reject" | "request_evidence",
  ) => {
    if (!activeCandidate) return;
    setSubmitting(true);

    try {
      if (decisionType === "verify") {
        await api.verifyCandidate(
          activeCandidate.id,
          reason,
          notes,
          activeCandidate.revision_number,
          correctedCategory || undefined,
        );
        showNotification(
          `Candidate ${activeCandidate.id} successfully verified!`,
          "success",
        );
      } else if (decisionType === "reject") {
        await api.rejectCandidate(
          activeCandidate.id,
          reason,
          notes,
          activeCandidate.revision_number,
        );
        showNotification(`Candidate ${activeCandidate.id} rejected.`, "info");
      } else {
        await api.requestEvidence(
          activeCandidate.id,
          reason,
          notes,
          activeCandidate.revision_number,
        );
        showNotification(
          `Additional evidence requested for ${activeCandidate.id}.`,
          "info",
        );
      }

      setNotes("");
      setCorrectedCategory("");
      await loadQueue();
    } catch (err: any) {
      showNotification(`Verification error: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isViewer = userRole === "viewer";

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono text-xs">
      {/* Top Banner */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div>
          <h1 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Human Verification Workbench</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Analyst review queue with optimistic concurrency locking and
            persistent audit logging.
          </p>
        </div>

        {isViewer && (
          <div className="px-3 py-1 bg-amber-950/60 border border-amber-800 rounded text-amber-300 text-[11px]">
            Viewer Role: Read-only access. Verification actions require Analyst
            or Admin role.
          </div>
        )}
      </div>

      {/* Main Grid: Queue on left (1 col), Active review workspace on right (2 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Left Queue List */}
        <div className="bg-slate-950/80 border-r border-slate-800 p-4 overflow-y-auto space-y-2">
          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">
            Candidates Awaiting Review ({candidates.length})
          </div>

          {candidates.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveCandidate(c)}
              className={`p-3 rounded border transition cursor-pointer ${
                activeCandidate?.id === c.id
                  ? "bg-blue-950/40 border-blue-500 shadow-md"
                  : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-white uppercase text-[11px]">
                  {c.candidate_category.replace("_", " ")}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    c.status === "verified"
                      ? "bg-emerald-950 text-emerald-400"
                      : c.status === "under_review"
                        ? "bg-sky-950 text-sky-400"
                        : "bg-amber-950 text-amber-400"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[10px]">
                <span>{c.id}</span>
                <span className="text-amber-400 font-bold">
                  {(c.score * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Active Review Form */}
        <div className="lg:col-span-2 bg-slate-900 overflow-y-auto p-6 space-y-5">
          {activeCandidate ? (
            <>
              {/* Candidate Info Header */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div>
                    <span className="text-sm font-bold text-white uppercase">
                      {activeCandidate.candidate_category.replace("_", " ")}
                    </span>
                    <span className="text-slate-400 ml-2 font-normal">
                      ({activeCandidate.id})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950 text-blue-400 border border-blue-800">
                    Revision v{activeCandidate.revision_number}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-slate-300">
                  <div>
                    Detection Score:{" "}
                    <span className="text-amber-400 font-bold">
                      {(activeCandidate.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    Confidence:{" "}
                    <span className="text-white uppercase font-bold">
                      {activeCandidate.confidence_band}
                    </span>
                  </div>
                  <div>
                    Calculated Area:{" "}
                    <span className="text-white font-bold">
                      {Math.round(activeCandidate.area_m2).toLocaleString()} m²
                    </span>
                  </div>
                  <div>
                    Primary Linked Entity:{" "}
                    <span className="text-blue-400">
                      Apex Industrial Logistics Park
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Satellite Visual Evidence Preview */}
              <div>
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>
                    Visual Satellite Evidence (T1: 2016 Baseline vs T2: 2021
                    Observation)
                  </span>
                  <button
                    onClick={() => {
                      setSelectedCandidateId(activeCandidate.id);
                      setActiveTab("comparison");
                    }}
                    className="text-blue-400 hover:text-blue-300 underline text-[10px]"
                  >
                    Open in Split / Swipe View
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 h-48">
                  <div className="bg-slate-950 border border-slate-800 rounded relative overflow-hidden flex flex-col">
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/90 text-amber-300 text-[10px] font-bold border border-slate-700">
                      T1: 2016-08-15 (Undeveloped)
                    </div>
                    <img
                      src="/api/v1/imagery/obs-s2-2016-08-15/preview"
                      alt="T1"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded relative overflow-hidden flex flex-col">
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/90 text-emerald-300 text-[10px] font-bold border border-slate-700">
                      T2: 2021-07-10 (Expansion)
                    </div>
                    <img
                      src="/api/v1/imagery/obs-s2-2021-07-10/preview"
                      alt="T2"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Decision Submission Panel */}
              <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Analyst Verification Decision</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      Decision Reason:
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={isViewer}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
                    >
                      <option value="confirmed_physical_construction">
                        Confirmed Physical Construction
                      </option>
                      <option value="confirmed_building_expansion">
                        Confirmed Building Expansion
                      </option>
                      <option value="confirmed_demolition">
                        Confirmed Demolition / Removal
                      </option>
                      <option value="natural_or_seasonal_change">
                        Natural or Seasonal Change
                      </option>
                      <option value="shadow_or_illumination_difference">
                        Shadow or Illumination Difference
                      </option>
                      <option value="cloud_or_atmospheric_artifact">
                        Cloud or Atmospheric Artifact
                      </option>
                      <option value="misalignment">Spatial Misalignment</option>
                      <option value="insufficient_imagery">
                        Insufficient Imagery / Need More Observations
                      </option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      Correct Category (Optional):
                    </label>
                    <select
                      value={correctedCategory}
                      onChange={(e) => setCorrectedCategory(e.target.value)}
                      disabled={isViewer}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
                    >
                      <option value="">
                        (Keep Original: {activeCandidate.candidate_category})
                      </option>
                      <option value="new_construction">New Construction</option>
                      <option value="building_expansion">
                        Building Expansion
                      </option>
                      <option value="road_development">Road Development</option>
                      <option value="land_clearing">Land Clearing</option>
                      <option value="demolition">Demolition</option>
                      <option value="vegetation_change">
                        Vegetation Change
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Analyst Audit Notes:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter evidence-backed findings, structure dimensions, operator identification, or rationale..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isViewer}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleDecision("request_evidence")}
                    disabled={submitting || isViewer}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300 hover:bg-indigo-900 transition disabled:opacity-50"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Request More Evidence</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision("reject")}
                    disabled={submitting || isViewer}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-rose-950/80 border border-rose-800 text-rose-300 hover:bg-rose-900 transition disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Candidate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDecision("verify")}
                    disabled={submitting || isViewer}
                    className="flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify Infrastructure Change</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">
              No candidate selected for review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
