import { ArrowLeft, Calendar, Clock, Play } from "lucide-react";
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { MapViewer } from "../components/MapViewer";
import { useAppStore } from "../store";
import {
  ChangeCandidate,
  MonitoringArea,
  SatelliteObservation,
} from "../types";

export const AreaDetailView: React.FC = () => {
  const { selectedAreaId, setActiveTab, setSelectedCandidateId } =
    useAppStore();
  const [area, setArea] = useState<MonitoringArea | null>(null);
  const [observations, setObservations] = useState<SatelliteObservation[]>([]);
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAreaDetails() {
      try {
        const [aRes, obsRes, candsRes] = await Promise.all([
          api.getArea(selectedAreaId).catch(() => null),
          api.listImagery(selectedAreaId).catch(() => ({ data: [] })),
          api
            .listCandidates({ area_id: selectedAreaId })
            .catch(() => ({ data: [] })),
        ]);
        if (aRes) setArea(aRes);
        setObservations(obsRes.data || []);
        setCandidates(candsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAreaDetails();
  }, [selectedAreaId]);

  const timelineMilestones = [
    {
      year: "2016",
      date: "2016-08-15",
      title: "Baseline Multi-Spectral Acquisition",
      desc: "Copernicus Sentinel-2 Level-2A baseline registered. Area consists of 88% agricultural and open grassland with single rural structure.",
      color: "bg-emerald-500",
    },
    {
      year: "2018",
      date: "2018-09-20",
      title: "Parcel Land Clearing & Ground Grading",
      desc: "Significant NDVI decline detected across central-eastern parcels. Initial dirt grading and site mobilization identified.",
      color: "bg-amber-500",
    },
    {
      year: "2019",
      date: "2019-10-12",
      title: "Structural Foundation & Access Spine",
      desc: "Initial high-reflectance concrete slab footprints observed. Linear access corridor established.",
      color: "bg-blue-500",
    },
    {
      year: "2021",
      date: "2021-07-10",
      title: "Major Logistics Estate Expansion",
      desc: "Full erection of 4 industrial warehouses (Apex Logistics WH A, B, Cold Storage C, Depot D) and asphalt spine network.",
      color: "bg-purple-500",
    },
    {
      year: "2023",
      date: "2023-06-05",
      title: "Operational Logistics Hub Verification",
      desc: "Expanded trailer parking apron and perimeter security fencing documented.",
      color: "bg-emerald-400",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("areas")}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{area?.name || "Apex Industrial Logistics Park"}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                {area?.status || "Active"}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{area?.description}</p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab("comparison")}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold shadow-sm transition"
        >
          <Play className="w-4 h-4" />
          <span>Launch Temporal Comparison</span>
        </button>
      </div>

      {/* Map & Metadata Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[380px]">
        {/* Map */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
            <span>Area Footprint & Detected Change Clusters</span>
            <span>Spatial Extent: {area?.area_km2 || 4.82} km²</span>
          </div>
          <div className="relative flex-1 min-h-[320px]">
            <MapViewer
              area={area || undefined}
              candidates={candidates}
              onSelectCandidate={(c) => {
                setSelectedCandidateId(c.id);
                setActiveTab("comparison");
              }}
              modeLabel="2021 High-Resolution Infrastructure State"
            />
          </div>
        </div>

        {/* Observations Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Registered Observations ({observations.length})</span>
            </h3>

            <div className="space-y-2 font-mono text-xs">
              {observations.map((obs) => (
                <div
                  key={obs.id}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">
                      {obs.acquisition_date.slice(0, 10)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {obs.platform} (MSI)
                    </div>
                  </div>
                  <div className="text-right text-[11px]">
                    <div className="text-emerald-400">
                      Cloud: {obs.cloud_cover_pct}%
                    </div>
                    <div className="text-slate-500">10m GSD</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-xs font-mono text-slate-400">
            BBOX: [{area?.bbox?.map((v) => v.toFixed(3)).join(", ")}]
          </div>
        </div>
      </div>

      {/* Historical Evolution Timeline (Section 8) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
        <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Historical Evolution Ledger (2016 — Present)</span>
        </h3>

        <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
          {timelineMilestones.map((item, idx) => (
            <div key={idx} className="relative group">
              <span
                className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${item.color}`}
              />
              <div className="font-mono text-xs">
                <span className="font-bold text-white text-sm">
                  {item.year}
                </span>
                <span className="text-slate-500 ml-2">({item.date})</span>
                <span className="text-blue-400 ml-2 font-semibold">
                  — {item.title}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
