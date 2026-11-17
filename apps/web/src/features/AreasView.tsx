import { ChevronRight, MapPin, Plus, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAppStore } from "../store";
import { MonitoringArea } from "../types";

export const AreasView: React.FC = () => {
  const { setSelectedAreaId, setActiveTab } = useAppStore();
  const [areas, setAreas] = useState<MonitoringArea[]>([]);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaDesc, setNewAreaDesc] = useState("");

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      const res = await api.listAreas();
      setAreas(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    try {
      const created = await api.createArea({
        name: newAreaName,
        description: newAreaDesc,
        bbox: [-122.445, 37.765, -122.415, 37.785],
        area_km2: 4.82,
      });
      setAreas([created, ...areas]);
      setShowCreateModal(false);
      setNewAreaName("");
      setNewAreaDesc("");
    } catch (err) {
      alert("Failed to create area: " + err);
    }
  };

  const filtered = areas.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            <span>Monitoring Areas</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Geographical boundaries and multi-temporal surveillance regions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Monitoring Area</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          placeholder="Filter areas by name, identifier, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-md text-xs text-slate-200 outline-none focus:border-blue-500 transition font-mono"
        />
      </div>

      {/* Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a) => (
          <div
            key={a.id}
            onClick={() => {
              setSelectedAreaId(a.id);
              setActiveTab("area-detail");
            }}
            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-lg cursor-pointer transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 transition">
                  {a.name}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {a.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                {a.description}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
              <div>
                Extent:{" "}
                <span className="text-white font-semibold">
                  {a.area_km2} km²
                </span>
              </div>
              <div className="flex items-center gap-1 text-blue-400 group-hover:translate-x-0.5 transition-transform">
                <span>Inspect</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateArea}
            className="bg-slate-900 border border-slate-700 rounded-lg p-5 max-w-md w-full shadow-2xl font-mono text-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sm text-white">
                Create Monitoring Area
              </span>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Area Name:</label>
              <input
                type="text"
                required
                placeholder="e.g. Delta Logistics Hub Phase 2"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Description:</label>
              <textarea
                rows={3}
                placeholder="Surveillance purpose and infrastructure category..."
                value={newAreaDesc}
                onChange={(e) => setNewAreaDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 font-semibold"
              >
                Create Area
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
