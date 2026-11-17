import React, { useEffect, useState } from "react";
import { api } from "./api";
import { AppShell } from "./components/AppShell";
import { TemporalComparisonWorkspace } from "./components/TemporalComparisonWorkspace";
import { AreaDetailView } from "./features/AreaDetailView";
import { AreasView } from "./features/AreasView";
import { ChangeDetectionView } from "./features/ChangeDetectionView";
import { ChangeLedgerView } from "./features/ChangeLedgerView";
import { EntityExplorerView } from "./features/EntityExplorerView";
import { ImageryExplorerView } from "./features/ImageryExplorerView";
import { JobsView } from "./features/JobsView";
import { OverviewView } from "./features/OverviewView";
import { ReviewQueueView } from "./features/ReviewQueueView";
import { SettingsView } from "./features/SettingsView";
import { useAppStore } from "./store";
import { ChangeCandidate, MonitoringArea, SatelliteObservation } from "./types";

export const App: React.FC = () => {
  const { activeTab, selectedAreaId } = useAppStore();
  const [area, setArea] = useState<MonitoringArea | undefined>(undefined);
  const [observations, setObservations] = useState<SatelliteObservation[]>([]);
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);

  useEffect(() => {
    async function initData() {
      try {
        const [areaRes, obsRes, candsRes] = await Promise.all([
          api.getArea(selectedAreaId).catch(() => undefined),
          api.listImagery(selectedAreaId).catch(() => ({ data: [] })),
          api
            .listCandidates({ area_id: selectedAreaId })
            .catch(() => ({ data: [] })),
        ]);
        if (areaRes) setArea(areaRes);
        setObservations(obsRes.data || []);
        setCandidates(candsRes.data || []);
      } catch (err) {
        console.error("App init failed:", err);
      }
    }
    initData();
  }, [selectedAreaId]);

  const renderActiveView = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewView />;
      case "areas":
        return <AreasView />;
      case "area-detail":
        return <AreaDetailView />;
      case "imagery":
        return <ImageryExplorerView />;
      case "comparison":
        return (
          <TemporalComparisonWorkspace
            area={area}
            observations={observations}
            candidates={candidates}
          />
        );
      case "detection":
        return <ChangeDetectionView />;
      case "ledger":
        return <ChangeLedgerView />;
      case "review":
        return <ReviewQueueView />;
      case "entities":
        return <EntityExplorerView />;
      case "jobs":
        return <JobsView />;
      case "settings":
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  };

  return <AppShell>{renderActiveView()}</AppShell>;
};
