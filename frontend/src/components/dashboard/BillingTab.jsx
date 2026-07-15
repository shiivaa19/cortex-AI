import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

import Card from "../common/Card";
import SectionLabel from "../common/SectionLabel";
import { ChartSkeleton } from "../common/Skeleton";
import useApi from "../../hooks/useApi";
import { fetchBill } from "../../api/client";
import { COLORS } from "../../data/colors";

export default function BillingTab({ tenant }) {
  const { data: bill, loading, error } = useApi(() => fetchBill(tenant.id), [tenant.id]);

  const pctDelta = useMemo(() => {
    if (!bill || !bill.lastMonthKwh) return "0.0";
    return (((bill.kwh - bill.lastMonthKwh) / bill.lastMonthKwh) * 100).toFixed(1);
  }, [bill]);

  const rows = useMemo(() => {
    if (!bill) return [];
    return [
      { label: "Energy charge", value: bill.energyCharge },
      { label: "Demand charge", value: bill.demandCharge },
      { label: "Demand penalty (excess kVA)", value: bill.demandPenalty },
      { label: "PF incentive / penalty", value: bill.pfIncentive },
      { label: "ToD peak adder", value: bill.todAdder },
    ];
  }, [bill]);

  if (loading) {
    return (
      <div className="space-y-4 pb-4">
        <ChartSkeleton height={180} />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="space-y-4 pb-4">
        <Card>
          <div className="text-sm text-red-500 text-center py-6">
            Error loading billing data: {error || "No data"}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4 grid grid-cols-1 lg:grid-cols-2 lg:gap-6 lg:space-y-0">
      <Card>
        <SectionLabel sub={`This month · ${bill.kwh.toLocaleString("en-IN")} kWh`}>
          ESTIMATED BILL
        </SectionLabel>
        <div className="text-3xl font-semibold -mt-1">
          ₹{bill.total.toLocaleString("en-IN")}
        </div>
        <div
          className={`text-xs mt-1 flex items-center gap-1 ${
            parseFloat(pctDelta) > 0 ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {parseFloat(pctDelta) > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(parseFloat(pctDelta))}% vs last month ({bill.lastMonthKwh.toLocaleString("en-IN")} kWh)
        </div>

        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{r.label}</span>
              <span className={`font-medium ${r.value < 0 ? "text-emerald-600" : "text-gray-800"}`}>
                {r.value < 0 ? "-" : ""}₹{Math.abs(r.value).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100 font-semibold">
            <span>Total</span>
            <span>₹{bill.total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel sub="What changed vs last month, by component">
          MOM DELTA WATERFALL
        </SectionLabel>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={rows.map((r) => ({ name: r.label.split(" ")[0], v: r.value }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip />
            <Bar dataKey="v" radius={[3, 3, 0, 0]}>
              {rows.map((r, i) => (
                <Cell key={i} fill={r.value < 0 ? COLORS.good : r.value > 5000 ? COLORS.bad : COLORS.apparent} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}