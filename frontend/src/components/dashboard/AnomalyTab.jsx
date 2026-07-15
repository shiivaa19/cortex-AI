import { useState } from "react";
import { ChevronDown } from "lucide-react";

import Card from "../common/Card";
import Skeleton from "../common/Skeleton";
import useApi from "../../hooks/useApi";
import { fetchAnomalies } from "../../api/client";

export default function AnomalyTab({ tenant }) {
  const [openId, setOpenId] = useState(null);
  const { data: list, loading, error } = useApi(() => fetchAnomalies(tenant.id), [tenant.id]);

  const sevColor = {
    high: "bg-red-500/10 text-red-400 border-red-500/25",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  };

  if (loading) {
    return (
      <div className="space-y-3 pb-4">
        <Skeleton lines={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 pb-4">
        <Card>
          <div className="text-sm text-red-500 text-center py-6">
            Error loading anomalies: {error}
          </div>
        </Card>
      </div>
    );
  }

  if (!list || list.length === 0) {
    return (
      <div className="space-y-3 pb-4">
        <Card>
          <div className="text-sm text-gray-400 text-center py-6">
            No anomalies detected in this period.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="text-xs text-gray-400 px-1">
        Detected by the deterministic analytics engine · {list.length} findings this period
      </div>

      {list.map((a) => (
        <Card key={a.id}>
          <div
            className="flex items-start justify-between cursor-pointer"
            onClick={() => setOpenId(openId === a.id ? null : a.id)}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${sevColor[a.severity]}`}>
                  {a.severity.toUpperCase()}
                </span>
                <span className="font-semibold text-sm">{a.type}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {a.meter} · {a.ts}
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              {a.impact > 0 ? (
                <div className="text-sm font-semibold text-red-500">
                  ₹{a.impact.toLocaleString("en-IN")}
                </div>
              ) : (
                <div className="text-xs text-gray-400">no direct ₹</div>
              )}
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${
                  openId === a.id ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          {openId === a.id && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600 leading-relaxed">
              {a.why}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}