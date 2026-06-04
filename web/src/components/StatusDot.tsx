import React from 'react';

interface StatusDotProps {
  active: boolean;
  colorClass?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({ active, colorClass = 'bg-gemini-blue' }) => {
  return (
    <div className="relative flex items-center justify-center w-3 h-3">
      {active ? (
        <>
          <div className={`absolute w-full h-full rounded-full ${colorClass} opacity-50 animate-ping-slow`} />
          <div className={`relative w-2 h-2 rounded-full ${colorClass}`} />
        </>
      ) : (
        <div className="w-2 h-2 rounded-full bg-outline" />
      )}
    </div>
  );
};
