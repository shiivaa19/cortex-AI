export default function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 p-4 text-white ${className}`}
    >
      {children}
    </div>
  );
}