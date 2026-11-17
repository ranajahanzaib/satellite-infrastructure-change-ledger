import {
  ChangeCandidate,
  MonitoringArea,
  UserRole,
} from "@satledger/shared-types";

export class SatLedgerClient {
  private baseUrl: string;
  private userRole: UserRole;

  constructor(
    baseUrl: string = "http://localhost:8080/api/v1",
    userRole: UserRole = "analyst",
  ) {
    this.baseUrl = baseUrl;
    this.userRole = userRole;
  }

  setRole(role: UserRole) {
    this.userRole = role;
  }

  private async fetchJson<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = {
      "Content-Type": "application/json",
      "X-User-Role": this.userRole,
      ...(options.headers || {}),
    };
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  async listAreas(): Promise<{ data: MonitoringArea[]; count: number }> {
    return this.fetchJson<{ data: MonitoringArea[]; count: number }>("/areas");
  }

  async listCandidates(
    areaId?: string,
  ): Promise<{ data: ChangeCandidate[]; total: number }> {
    const query = areaId ? `?area_id=${areaId}` : "";
    return this.fetchJson<{ data: ChangeCandidate[]; total: number }>(
      `/changes${query}`,
    );
  }

  async verifyCandidate(
    candidateId: string,
    reason: string,
    notes: string,
    concurrencyVersion: number,
  ): Promise<any> {
    return this.fetchJson<any>(`/changes/${candidateId}/verify`, {
      method: "POST",
      body: JSON.stringify({
        reason,
        notes,
        concurrency_version: concurrencyVersion,
      }),
    });
  }
}
