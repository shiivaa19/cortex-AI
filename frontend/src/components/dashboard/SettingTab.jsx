import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Thermometer, MemoryStick, Cpu } from "lucide-react";

import Card from "../common/Card";
import SectionLabel from "../common/SectionLabel";
import { COLORS } from "../../data/colors";

function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function SettingsTab({ tenant, refreshInterval, setRefreshInterval }) {
  const [provider, setProvider] = useState(() => localStorage.getItem("cortex_ai_provider") || "groq");
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("cortex_api_key_gemini") || "");
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem("cortex_api_key_openai") || "");
  const [grokKey, setGrokKey] = useState(() => localStorage.getItem("cortex_api_key_grok") || "");
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem("cortex_api_key_groq") || "");

  useEffect(() => {
    localStorage.setItem("cortex_ai_provider", provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem("cortex_api_key_gemini", geminiKey);
  }, [geminiKey]);

  useEffect(() => {
    localStorage.setItem("cortex_api_key_openai", openaiKey);
  }, [openaiKey]);

  useEffect(() => {
    localStorage.setItem("cortex_api_key_grok", grokKey);
  }, [grokKey]);

  useEffect(() => {
    localStorage.setItem("cortex_api_key_groq", groqKey);
  }, [groqKey]);

  const activeKey = provider === "gemini" ? geminiKey : provider === "openai" ? openaiKey : provider === "grok" ? grokKey : groqKey;
  const setActiveKey = provider === "gemini" ? setGeminiKey : provider === "openai" ? setOpenaiKey : provider === "grok" ? setGrokKey : setGroqKey;
  const spark = useMemo(() => {
    const rnd = seededRand((tenant.seed || 42) + 99);
    return Array.from({ length: 40 }, (_, i) => ({
      t: i,
      temp: 45 + rnd() * 12,
      ram: 8 + rnd() * 8,
    }));
  }, [tenant]);

  return (
    <div className="space-y-4 pb-4 grid grid-cols-1 lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      <Card>
        <SectionLabel>TENANT INFO</SectionLabel>
        <div className="text-sm font-semibold">{tenant.name}</div>
        <div className="text-xs text-gray-400">
          {tenant.location} · id: {tenant.id}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Contracted demand: {tenant.contracted_demand_kva} kVA · {tenant.tariffCode}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <SectionLabel>REFRESH INTERVAL</SectionLabel>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1"
          >
            <option value={5}>5 s</option>
            <option value={30}>30 s</option>
            <option value={300}>300 s</option>
          </select>
        </div>
      </Card>

      <Card>
        <SectionLabel sub="Chatbot AI intelligence settings">AI PROVIDER & KEY</SectionLabel>
        
        <div className="mt-2 space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">PROVIDER</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            >
              <option value="gemini">Google Gemini AI</option>
              <option value="openai">OpenAI GPT</option>
              <option value="grok">xAI Grok</option>
              <option value="groq">Groq LPU</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 block mb-1">
              {provider.toUpperCase()} API KEY
            </label>
            <input
              type="password"
              value={activeKey}
              onChange={(e) => setActiveKey(e.target.value)}
              placeholder={
                provider === "gemini" ? "AIzaSy..." : provider === "openai" ? "sk-proj-..." : provider === "grok" ? "xai-..." : "gsk_..."
              }
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="text-[10px] text-gray-400 mt-2">
          Grounded directly in cortex_mock_data.csv. Stored locally in your browser.
        </div>
      </Card>

      <Card>
        <SectionLabel sub="Raspberry Pi Gateway">EDGE NODE · RASPBERRY PI HEALTH</SectionLabel>
        <div className="grid grid-cols-3 gap-2 my-2">
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <Thermometer size={14} className="mx-auto text-gray-400" />
            <div className="text-sm font-semibold mt-1">51°C</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <MemoryStick size={14} className="mx-auto text-gray-400" />
            <div className="text-sm font-semibold mt-1">12%</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <Cpu size={14} className="mx-auto text-gray-400" />
            <div className="text-sm font-semibold mt-1">0%</div>
          </div>
        </div>
        <div className="text-[10px] text-gray-400 mb-1">PI TEMPERATURE · LAST 24H</div>
        <ResponsiveContainer width="100%" height={90}>
          <AreaChart data={spark}>
            <Area type="monotone" dataKey="temp" stroke={COLORS.good} fill="#d1fae5" strokeWidth={1.5} />
            <ReferenceLine y={65} stroke={COLORS.warn} strokeDasharray="3 3" />
            <ReferenceLine y={75} stroke={COLORS.bad} strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}