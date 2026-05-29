import React, { useState } from 'react';
import { MomoTransaction, AdRevenueRecord, AppSettings } from '../types';
import { Calendar, BarChart3, PieChart, TrendingUp, DollarSign, Wallet } from 'lucide-react';

interface VisualReportsProps {
  transactions: MomoTransaction[];
  revenueRecords: AdRevenueRecord[];
  settings: AppSettings;
}

export const VisualReports: React.FC<VisualReportsProps> = ({
  transactions,
  revenueRecords,
  settings,
}) => {
  const [reportDaysLimit, setReportDaysLimit] = useState<7 | 14 | 30>(7);
  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);

  // Group transactions by date (excluding cash_in)
  const spendByDate: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type !== 'cash_in') {
      const d = t.formattedDate;
      spendByDate[d] = (spendByDate[d] || 0) + t.amount + t.fee;
    }
  });

  // Group net revenue by date
  const revByDate: Record<string, number> = {};
  revenueRecords.forEach(r => {
    const grossUsd = r.monetag + r.adsterra + r.profiton;
    const netUsd = grossUsd - (r.serverCosts + r.adCosts);
    revByDate[r.date] = Math.max(0, netUsd * settings.usdToRwfRate);
  });

  // Category statistics grouping
  const categorySummary: Record<string, number> = {};
  let totalSpending = 0;
  transactions.forEach(t => {
    if (t.type !== 'cash_in') {
      const cat = t.category || 'Other Expenses';
      categorySummary[cat] = (categorySummary[cat] || 0) + t.amount + t.fee;
      totalSpending += t.amount + t.fee;
    }
  });

  const categoriesOrdered = Object.entries(categorySummary)
    .sort((a, b) => b[1] - a[1]) // highest first
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0
    }));

  // Create list of sorted dates for trend chart (e.g. past N unique dates or chronological timeline)
  const allRecordedDates = Array.from(
    new Set([...Object.keys(spendByDate), ...Object.keys(revByDate)])
  )
    .sort()
    .slice(-reportDaysLimit); // Take last N dates

  // Color mappings
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Groceries & Shopping': return 'bg-amber-400';
      case 'Transport & Fuel': return 'bg-sky-400';
      case 'Utilities & Airtime': return 'bg-purple-400';
      case 'Food & Dining': return 'bg-pink-400';
      case 'Transfers (Sent)': return 'bg-rose-400';
      case 'Server Costs': return 'bg-teal-400';
      case 'Advertising Costs': return 'bg-indigo-400';
      default: return 'bg-gray-400';
    }
  };

  const getCategoryTextColor = (cat: string) => {
    switch (cat) {
      case 'Groceries & Shopping': return 'text-amber-400';
      case 'Transport & Fuel': return 'text-sky-400';
      case 'Utilities & Airtime': return 'text-purple-400';
      case 'Food & Dining': return 'text-pink-400';
      case 'Transfers (Sent)': return 'text-rose-400';
      case 'Server Costs': return 'text-teal-400';
      case 'Advertising Costs': return 'text-indigo-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryStrokeColor = (cat: string) => {
    switch (cat) {
      case 'Groceries & Shopping': return '#fbbf24';
      case 'Transport & Fuel': return '#38bdf8';
      case 'Utilities & Airtime': return '#c084fc';
      case 'Food & Dining': return '#f472b6';
      case 'Transfers (Sent)': return '#f87171';
      case 'Server Costs': return '#2dd4bf';
      case 'Advertising Costs': return '#818cf8';
      default: return '#9ca3af';
    }
  };

  const formatRwfK = (val: number) => {
    if (val >= 1000) {
      return (val / 1000).toFixed(1) + 'k';
    }
    return Math.round(val).toString();
  };

  const formatRwfFull = (val: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(val)) + ' RWF';
  };

  // Coordinates formulation code for Trend Graph (SVG height scaled by max values)
  const trendMaxVal = Math.max(
    ...allRecordedDates.map(d => Math.max(spendByDate[d] || 0, revByDate[d] || 0, settings.dailySpendingLimit)),
    30000 // default minimum height
  );

  const graphWidth = 600;
  const graphHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const getX = (index: number) => {
    if (allRecordedDates.length <= 1) return graphWidth / 2;
    return paddingX + (index * (graphWidth - paddingX * 2)) / (allRecordedDates.length - 1);
  };

  const getY = (val: number) => {
    // 0 is top, height is bottom. Scaled gracefully!
    const ratio = val / (trendMaxVal || 1);
    return graphHeight - paddingY - ratio * (graphHeight - paddingY * 2);
  };

  // Generate SVG paths lines
  const buildSvgPath = (dataRecord: Record<string, number>) => {
    if (allRecordedDates.length === 0) return '';
    return allRecordedDates.map((date, idx) => {
      const val = dataRecord[date] || 0;
      const cmd = idx === 0 ? 'M' : 'L';
      return `${cmd} ${getX(idx).toFixed(1)} ${getY(val).toFixed(1)}`;
    }).join(' ');
  };

  const revenuePath = buildSvgPath(revByDate);
  const spendingPath = buildSvgPath(spendByDate);

  return (
    <div id="visual-graph-dashboard" className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Historical Trend Chart (SVG Powered line graph) */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl p-6 shadow-xl lg:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-300" />
              RWF Income vs Daily Expenses
            </h3>
            <span className="text-[11px] text-white/50">Comparing network net RWF profit to actual cash spent.</span>
          </div>

          {/* Limit Toggle selector */}
          <div className="flex items-center gap-1 bg-black/30 p-1 border border-white/10 rounded-xl text-xs font-semibold">
            {([7, 14, 30] as const).map(lim => (
              <button
                key={lim}
                onClick={() => setReportDaysLimit(lim)}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${
                  reportDaysLimit === lim ? 'bg-blue-600/80 text-white font-bold' : 'text-white/50 hover:text-white'
                }`}
              >
                {lim} Days
              </button>
            ))}
          </div>
        </div>

        {allRecordedDates.length === 0 ? (
          <div className="h-[240px] flex flex-col items-center justify-center text-white/50 text-xs">
            <p className="font-bold">No timeline data available</p>
            <p>Paste MoMo messages and ad earnings to render historical spending patterns.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* SVG Plot */}
            <div className="relative w-full overflow-hidden bg-black/25 rounded-2xl border border-white/5 p-2">
              {/* Dynamic Interactive Tooltip Box */}
              {activeHoverIdx !== null ? (
                <div className="absolute top-3 right-3 bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2 shadow-2xl backdrop-blur-md text-[11px] space-y-1 animate-fade-in z-20 pointer-events-none min-w-[200px] font-semibold">
                  <p className="text-white font-bold font-mono text-[10px] tracking-wide border-b border-white/10 pb-1 mb-1 flex justify-between">
                    <span>Date:</span> <span>{allRecordedDates[activeHoverIdx]}</span>
                  </p>
                  <p className="text-emerald-400 flex justify-between font-mono">
                    <span>Website Profit:</span>
                    <span>{formatRwfFull(revByDate[allRecordedDates[activeHoverIdx]] || 0)}</span>
                  </p>
                  <p className="text-rose-400 flex justify-between font-mono">
                    <span>MoMo Spent:</span>
                    <span>{formatRwfFull(spendByDate[allRecordedDates[activeHoverIdx]] || 0)}</span>
                  </p>
                </div>
              ) : (
                <div className="absolute top-3 right-3 bg-white/5 text-white/40 border border-white/5 rounded-xl px-2.5 py-1 text-[9px] uppercase font-mono tracking-wider pointer-events-none">
                  Hover columns to read exact values
                </div>
              )}

              <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full h-auto text-white/80 overflow-visible">
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const val = trendMaxVal * ratio;
                  const lineY = getY(val);
                  return (
                    <g key={i} className="opacity-40">
                      <line
                        x1={paddingX}
                        y1={lineY}
                        x2={graphWidth - paddingX}
                        y2={lineY}
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 5}
                        y={lineY + 4}
                        className="text-[10px] font-mono fill-white/40 text-right"
                        textAnchor="end"
                      >
                        {formatRwfK(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Live Vertical Snapping Line on Hover */}
                {activeHoverIdx !== null && (
                  <line
                    x1={getX(activeHoverIdx)}
                    y1={paddingY}
                    x2={getX(activeHoverIdx)}
                    y2={graphHeight - paddingY}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    className="transition-all duration-150"
                  />
                )}

                {/* Targetspending Limit line (dashed RED helper) */}
                <g className="opacity-60">
                  <line
                    x1={paddingX}
                    y1={getY(settings.dailySpendingLimit)}
                    x2={graphWidth - paddingX}
                    y2={getY(settings.dailySpendingLimit)}
                    stroke="#fb7185"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={graphWidth - paddingX - 4}
                    y={getY(settings.dailySpendingLimit) - 4}
                    className="text-[9px] font-mono fill-rose-300 font-bold text-right"
                    textAnchor="end"
                  >
                    Limit ({formatRwfK(settings.dailySpendingLimit)})
                  </text>
                </g>

                {/* Plot Lines */}
                {/* 1. Net website Revenue (GREEN Line) */}
                {revenuePath && (
                  <>
                    <path
                      d={revenuePath}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {allRecordedDates.map((date, idx) => {
                      const val = revByDate[date] || 0;
                      return (
                        <circle
                          key={`rev-c-${idx}`}
                          cx={getX(idx)}
                          cy={getY(val)}
                          r={activeHoverIdx === idx ? 6.5 : 4}
                          className="fill-[#34d399] stroke-black/40 stroke-2 cursor-pointer transition-all duration-150"
                          title={`Revenue ${date}: ${formatRwfFull(val)}`}
                        />
                      );
                    })}
                  </>
                )}

                {/* 2. Actual Spending (ROSE/AMBER Line) */}
                {spendingPath && (
                  <>
                    <path
                      d={spendingPath}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {allRecordedDates.map((date, idx) => {
                      const val = spendByDate[date] || 0;
                      return (
                        <circle
                          key={`sd-c-${idx}`}
                          cx={getX(idx)}
                          cy={getY(val)}
                          r={activeHoverIdx === idx ? 6.5 : 4}
                          className="fill-[#f43f5e] stroke-black/40 stroke-2 cursor-pointer transition-all duration-150"
                          title={`Spent ${date}: ${formatRwfFull(val)}`}
                        />
                      );
                    })}
                  </>
                )}

                {/* X Axis label coordinates */}
                {allRecordedDates.map((date, idx) => {
                  const dayStr = date.split('-').slice(1).join('/'); // MM/DD
                  return (
                    <text
                      key={`lbl-${idx}`}
                      x={getX(idx)}
                      y={graphHeight - 8}
                      className={`text-[9px] font-mono font-medium transition-all duration-150 ${activeHoverIdx === idx ? 'fill-blue-300 font-bold' : 'fill-white/40'}`}
                      textAnchor="middle"
                    >
                      {dayStr}
                    </text>
                  );
                })}

                {/* High-accuracy Rect Hit Zones for Hover capture */}
                {allRecordedDates.map((date, idx) => {
                  const width = allRecordedDates.length > 1
                    ? (graphWidth - paddingX * 2) / (allRecordedDates.length - 1)
                    : graphWidth;
                  const startX = getX(idx) - width / 2;
                  return (
                    <rect
                      key={`hit-${idx}`}
                      x={startX}
                      y={paddingY}
                      width={width}
                      height={graphHeight - paddingY * 2}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setActiveHoverIdx(idx)}
                      onTouchStart={() => setActiveHoverIdx(idx)}
                      onMouseLeave={() => setActiveHoverIdx(null)}
                      onTouchEnd={() => setActiveHoverIdx(null)}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Legends */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs text-white/50 border-t border-white/10 pt-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#34d399] rounded-full" />
                <span>Net Conversion (RWF Website Income)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#f43f5e] rounded-full" />
                <span>Combined Daily MoMo Spend + Fee</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-rose-400" />
                <span>Daily Budget Ceiling</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Expenses Breakdown List (High-contrast customized Donut structure) */}
      <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col">
        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200 mb-4 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-300" />
          Budget Allocation
        </h3>

        <div className="flex-1 flex flex-col justify-between">
          {categoriesOrdered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-white/40 text-xs py-10">
               <p className="font-bold mb-1">No transaction records logged</p>
               <p>Add some MoMo transactions to view automated categories division.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Vertical Stack List */}
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {categoriesOrdered.map((cat, idx) => (
                  <div key={idx} className="space-y-1 group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${getCategoryColor(cat.category)}`} />
                        <span className="text-white/80 font-medium group-hover:text-blue-200 transition">{cat.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-white/90 font-semibold">{formatRwfFull(cat.amount)}</span>{' '}
                        <span className="text-[10px] text-white/40 font-mono font-bold">({cat.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    {/* Visual Segment bar */}
                    <div className="w-full bg-black/35 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getCategoryColor(cat.category)} transition-all duration-300`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* General Statistics */}
              <div className="p-3.5 bg-black/35 border border-white/10 rounded-2xl space-y-2 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50 flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Wallet className="w-3.5 h-3.5 text-blue-300" /> Total Expense Sum
                  </span>
                  <span className="font-mono text-rose-300 font-bold">{formatRwfFull(totalSpending)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
