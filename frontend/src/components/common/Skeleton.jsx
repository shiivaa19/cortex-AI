export default function Skeleton({ className = "", lines = 3 }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-200 rounded-full"
          style={{ width: `${70 + Math.sin(i) * 20}%` }}
        />
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 180 }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="w-full h-full bg-gray-100 rounded-xl flex items-end justify-around px-4 pb-4 gap-1">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-t-md flex-1"
            style={{ height: `${30 + Math.sin(i * 0.8) * 25 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}
