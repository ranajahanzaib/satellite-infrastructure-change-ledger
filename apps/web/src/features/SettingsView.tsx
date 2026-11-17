import { RefreshCw, Server, Settings, Shield, Sliders } from "lucide-react";
import React, { useState } from "react";
import { useAppStore } from "../store";

export const SettingsView: React.FC = () => {
  const { userRole, setUserRole, showNotification } = useAppStore();
  const [minRegionSize, setMinRegionSize] = useState(1200);
  const [scoreThreshold, setScoreThreshold] = useState(0.4);
  const [seeding, setSeeding] = useState(false);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/v1/system/seed", { method: "POST" });
      if (res.ok) {
        showNotification(
          "Demonstration scenario (Apex Industrial Logistics Park) re-seeded successfully!",
          "success",
        );
      } else {
        showNotification("Failed to seed demo data", "error");
      }
    } catch (err) {
      showNotification("Seed error: " + err, "error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6 font-mono text-xs max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-500" />
          <span>System & Detection Engine Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure model adapters, STAC discovery endpoints, detection
          sensitivity, and analyst role simulation.
        </p>
      </div>

      {/* Role Switcher */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-3">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Active Analyst Role Simulation (RBAC)</span>
        </h3>
        <p className="text-slate-400 text-[11px]">
          Switch roles to verify access control. Viewers are restricted to
          read-only access and cannot save verification decisions.
        </p>

        <div className="flex gap-3">
          {(["analyst", "administrator", "viewer"] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setUserRole(r);
                showNotification(`Role switched to ${r}`, "info");
              }}
              className={`px-3 py-1.5 rounded border transition uppercase font-semibold text-[11px] ${
                userRole === r
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Model Adapters Status */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-3">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-blue-400" />
          <span>Integrated Hugging Face Models & Catalogs</span>
        </h3>

        <div className="space-y-2">
          <div className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-white">made-with-clay/Clay</div>
              <div className="text-[11px] text-slate-400">
                768-dim patch representations & cosine similarity
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
              Adapter Ready
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-white">
                ibm-nasa-geospatial/Prithvi-EO-2.0-600M-TL
              </div>
              <div className="text-[11px] text-slate-400">
                Land-cover semantic feature extraction & infrastructure
                segmentation
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
              Adapter Ready
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-white">Major-TOM/Core-S2L2A</div>
              <div className="text-[11px] text-slate-400">
                Representative multi-temporal Sentinel-2 L2A grid indexing
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
              Adapter Ready
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center">
            <div>
              <div className="font-bold text-white">
                wikimedia/linked-openstreetmap-wikidata-wikipedia
              </div>
              <div className="text-[11px] text-slate-400">
                Geospatial entity resolution & industrial park linking
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
              Adapter Ready
            </span>
          </div>
        </div>
      </div>

      {/* Detection Engine Parameters */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-3">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Detection Engine Thresholds</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 mb-1">
              Minimum Region Area (m²):
            </label>
            <input
              type="number"
              value={minRegionSize}
              onChange={(e) => setMinRegionSize(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Ensemble Score Cutoff:
            </label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="0.9"
              value={scoreThreshold}
              onChange={(e) => setScoreThreshold(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Demonstration Reset */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between">
        <div>
          <div className="font-bold text-white">Reset Demonstration Data</div>
          <div className="text-[11px] text-slate-400">
            Re-initializes the Apex Industrial Logistics Park scenario with
            clean baseline & expansion observations.
          </div>
        </div>

        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow transition disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{seeding ? "Seeding..." : "Reset Demo Data"}</span>
        </button>
      </div>
    </div>
  );
};
