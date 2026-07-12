import React from 'react';

const LoadingSkeleton = ({ rows = 3, className = "h-4" }) => {
  return (
    <div className="w-full space-y-4 animate-pulse-slow">
      {Array.from({ length: rows }).map((_, idx) => (
        <div 
          key={idx} 
          className={`bg-slate-800 rounded ${className}`} 
          style={{ width: idx === rows - 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
