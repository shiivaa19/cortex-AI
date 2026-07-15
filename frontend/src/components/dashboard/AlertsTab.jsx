import Card from "../common/Card";

export default function AlertsTab({ tenant, alerts }) {
  return (
    <div className="space-y-2 pb-4">
      <div className="text-xs text-gray-400 px-1">
        Streamed live via Socket.IO /telemetry room · {tenant.name}
      </div>

      {alerts.length === 0 && (
        <Card>
          <div className="text-sm text-gray-400 text-center py-6">
            No threshold crossings yet — watching the simulated feed…
          </div>
        </Card>
      )}

      {alerts.map((al) => (
        <Card key={al.id} className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${al.level === "high" ? "bg-red-500" : "bg-amber-500"}`} />
          <div className="flex-1">
            <div className="text-sm font-medium">{al.msg}</div>
            <div className="text-[11px] text-gray-400">{al.time}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}