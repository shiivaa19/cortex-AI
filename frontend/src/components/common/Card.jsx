export default function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/50 p-4 ${className}`}
    >
      {children}
    </div>
  );
}