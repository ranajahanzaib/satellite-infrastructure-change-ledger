import { Cpu, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAppStore } from "../store";
import { ProcessingJob } from "../types";

export const JobsView: React.FC = () => {
  const { showNotification } = useAppStore();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const res = await api.listJobs();
      setJobs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await api.retryJob(jobId);
      showNotification(`Retrying processing job ${jobId}`, "info");
      await loadJobs();
    } catch (err) {
      showNotification("Retry failed: " + err, "error");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-500" />
            <span>Asynchronous Geospatial Processing Jobs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Background workers executing raster coregistration, Clay/Prithvi
            embeddings, and change polygonization.
          </p>
        </div>

        <button
          onClick={loadJobs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Jobs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Job ID</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Progress</th>
              <th className="py-3 px-4">Stage Details</th>
              <th className="py-3 px-4">Started At</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-800/40 transition">
                <td className="py-3 px-4 font-bold text-white">{j.id}</td>
                <td className="py-3 px-4 uppercase text-slate-200">
                  {j.job_type.replace("_", " ")}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      j.status === "completed"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : j.status === "running"
                          ? "bg-blue-950 text-blue-400 border border-blue-800 animate-pulse"
                          : j.status === "failed"
                            ? "bg-rose-950 text-rose-400 border border-rose-800"
                            : "bg-slate-950 text-slate-400"
                    }`}
                  >
                    {j.status}
                  </span>
                </td>
                <td className="py-3 px-4 w-36">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>{j.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded overflow-hidden">
                      <div
                        className={`h-full ${j.status === "failed" ? "bg-rose-500" : "bg-blue-500"}`}
                        style={{ width: `${j.progress}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                  {j.stage_message || "—"}
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {j.started_at
                    ? j.started_at.slice(0, 19).replace("T", " ")
                    : "—"}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleRetry(j.id)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
