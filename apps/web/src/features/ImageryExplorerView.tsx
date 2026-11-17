import { CheckCircle2, Download, Globe, Search } from "lucide-react";
import React, { useState } from "react";
import { api } from "../api";
import { useAppStore } from "../store";

export const ImageryExplorerView: React.FC = () => {
  const { showNotification } = useAppStore();
  const [startDate, setStartDate] = useState("2016-01-01");
  const [endDate, setEndDate] = useState("2023-12-31");
  const [maxCloud, setMaxCloud] = useState(15);
  const [collection, setCollection] = useState("sentinel-2-l2a");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [ingestingId, setIngestingId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const res = await api.searchSTAC({
        bbox: [-122.445, 37.765, -122.415, 37.785],
        start_date: startDate,
        end_date: endDate,
        max_cloud_cover: maxCloud,
      });
      setResults(res.items || []);
      showNotification(
        `Discovered ${res.items?.length || 0} STAC acquisitions`,
        "success",
      );
    } catch (err) {
      showNotification("STAC discovery error: " + err, "error");
    } finally {
      setSearching(false);
    }
  };

  const handleIngest = async (item: any) => {
    setIngestingId(item.item_id);
    try {
      await api.ingestImagery(
        "area-apex-park-01",
        item.item_id,
        item.collection,
      );
      showNotification(`Ingestion job queued for ${item.item_id}`, "success");
      item.ingested = true;
    } catch (err) {
      showNotification("Ingestion error: " + err, "error");
    } finally {
      setIngestingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          <span>Satellite Imagery Discovery (STAC)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Query SpatioTemporal Asset Catalogs (Planetary Computer / Earth
          Search) for Sentinel-2 Level-2A and Landsat acquisitions.
        </p>
      </div>

      {/* Query Form */}
      <form
        onSubmit={handleSearch}
        className="bg-slate-900 border border-slate-800 p-4 rounded-lg font-mono text-xs"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-slate-400 mb-1">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Max Cloud Cover (%):
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={maxCloud}
              onChange={(e) => setMaxCloud(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              STAC Collection:
            </label>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="sentinel-2-l2a">
                Copernicus Sentinel-2 Level-2A
              </option>
              <option value="landsat-c2-l2">
                USGS Landsat Collection 2 Tier 1
              </option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-4 pt-3 border-t border-slate-800/80">
          <button
            type="submit"
            disabled={searching}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded shadow transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{searching ? "Querying STAC..." : "Search Catalog"}</span>
          </button>
        </div>
      </form>

      {/* Results List */}
      <div>
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
          Discovered STAC Items ({results.length})
        </h3>

        {results.length === 0 && !searching && (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-8 text-center text-xs font-mono text-slate-400">
            Click 'Search Catalog' above to discover multi-temporal satellite
            observations intersecting Apex Industrial Park.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {results.map((item) => (
            <div
              key={item.item_id}
              className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between font-mono text-xs"
            >
              <div>
                <div className="h-32 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-800">
                  <img
                    src={item.thumbnail}
                    alt={item.item_id}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-900/90 text-slate-200 border border-slate-700">
                    Cloud: {item.cloud_cover}%
                  </div>
                </div>

                <div className="p-3">
                  <div className="font-semibold text-slate-200 truncate">
                    {item.item_id}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Platform: {item.platform}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Date: {item.datetime?.slice(0, 10)}
                  </div>
                </div>
              </div>

              <div className="p-3 pt-0">
                {item.ingested ? (
                  <div className="w-full py-1.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-center text-[11px] font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ingested & COG Ready</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleIngest(item)}
                    disabled={ingestingId === item.item_id}
                    className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-[11px] flex items-center justify-center gap-1 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {ingestingId === item.item_id
                        ? "Ingesting..."
                        : "Ingest Asset"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
