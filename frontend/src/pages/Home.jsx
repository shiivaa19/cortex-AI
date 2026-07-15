import { useState, useEffect } from "react";
import { io } from "socket.io-client";

import PowerTab from "../components/dashboard/PowerTab";
import BillingTab from "../components/dashboard/BillingTab";
import AlertsTab from "../components/dashboard/AlertsTab";
import AnomalyTab from "../components/dashboard/AnomalyTab";
import SettingTab from "../components/dashboard/SettingTab";
import ChatPanel from "../components/chatbot/ChatPanel";
import Skeleton from "../components/common/Skeleton";

import { fetchTenants } from "../api/client";
import useApi from "../hooks/useApi";

import {
  Activity,
  AlertTriangle,
  Receipt,
  Bell,
  Settings as SettingsIcon,
} from "lucide-react";

const TABS = [
  { id: "power", label: "Power", icon: Activity },
  { id: "anomaly", label: "Anomaly", icon: AlertTriangle },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function Home() {
  const { data: tenants, loading, error } = useApi(fetchTenants);
  const [tenantId, setTenantId] = useState("");
  const [tab, setTab] = useState("power");
  const [chatOpen, setChatOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [alerts, setAlerts] = useState([]);
  const [live, setLive] = useState(false);

  // Set default tenant once loaded
  useEffect(() => {
    if (tenants && tenants.length > 0 && !tenantId) {
      setTenantId(tenants[0].id);
    }
  }, [tenants, tenantId]);

  const tenant = tenants?.find((t) => t.id === tenantId);

  function switchTenant(id) {
    setTenantId(id);
    setAlerts([]);
    setTab("power");
    setChatOpen(false);
  }

  // Socket.IO real-time alert connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(`${socketUrl}/telemetry`, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("Connected to /telemetry room via Socket.IO");
      setLive(true);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from /telemetry room");
      setLive(false);
    });

    socket.on("alert", (alert) => {
      setAlerts((a) => [alert, ...a].slice(0, 15));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="text-center font-semibold text-gray-900 mb-4">Cortex Loading</div>
          <Skeleton lines={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md bg-white border border-red-100 rounded-3xl p-6 text-center shadow-sm">
          <div className="text-red-500 font-semibold mb-2">Failed to Load Dashboard</div>
          <div className="text-xs text-gray-500 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs bg-gray-900 text-white px-4 py-2 rounded-full font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!tenant) return null;

  return (
    <div className="min-h-screen bg-custom-theme flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation - Desktop only */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-white/80 backdrop-blur-md border-r border-gray-200/50 min-h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Cortex AI
          </div>
          <div className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Telemetry Platform</div>
        </div>

        {/* Tenant selector in sidebar */}
        <div className="p-4 border-b border-gray-100">
          <label className="text-[10px] text-gray-400 font-semibold block mb-1.5 uppercase tracking-wider">Select Site</label>
          <select
            value={tenantId}
            onChange={(e) => switchTenant(e.target.value)}
            className="w-full text-xs font-medium border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Tabs */}
        <nav className="flex-1 p-4 space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const activeTab = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Live Feed Status */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">Live Telemetry</span>
          {live ? (
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Connecting
            </span>
          )}
        </div>
      </aside>

      {/* Main Content wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header - Mobile only */}
        <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100/50 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">Cortex</div>
            <div className="text-[10px] text-gray-400">Industrial Intelligence Platform</div>
          </div>
          <div className="flex items-center gap-2">
            {live ? (
              <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                live
              </span>
            ) : (
              <span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                reconnecting
              </span>
            )}
            <select
              value={tenantId}
              onChange={(e) => switchTenant(e.target.value)}
              className="text-xs font-medium border border-gray-200 rounded-full px-3 py-1.5 bg-white"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {tab === "power" && <PowerTab tenant={tenant} live={live} />}
          {tab === "anomaly" && <AnomalyTab tenant={tenant} />}
          {tab === "billing" && <BillingTab tenant={tenant} />}
          {tab === "alerts" && <AlertsTab tenant={tenant} alerts={alerts} />}
          {tab === "settings" && (
            <SettingTab
              tenant={tenant}
              refreshInterval={refreshInterval}
              setRefreshInterval={setRefreshInterval}
            />
          )}
        </main>

        {/* Mobile Tab Navigation - Mobile only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-t border-gray-100/50 flex justify-around py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const activeTab = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex flex-col items-center gap-0.5 px-2 py-1 animate-fade-in"
              >
                <Icon size={18} color={activeTab ? "#10b981" : "#9ca3af"} />
                <span className={`text-[9px] ${activeTab ? "text-emerald-500 font-medium" : "text-gray-400"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Chatbot trigger and panel (works responsively on both) */}
        <ChatPanel tenant={tenant} open={chatOpen} setOpen={setChatOpen} />
      </div>
    </div>
  );
}