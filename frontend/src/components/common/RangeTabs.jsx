function RangeTabs({ value, onChange }) {
  const options = ["Today", "This Week", "This Month", "Last Month"];

  return (
    <div className="flex gap-1 bg-gray-100 rounded-full p-1 w-fit mb-3">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            value === option
              ? "bg-gray-900 text-white"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default RangeTabs;