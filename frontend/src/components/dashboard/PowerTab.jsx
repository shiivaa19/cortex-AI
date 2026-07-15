import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { CircleDot } from "lucide-react";

import Card from "../common/Card";
import RangeTabs from "../common/RangeTabs";
import SectionLabel from "../common/SectionLabel";
import { ChartSkeleton } from "../common/Skeleton";

import useApi from "../../hooks/useApi";
import {
  fetchHourly,
  fetchPF,
  fetchDemandUtil,
  fetchActiveApparent,
  fetchLoadFactor,
  fetchPhaseVoltage,
} from "../../api/client";

import { COLORS } from "../../data/colors";

export default function PowerTab({ tenant, live }) {
  const [range, setRange] = useState("Today");

  const { data: hourly } = useApi(() => fetchHourly(tenant.id, range), [tenant.id, range]);
  const { data: pf } = useApi(() => fetchPF(tenant.id, range), [tenant.id, range]);
  const { data: demandUtil } = useApi(() => fetchDemandUtil(tenant.id, range), [tenant.id, range]);
  const { data: activeApparent } = useApi(() => fetchActiveApparent(tenant.id, range), [tenant.id, range]);
  const { data: loadFactor } = useApi(() => fetchLoadFactor(tenant.id, range), [tenant.id, range]);
  const { data: phaseV } = useApi(() => fetchPhaseVoltage(tenant.id, range), [tenant.id, range]);

  const [voltageView, setVoltageView] = useState("Voltage");
  const [phases, setPhases] = useState({ R: true, Y: true, B: true });

  const avgKwh = useMemo(
    () => (hourly ? (hourly.reduce((a, b) => a + b.kwh, 0) / hourly.length).toFixed(2) : "—"),
    [hourly]
  );
  const peakKwh = useMemo(
    () => (hourly ? Math.max(...hourly.map((h) => h.kwh)).toFixed(2) : "—"),
    [hourly]
  );
  const minKwh = useMemo(
    () => (hourly ? Math.min(...hourly.map((h) => h.kwh)).toFixed(2) : "—"),
    [hourly]
  );
  const pfNow = pf ? pf[pf.length - 1]?.pf ?? 0 : "—";
  const utilNow = demandUtil ? demandUtil[demandUtil.length - 1]?.util ?? 0 : "—";
  const lfNow = loadFactor ? loadFactor[loadFactor.length - 1]?.lf ?? 0 : "—";

  const barColor = (zone) =>
    zone === "Peak" ? COLORS.active : zone === "Off-Peak" ? "#93c5fd" : COLORS.good;

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-amber-50 border-amber-100">
          <div className="text-[11px] text-amber-700 font-medium">
            AVG ACTIVE POWER
          </div>
          <div className="text-xl font-semibold text-amber-800">
            {avgKwh} kW
          </div>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <div className="text-[11px] text-blue-700 font-medium">
            AVG APPARENT POWER
          </div>
          <div className="text-xl font-semibold text-blue-800">
            {hourly ? (parseFloat(avgKwh) * 1.02).toFixed(1) : "—"} kVA
          </div>
        </Card>
      </div>

      <Card>
        <SectionLabel sub="kWh · energy per hour · Across today">
          ENERGY BY TIME-OF-DAY
        </SectionLabel>
        <RangeTabs value={range} onChange={setRange} />
        {!hourly ? (
          <ChartSkeleton />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="kwh" radius={[3, 3, 0, 0]}>
                  {hourly.map((entry, i) => (
                    <Cell key={i} fill={barColor(entry.zone)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-[11px] text-gray-500 mt-1 mb-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#93c5fd" }} />
                Off-Peak
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.good }} />
                Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.active }} />
                Peak
              </span>
            </div>
            <div className="grid grid-cols-3 text-center border-t border-gray-100 pt-2">
              <div>
                <div className="text-[10px] text-gray-400">MIN KWH</div>
                <div className="text-sm font-semibold">{minKwh} kWh</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400">AVG KWH</div>
                <div className="text-sm font-semibold text-emerald-600">{avgKwh} kWh</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400">PEAK KWH</div>
                <div className="text-sm font-semibold text-orange-500">{peakKwh} kWh</div>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card>
        <SectionLabel sub="today average">POWER FACTOR</SectionLabel>
        <div className="text-2xl font-semibold text-emerald-600 -mt-1">{pfNow}</div>
        {!pf ? (
          <ChartSkeleton height={160} />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={pf}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis domain={[0.5, 1]} tick={{ fontSize: 10 }} width={30} />
              <Tooltip />
              <ReferenceLine
                y={0.92}
                stroke={COLORS.good}
                strokeDasharray="4 4"
                label={{ value: "Rebate 0.92", fontSize: 9, position: "insideTopRight", fill: COLORS.good }}
              />
              <ReferenceLine
                y={0.86}
                stroke={COLORS.active}
                strokeDasharray="4 4"
                label={{ value: "Penalty < 0.86", fontSize: 9, position: "insideBottomRight", fill: COLORS.active }}
              />
              <Line type="monotone" dataKey="pf" stroke="#0ea5e9" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <SectionLabel sub="Today · (peak kVA today / CD)×100">
          CONTRACT DEMAND UTILISATION
        </SectionLabel>
        <div className="text-2xl font-semibold -mt-1">{utilNow}%</div>
        {!demandUtil ? (
          <ChartSkeleton height={150} />
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={demandUtil}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} width={35} unit="%" />
              <Tooltip />
              <ReferenceLine y={100} stroke={COLORS.bad} strokeDasharray="4 4" />
              <Bar dataKey="util" radius={[3, 3, 0, 0]}>
                {demandUtil.map((d, i) => (
                  <Cell key={i} fill={d.util > 100 ? COLORS.bad : COLORS.apparent} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <SectionLabel sub="Last 24 hours · kW (active) and kVA (apparent)">
          ACTIVE POWER & APPARENT POWER{" "}
          {live && (
            <span className="ml-1 text-[9px] font-normal text-emerald-500 align-middle">
              ● live
            </span>
          )}
        </SectionLabel>
        {!activeApparent ? (
          <ChartSkeleton height={170} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={activeApparent}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Line type="monotone" dataKey="kW" stroke={COLORS.active} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="kVA" stroke={COLORS.apparent} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-amber-50 rounded-xl p-2 text-center">
                <div className="text-[10px] text-amber-700">AVG ACTIVE POWER</div>
                <div className="text-sm font-semibold text-amber-800">
                  {hourly ? (parseFloat(avgKwh) * 0.98).toFixed(1) : "—"} kW
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-2 text-center">
                <div className="text-[10px] text-blue-700">AVG APPARENT POWER</div>
                <div className="text-sm font-semibold text-blue-800">
                  {hourly ? (parseFloat(avgKwh) * 1.02).toFixed(1) : "—"} kVA
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card>
        <SectionLabel sub="Total Energy (kWh) consumed today / (Peak kW observed today × hours today)">
          LOAD FACTOR UTILISATION
        </SectionLabel>
        <div
          className="text-2xl font-semibold -mt-1"
          style={{ color: lfNow > 70 ? COLORS.good : lfNow > 60 ? COLORS.warn : COLORS.bad }}
        >
          {lfNow}%
        </div>
        {!loadFactor ? (
          <ChartSkeleton height={150} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={loadFactor}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} width={35} unit="%" />
                <Tooltip />
                <ReferenceLine y={70} stroke={COLORS.good} strokeDasharray="4 4" label={{ value: "Rebate 70%", fontSize: 9, fill: COLORS.good }} />
                <ReferenceLine y={60} stroke={COLORS.warn} strokeDasharray="4 4" />
                <Bar dataKey="lf" radius={[3, 3, 0, 0]}>
                  {loadFactor.map((d, i) => (
                    <Cell key={i} fill={d.lf > 70 ? COLORS.good : d.lf > 60 ? COLORS.warn : COLORS.bad} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-[11px] text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.bad }} />
                Penalty zone
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.warn }} />
                No adjustment
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: COLORS.good }} />
                Rebate zone
              </span>
            </div>
          </>
        )}
      </Card>

      <div className="text-xs font-semibold text-gray-500 pt-1">Deep dive</div>

      <Card>
        {(() => {
          const keySuffix = voltageView === "Voltage" ? "_V" : "_I";
          const unit = voltageView === "Voltage" ? " V" : " A";
          const lastVal = (phaseV && phaseV.length > 0) ? phaseV[phaseV.length - 1] : {};
          
          return (
            <>
              <SectionLabel sub={`Per-phase · ${range}`}>
                {voltageView === "Voltage" ? "PHASE VOLTAGE (L-N)" : "PHASE CURRENT"}
              </SectionLabel>
              {!phaseV ? (
                <ChartSkeleton height={170} />
              ) : (
                <>
                  <div className="text-2xl font-semibold -mt-1">
                    {lastVal[`R${keySuffix}`] !== undefined ? `${lastVal[`R${keySuffix}`]}${unit}` : "—"}
                  </div>
                  <div className="flex gap-2 my-2">
                    {["Voltage", "Current"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setVoltageView(v)}
                        className={`text-xs px-3 py-1 rounded-full ${
                          voltageView === v ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                    <div className="flex-1" />
                    {["R", "Y", "B"].map((p, i) => (
                      <button
                        key={p}
                        onClick={() => setPhases((s) => ({ ...s, [p]: !s[p] }))}
                        className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                        style={{
                          background: phases[p] ? ["#fee2e2", "#fef3c7", "#dbeafe"][i] : "#f3f4f6",
                          color: phases[p] ? ["#dc2626", "#d97706", "#2563eb"][i] : "#9ca3af",
                        }}
                      >
                        <CircleDot size={10} />
                        {p}
                      </button>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={170}>
                    <LineChart data={phaseV}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} width={30} />
                      <Tooltip />
                      {phases.R && <Line type="monotone" dataKey={`R${keySuffix}`} stroke="#dc2626" dot={false} strokeWidth={1.5} />}
                      {phases.Y && <Line type="monotone" dataKey={`Y${keySuffix}`} stroke="#d97706" dot={false} strokeWidth={1.5} />}
                      {phases.B && <Line type="monotone" dataKey={`B${keySuffix}`} stroke="#2563eb" dot={false} strokeWidth={1.5} />}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-4 text-center border-t border-gray-100 pt-2 mt-1">
                    <div>
                      <div className="text-[9px] text-gray-400">PHASE R</div>
                      <div className="text-xs font-semibold text-red-600">
                        {lastVal[`R${keySuffix}`] !== undefined ? `${lastVal[`R${keySuffix}`]}${unit}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-400">PHASE Y</div>
                      <div className="text-xs font-semibold text-amber-600">
                        {lastVal[`Y${keySuffix}`] !== undefined ? `${lastVal[`Y${keySuffix}`]}${unit}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-400">PHASE B</div>
                      <div className="text-xs font-semibold text-blue-600">
                        {lastVal[`B${keySuffix}`] !== undefined ? `${lastVal[`B${keySuffix}`]}${unit}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-gray-400">AVERAGE</div>
                      <div className="text-xs font-semibold">
                        {lastVal[`R${keySuffix}`] !== undefined &&
                        lastVal[`Y${keySuffix}`] !== undefined &&
                        lastVal[`B${keySuffix}`] !== undefined
                          ? `${((lastVal[`R${keySuffix}`] + lastVal[`Y${keySuffix}`] + lastVal[`B${keySuffix}`]) / 3).toFixed(1)}${unit}`
                          : "—"}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          );
        })()}
      </Card>
    </div>
  );
}