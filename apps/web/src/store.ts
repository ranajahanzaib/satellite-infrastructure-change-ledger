import { create } from "zustand";
import { api } from "./api";
import { UserRole } from "./types";

export type NavTab =
  | "overview"
  | "areas"
  | "area-detail"
  | "imagery"
  | "comparison"
  | "detection"
  | "ledger"
  | "review"
  | "entities"
  | "jobs"
  | "settings";

export type ComparisonMode = "split" | "swipe" | "opacity";

interface AppState {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;

  selectedAreaId: string;
  setSelectedAreaId: (id: string) => void;

  selectedCandidateId: string | null;
  setSelectedCandidateId: (id: string | null) => void;

  // Temporal comparison workspace settings
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;
  t1ObservationId: string;
  setT1ObservationId: (id: string) => void;
  t2ObservationId: string;
  setT2ObservationId: (id: string) => void;
  swipePosition: number;
  setSwipePosition: (pos: number) => void;
  overlayOpacity: number;
  setOverlayOpacity: (opacity: number) => void;
  showDiffLayer: boolean;
  setShowDiffLayer: (show: boolean) => void;
  showChangePolygons: boolean;
  setShowChangePolygons: (show: boolean) => void;
  showEntityOverlays: boolean;
  setShowEntityOverlays: (show: boolean) => void;

  // User role
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;

  // Flash notification
  notification: { message: string; type: "success" | "error" | "info" } | null;
  showNotification: (
    message: string,
    type?: "success" | "error" | "info",
  ) => void;
  clearNotification: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedAreaId: "area-apex-park-01",
  setSelectedAreaId: (id) => set({ selectedAreaId: id }),

  selectedCandidateId: null,
  setSelectedCandidateId: (id) => set({ selectedCandidateId: id }),

  comparisonMode: "swipe",
  setComparisonMode: (mode) => set({ comparisonMode: mode }),
  t1ObservationId: "obs-s2-2016-08-15",
  setT1ObservationId: (id) => set({ t1ObservationId: id }),
  t2ObservationId: "obs-s2-2021-07-10",
  setT2ObservationId: (id) => set({ t2ObservationId: id }),
  swipePosition: 50,
  setSwipePosition: (pos) => set({ swipePosition: pos }),
  overlayOpacity: 70,
  setOverlayOpacity: (opacity) => set({ overlayOpacity: opacity }),
  showDiffLayer: true,
  setShowDiffLayer: (show) => set({ showDiffLayer: show }),
  showChangePolygons: true,
  setShowChangePolygons: (show) => set({ showChangePolygons: show }),
  showEntityOverlays: true,
  setShowEntityOverlays: (show) => set({ showEntityOverlays: show }),

  userRole: "analyst",
  setUserRole: (role) => {
    api.setRole(role);
    set({ userRole: role });
  },

  notification: null,
  showNotification: (message, type = "info") => {
    set({ notification: { message, type } });
    setTimeout(() => {
      set({ notification: null });
    }, 4500);
  },
  clearNotification: () => set({ notification: null }),
}));
