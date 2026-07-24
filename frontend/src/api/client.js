import axios from "axios";
import { answerQuestion as answerQuestionLocal } from "../components/chatbot/answerQuestion";

let baseUrl = import.meta.env.VITE_API_URL || "/api";
if (import.meta.env.PROD && (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost"))) {
  baseUrl = "/api";
}

const api = axios.create({
  baseURL: baseUrl,
  timeout: 15000,
});

// Seeded random number generator for consistent simulation
function seededRand(seed) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
}

// safeGet wrapper that returns simulated fallback data on connection failure
async function safeGet(url, fallbackValue) {
  try {
    const { data } = await api.get(url);
    return data;
  } catch (err) {
    console.warn(`[Cortex Offline Mode] Backend unreachable for ${url}. Loading local simulation.`);
    return typeof fallbackValue === "function" ? fallbackValue() : fallbackValue;
  }
}

// ── Tenants ──────────────────────────────────────────────
export async function fetchTenants() {
  return safeGet("/tenants", [
    {
      id: "tenant_a",
      name: "Factory Site Alpha (Simulation)",
      location: "Sector 4, Industrial Area",
      contracted_demand_kva: 350,
      tariffCode: "HT-1 Industrial",
      seed: 42
    }
  ]);
}

export async function fetchTenant(tenantId) {
  return safeGet(`/tenant/${tenantId}`, {
    id: "tenant_a",
    name: "Factory Site Alpha (Simulation)",
    location: "Sector 4, Industrial Area",
    contracted_demand_kva: 350,
    tariffCode: "HT-1 Industrial",
    seed: 42
  });
}

// ── Power metrics ────────────────────────────────────────
export async function fetchHourly(tenantId, range = "Today") {
  return safeGet(`/power/hourly/${tenantId}?range=${range}`, () => {
    const rnd = seededRand(42);
    const length = range === "Today" ? 24 : range === "Week" ? 7 : 30;
    return Array.from({ length }, (_, i) => ({
      label: range === "Today" ? `${i}:00` : range === "Week" ? `Day ${i+1}` : `Day ${i+1}`,
      kwh: Math.round(150 + rnd() * 120),
      zone: i >= 18 && i <= 22 ? "Peak" : i >= 22 || i <= 6 ? "Off-Peak" : "Normal"
    }));
  });
}

export async function fetchPF(tenantId, range = "Today") {
  return safeGet(`/power/pf/${tenantId}?range=${range}`, () => {
    const rnd = seededRand(88);
    return Array.from({ length: 15 }, (_, i) => ({
      label: `${i * 2}h`,
      pf: parseFloat((0.92 + rnd() * 0.07).toFixed(3))
    }));
  });
}

export async function fetchDemandUtil(tenantId, range = "Today") {
  return safeGet(`/power/demand-util/${tenantId}?range=${range}`, () => {
    const rnd = seededRand(102);
    return Array.from({ length: 10 }, (_, i) => ({
      label: `H${i+1}`,
      util: Math.round(65 + rnd() * 40)
    }));
  });
}

export async function fetchActiveApparent(tenantId, range = "Today") {
  return safeGet(`/power/active-apparent/${tenantId}?range=${range}`, () => {
    const rnd = seededRand(15);
    return Array.from({ length: 12 }, (_, i) => ({
      label: `${i * 2}:00`,
      kW: Math.round(120 + rnd() * 90),
      kVA: Math.round(130 + rnd() * 95)
    }));
  });
}

export async function fetchLoadFactor(tenantId, range = "Today") {
  return safeGet(`/power/load-factor/${tenantId}?range=${range}`, () => {
    const rnd = seededRand(200);
    return Array.from({ length: 10 }, (_, i) => ({
      label: `P${i+1}`,
      lf: Math.round(60 + rnd() * 30)
    }));
  });
}

export async function fetchPhaseVoltage(tenantId, range = "Today") {
  return safeGet(`/power/phase-voltage/${tenantId}?range=${range}`, () => {
    const rnd = seededRand(99);
    return Array.from({ length: 12 }, (_, i) => ({
      label: `${i * 2}:00`,
      R_V: Math.round(234 + rnd() * 8),
      Y_V: Math.round(232 + rnd() * 9),
      B_V: Math.round(235 + rnd() * 7),
      R_I: Math.round(140 + rnd() * 110),
      Y_I: Math.round(135 + rnd() * 115),
      B_I: Math.round(145 + rnd() * 105)
    }));
  });
}

// ── Anomalies ────────────────────────────────────────────
export async function fetchAnomalies(tenantId) {
  return safeGet(`/anomalies/${tenantId}`, [
    {
      id: "a1",
      title: "Voltage Unbalance Detected",
      desc: "Phase R voltage dropped below 220V for 15 minutes, causing a minor unbalance.",
      level: "medium",
      time: "2 hours ago"
    },
    {
      id: "a2",
      title: "Power Factor Penalty Risk",
      desc: "Average Power Factor dropped to 0.82 between 14:00 and 15:00.",
      level: "high",
      time: "4 hours ago"
    }
  ]);
}

// ── Billing ──────────────────────────────────────────────
export async function fetchBill(tenantId) {
  return safeGet(`/bill/${tenantId}`, {
    kwh: 85200,
    lastMonthKwh: 81400,
    energyCharge: 596400,
    demandCharge: 125000,
    demandPenalty: 15000,
    pfIncentive: -4200,
    todAdder: 23500,
    total: 755700
  });
}

// ── Chat ─────────────────────────────────────────────────
export async function sendChatMessage(tenantId, question) {
  try {
    const provider = localStorage.getItem("cortex_ai_provider") || "groq";
    const apiKey = localStorage.getItem(`cortex_api_key_${provider}`);
    const headers = {};
    if (provider) headers["X-AI-Provider"] = provider;
    if (apiKey) headers["X-API-Key"] = apiKey;
    const { data } = await api.post(`/chat/${tenantId}`, { question }, { headers });
    return data;
  } catch (err) {
    console.warn("[API Connection Error] Chat API failed. Processing locally via offline fallback rules.", err);
    const result = await answerQuestionLocal(question);
    return {
      text: result.text,
      cites: [
        ...(result.cites || []),
        "Local offline query engine",
        "cortex_mock_data.xlsx.ods (Local copy)",
        "Offline Fallback Mode (Phone / Offline)"
      ]
    };
  }
}

export default api;
