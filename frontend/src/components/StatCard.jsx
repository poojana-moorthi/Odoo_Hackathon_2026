import React from 'react';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  trend = '0.0%', 
  trendDirection = 'up', 
  color = 'brand',
  statusDot = 'bg-[#00A09D]' 
}) => {
  const colorMap = {
    brand: 'text-[#714B67] bg-[#714B67]/10 border-[#714B67]/20',
    emerald: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-600 bg-red-500/10 border-red-500/20',
    indigo: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20'
  };

  const sparklinePath = trendDirection === 'up' 
    ? "M 2 24 Q 20 18 35 8 T 70 12 T 98 2" 
    : "M 2 2 Q 20 8 35 18 T 70 14 T 98 28";

  const sparklineColor = trendDirection === 'up' ? 'text-emerald-500' : 'text-red-500';

  return (
    <div className="p-4 glass-panel rounded-2xl flex flex-col justify-between h-36 hover:border-slate-350 transition-all duration-350">
      {/* Top Line: Title & Icon side-by-side */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot} flex-shrink-0`} />
          <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase truncate m-0">{title}</p>
        </div>
        <div className={`p-1.5 border rounded-lg ${colorMap[color] || colorMap.brand} flex-shrink-0`}>
          {React.cloneElement(icon, { className: 'w-4 h-4' })}
        </div>
      </div>

      {/* Middle Line: Value taking full card width */}
      <div className="mt-1">
        <h3 className="text-xl xl:text-2xl font-black text-slate-800 tracking-tight m-0 truncate" title={value}>
          {value}
        </h3>
      </div>

      {/* Bottom Line: MoM Trend & Sparkline */}
      <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-200/60">
        <div className="flex items-center space-x-1.5">
          <span className={`text-[11px] font-bold ${trendDirection === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            {trendDirection === 'up' ? '↑' : '↓'} {trend}
          </span>
          <span className="text-[9px] text-slate-450 font-semibold uppercase tracking-wider">MoM</span>
        </div>

        {/* Mini Sparkline */}
        <div className="w-12 h-5 flex items-center">
          <svg className={`w-full h-full ${sparklineColor}`} viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d={sparklinePath} />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
