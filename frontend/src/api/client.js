import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});

// ── Tenants ──────────────────────────────────────────────
export async function fetchTenants() {
  const { data } = await api.get("/tenants");
  return data;
}

export async function fetchTenant(tenantId) {
  const { data } = await api.get(`/tenant/${tenantId}`);
  return data;
}

// ── Power metrics ────────────────────────────────────────
export async function fetchHourly(tenantId, range = "Today") {
  const { data } = await api.get(`/power/hourly/${tenantId}?range=${range}`);
  return data;
}

export async function fetchPF(tenantId, range = "Today") {
  const { data } = await api.get(`/power/pf/${tenantId}?range=${range}`);
  return data;
}

export async function fetchDemandUtil(tenantId, range = "Today") {
  const { data } = await api.get(`/power/demand-util/${tenantId}?range=${range}`);
  return data;
}

export async function fetchActiveApparent(tenantId, range = "Today") {
  const { data } = await api.get(`/power/active-apparent/${tenantId}?range=${range}`);
  return data;
}

export async function fetchLoadFactor(tenantId, range = "Today") {
  const { data } = await api.get(`/power/load-factor/${tenantId}?range=${range}`);
  return data;
}

export async function fetchPhaseVoltage(tenantId, range = "Today") {
  const { data } = await api.get(`/power/phase-voltage/${tenantId}?range=${range}`);
  return data;
}

// ── Anomalies ────────────────────────────────────────────
export async function fetchAnomalies(tenantId) {
  const { data } = await api.get(`/anomalies/${tenantId}`);
  return data;
}

// ── Billing ──────────────────────────────────────────────
export async function fetchBill(tenantId) {
  const { data } = await api.get(`/bill/${tenantId}`);
  return data;
}

// ── Chat ─────────────────────────────────────────────────
export async function sendChatMessage(tenantId, question) {
  const provider = localStorage.getItem("cortex_ai_provider") || "groq";
  const apiKey = localStorage.getItem(`cortex_api_key_${provider}`);
  const headers = {};
  if (provider) headers["X-AI-Provider"] = provider;
  if (apiKey) headers["X-API-Key"] = apiKey;
  const { data } = await api.post(`/chat/${tenantId}`, { question }, { headers });
  return data;
}

export default api;
