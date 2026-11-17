import { Building, ExternalLink, MapPin } from "lucide-react";
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useAppStore } from "../store";
import { GeographicalEntity } from "../types";

export const EntityExplorerView: React.FC = () => {
  const { showNotification } = useAppStore();
  const [entities, setEntities] = useState<GeographicalEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const res = await api.listEntities();
      setEntities(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6 font-mono text-xs">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Building className="w-5 h-5 text-blue-500" />
          <span>Geographical Entity Linking (OSM & Wikidata)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Bridge remote sensing change footprints with real-world OpenStreetMap
          infrastructure polygons and Wikidata knowledge graphs.
        </p>
      </div>

      {/* Entities Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Entity Name</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Wikidata QID</th>
              <th className="py-3 px-4">OSM Identifier</th>
              <th className="py-3 px-4">Centroid Coordinates</th>
              <th className="py-3 px-4 text-right">External Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {entities.map((ent) => (
              <tr key={ent.id} className="hover:bg-slate-800/40 transition">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{ent.name}</span>
                </td>
                <td className="py-3 px-4 uppercase text-slate-300">
                  {ent.entity_type.replace("_", " ")}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 text-blue-400 border border-slate-800">
                    {ent.source}
                  </span>
                </td>
                <td className="py-3 px-4 text-amber-300 font-semibold">
                  {ent.wikidata_id || "—"}
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {ent.osm_id || "—"}
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {ent.centroid
                    ? `${ent.centroid[1]?.toFixed(4)}°N, ${ent.centroid[0]?.toFixed(4)}°W`
                    : "—"}
                </td>
                <td className="py-3 px-4 text-right">
                  {ent.wikidata_id && (
                    <a
                      href={`https://www.wikidata.org/wiki/${ent.wikidata_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
                    >
                      <span>Wikidata</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
