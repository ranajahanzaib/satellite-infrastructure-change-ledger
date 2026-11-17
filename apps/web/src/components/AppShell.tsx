import {
  Activity,
  Building,
  CheckCircle2,
  Clock,
  Cpu,
  FileText,
  Globe,
  MapPin,
  Satellite,
  Settings,
  Shield,
  Split,
} from "lucide-react";
import React from "react";
import { NavTab, useAppStore } from "../store";

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { activeTab, setActiveTab, userRole, notification, clearNotification } =
    useAppStore();

  const navItems: NavItem[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "areas", label: "Monitoring Areas", icon: MapPin },
    { id: "imagery", label: "Satellite Imagery", icon: Globe },
    { id: "comparison", label: "Temporal Comparison", icon: Split },
    { id: "detection", label: "Change Detection", icon: Cpu },
    { id: "ledger", label: "Change Ledger", icon: FileText },
    { id: "review", label: "Review Queue", icon: CheckCircle2, badge: 1 },
    { id: "entities", label: "Entity Explorer", icon: Building },
    { id: "jobs", label: "Processing Jobs", icon: Clock },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Logo & Platform Name */}
          <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs tracking-wider uppercase text-white font-mono">
                SatChange Ledger
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Geospatial Audit Intelligence
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium font-mono transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Role Badge in Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase">Active Role:</span>
            <span className="font-bold uppercase text-blue-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              {userRole}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top App Header */}
        <header className="h-12 bg-[#0a0f1d] border-b border-slate-800 flex items-center justify-between px-6 shrink-0 font-mono text-xs">
          {/* Active Area Pill */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Active Area:</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Apex Industrial Logistics Park</span>
            </div>
          </div>

          {/* System Status Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>API & Processing Ready</span>
            </div>
          </div>
        </header>

        {/* Notification Toast */}
        {notification && (
          <div
            onClick={clearNotification}
            className={`cursor-pointer px-4 py-2 border-b text-xs font-mono flex items-center justify-between transition-all ${
              notification.type === "success"
                ? "bg-emerald-950 border-emerald-800 text-emerald-200"
                : notification.type === "error"
                  ? "bg-rose-950 border-rose-800 text-rose-200"
                  : "bg-blue-950 border-blue-800 text-blue-200"
            }`}
          >
            <span>{notification.message}</span>
            <span className="text-[10px] opacity-70">✕</span>
          </div>
        )}

        {/* View Content */}
        <main className="flex-1 overflow-hidden relative">{children}</main>
      </div>
    </div>
  );
};
