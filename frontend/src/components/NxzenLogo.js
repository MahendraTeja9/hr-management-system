import React from "react";

const NxzenLogo = ({ size = 32, showText = true, className = "" }) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div
        className={`w-${size / 8} h-${
          size / 8
        } bg-black rounded-lg flex items-center justify-center`}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          style={{ display: "block" }}
        >
          {/* nxzen Logo Symbol */}
          <path
            d="M6 12 Q6 8 10 8 Q14 8 14 12 Q14 16 10 16 Q6 16 6 12"
            stroke="#00ff88"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M18 12 Q18 8 22 8 Q26 8 26 12 Q26 16 22 16 Q18 16 18 12"
            stroke="#00ff88"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M6 20 Q6 16 10 16 Q14 16 14 20 Q14 24 10 24 Q6 24 6 20"
            stroke="#00ff88"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M18 20 Q18 16 22 16 Q26 16 26 20 Q26 24 22 24 Q18 24 18 20"
            stroke="#00ff88"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Connecting lines */}
          <line
            x1="14"
            y1="12"
            x2="18"
            y2="12"
            stroke="#00ff88"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="14"
            y1="20"
            x2="18"
            y2="20"
            stroke="#00ff88"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showText && (
        <div className="text-black font-semibold text-lg">nxzen</div>
      )}
    </div>
  );
};

export default NxzenLogo;
