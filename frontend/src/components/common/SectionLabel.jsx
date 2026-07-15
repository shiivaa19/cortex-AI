function SectionLabel({ children, sub }) {
  return (
    <div className="mb-1">
      <div className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
        {children}
      </div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

export default SectionLabel;