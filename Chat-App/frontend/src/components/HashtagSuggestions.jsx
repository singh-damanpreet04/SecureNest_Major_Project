import { Loader2 } from "lucide-react";

const HashtagSuggestions = ({
  suggestions = [],
  loading = false,
  selectedIndex = 0,
  onSelect,
  position = { top: 0, left: 0 },
  onMouseEnterSuggestion,
  onMouseLeaveSuggestion,
}) => {
  if (loading) {
    return (
      <div 
        className="bg-gray-800 text-white rounded-lg shadow-lg p-2 z-[1001] w-full"
        style={position}
      >
        <div className="flex items-center justify-center p-2">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Loading suggestions...</span>
        </div>
      </div>
    );
  }

  if (!suggestions.length) return null;

  return (
    <div 
      className="bg-gray-800 text-white rounded-lg shadow-lg py-1 z-[1001] w-full max-h-[300px] overflow-y-auto border border-gray-700"
      style={position}
    >
      {suggestions.map((suggestion, index) => (
        <div
          key={index}
          className={`px-4 py-2 cursor-pointer hover:bg-gray-700 text-sm ${
            index === selectedIndex ? 'bg-gray-700' : ''
          }`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => onMouseEnterSuggestion?.(index)}
          onMouseLeave={() => onMouseLeaveSuggestion?.()}
        >
          {suggestion}
        </div>
      ))}
    </div>
  );
};

export default HashtagSuggestions;
