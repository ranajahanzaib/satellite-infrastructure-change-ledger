import {
  ChangeCandidate,
  GeographicalEntity,
  MonitoringArea,
  ProcessingJob,
  SatelliteObservation,
  SystemStats,
  UserRole,
} from "./types";

const API_BASE = "/api/v1";

class ApiService {
  private role: UserRole = "analyst";

  setRole(role: UserRole) {
    this.role = role;
  }

  getRole(): UserRole {
    return this.role;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = {
      "Content-Type": "application/json",
      "X-User-Role": this.role,
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`API call failed to ${endpoint}:`, err);
      throw err;
    }
  }

  // Stats
  async getSystemStats(): Promise<SystemStats> {
    return this.request<SystemStats>("/system/stats");
  }

  // Areas
  async listAreas(): Promise<{ data: MonitoringArea[]; count: number }> {
    return this.request<{ data: MonitoringArea[]; count: number }>("/areas");
  }

  async getArea(id: string): Promise<MonitoringArea> {
    return this.request<MonitoringArea>(`/areas/${id}`);
  }

  async createArea(payload: Partial<MonitoringArea>): Promise<MonitoringArea> {
    return this.request<MonitoringArea>("/areas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Imagery & STAC
  async listImagery(
    areaId?: string,
  ): Promise<{ data: SatelliteObservation[]; count: number }> {
    const query = areaId ? `?area_id=${areaId}` : "";
    return this.request<{ data: SatelliteObservation[]; count: number }>(
      `/imagery${query}`,
    );
  }

  async searchSTAC(params: {
    bbox: number[];
    start_date?: string;
    end_date?: string;
    max_cloud_cover?: number;
  }): Promise<{ items: any[]; count: number }> {
    return this.request<{ items: any[]; count: number }>("/imagery/search", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async ingestImagery(
    areaId: string,
    itemId: string,
    collection: string,
  ): Promise<any> {
    return this.request<any>("/imagery/ingest", {
      method: "POST",
      body: JSON.stringify({
        area_id: areaId,
        stac_item_id: itemId,
        collection,
      }),
    });
  }

  // Candidates & Ledger
  async listCandidates(
    params: {
      area_id?: string;
      status?: string;
      category?: string;
      search?: string;
      min_score?: number;
    } = {},
  ): Promise<{ data: ChangeCandidate[]; total: number }> {
    const query = new URLSearchParams();
    if (params.area_id) query.set("area_id", params.area_id);
    if (params.status) query.set("status", params.status);
    if (params.category) query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    if (params.min_score) query.set("min_score", params.min_score.toString());
    query.set("limit", "100");

    return this.request<{ data: ChangeCandidate[]; total: number }>(
      `/changes?${query.toString()}`,
    );
  }

  async getCandidate(id: string): Promise<ChangeCandidate> {
    return this.request<ChangeCandidate>(`/changes/${id}`);
  }

  async getCandidateHistory(
    id: string,
  ): Promise<{ data: any[]; count: number }> {
    return this.request<{ data: any[]; count: number }>(
      `/changes/${id}/history`,
    );
  }

  // Verification
  async verifyCandidate(
    id: string,
    reason: string,
    notes: string,
    concurrencyVersion: number,
    correctedCategory?: string,
  ): Promise<any> {
    return this.request<any>(`/changes/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({
        reason,
        notes,
        concurrency_version: concurrencyVersion,
        corrected_category: correctedCategory,
      }),
    });
  }

  async rejectCandidate(
    id: string,
    reason: string,
    notes: string,
    concurrencyVersion: number,
  ): Promise<any> {
    return this.request<any>(`/changes/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({
        reason,
        notes,
        concurrency_version: concurrencyVersion,
      }),
    });
  }

  async requestEvidence(
    id: string,
    reason: string,
    notes: string,
    concurrencyVersion: number,
  ): Promise<any> {
    return this.request<any>(`/changes/${id}/request-evidence`, {
      method: "POST",
      body: JSON.stringify({
        reason,
        notes,
        concurrency_version: concurrencyVersion,
      }),
    });
  }

  // Jobs
  async listJobs(
    areaId?: string,
  ): Promise<{ data: ProcessingJob[]; count: number }> {
    const query = areaId ? `?area_id=${areaId}` : "";
    return this.request<{ data: ProcessingJob[]; count: number }>(
      `/jobs${query}`,
    );
  }

  async triggerDetect(
    areaId: string,
    t1Id: string,
    t2Id: string,
  ): Promise<ProcessingJob> {
    return this.request<ProcessingJob>("/processing/detect", {
      method: "POST",
      body: JSON.stringify({
        area_id: areaId,
        t1_observation_id: t1Id,
        t2_observation_id: t2Id,
      }),
    });
  }

  async retryJob(jobId: string): Promise<ProcessingJob> {
    return this.request<ProcessingJob>(`/jobs/${jobId}/retry`, {
      method: "POST",
    });
  }

  // Entities
  async listEntities(): Promise<{ data: GeographicalEntity[]; count: number }> {
    return this.request<{ data: GeographicalEntity[]; count: number }>(
      "/entities",
    );
  }

  async confirmEntityLink(linkId: string): Promise<any> {
    return this.request<any>(`/entities/${linkId}/confirm`, { method: "POST" });
  }

  async rejectEntityLink(linkId: string): Promise<any> {
    return this.request<any>(`/entities/${linkId}/reject`, { method: "POST" });
  }

  // Audit
  async listAuditEvents(): Promise<{ data: any[]; count: number }> {
    return this.request<{ data: any[]; count: number }>("/audit");
  }

  // Export URLs
  getExportUrl(format: "geojson" | "csv" | "report", areaId?: string): string {
    const areaParam = areaId ? `&area_id=${areaId}` : "";
    return `${API_BASE}/changes/export?format=${format}${areaParam}`;
  }
}

export const api = new ApiService();
