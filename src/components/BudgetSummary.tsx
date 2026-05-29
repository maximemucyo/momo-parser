import React, { useState } from 'react';
import { MomoTransaction, AdRevenueRecord, AppSettings } from '../types';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Wallet, Percent, Settings, ShieldAlert, Award, Sparkles } from 'lucide-react';

interface BudgetSummaryProps {
  transactions: MomoTransaction[];
  revenueRecords: AdRevenueRecord[];
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export const BudgetSummary: React.FC<BudgetSummaryProps> = ({
  transactions,
  revenueRecords,
  settings,
  onUpdateSettings,
}) => {
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateVal, setRateVal] = useState(settings.usdToRwfRate.toString());
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitVal, setLimitVal] = useState(settings.dailySpendingLimit.toString());
  const [summaryRange, setSummaryRange] = useState<7 | 14 | 30 | 'all'>('all');

  // Today calculations (always based on raw absolute dates)
  const todayStr = new Date().toISOString().substring(0, 10);
  const todaysTransactions = transactions.filter(t => t.formattedDate === todayStr && t.type !== 'cash_in');
  const todaysSpent = todaysTransactions.reduce((sum, t) => sum + t.amount + t.fee, 0);

  // Date and anchor calculations for selected window
  const anchorDate = new Date();
  const filteredTxs = transactions.filter(t => {
    if (summaryRange === 'all') return true;
    const tDate = new Date(t.formattedDate);
    const diffMs = anchorDate.getTime() - tDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= summaryRange;
  });

  const filteredRevs = revenueRecords.filter(r => {
    if (summaryRange === 'all') return true;
    const rDate = new Date(r.date);
    const diffMs = anchorDate.getTime() - rDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= summaryRange;
  });

  let rangeLabel = '';
  if (summaryRange === 'all') {
    const dates = [...transactions.map(t => t.formattedDate), ...revenueRecords.map(r => r.date)].filter(Boolean).sort();
    if (dates.length > 0) {
      const minD = new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const maxD = new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      rangeLabel = `from ${minD} to ${maxD}`;
    } else {
      rangeLabel = 'All Time';
    }
  } else {
    const startThreshold = new Date(anchorDate.getTime() - summaryRange * 24 * 60 * 60 * 1000);
    const startFmt = startThreshold.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endFmt = anchorDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    rangeLabel = `from ${startFmt} to ${endFmt}`;
  }

  // Calculations
  const totalRwfSpent = filteredTxs
    .filter(t => t.type !== 'cash_in')
    .reduce((sum, t) => sum + t.amount + t.fee, 0);

  const totalRwfFees = filteredTxs
    .filter(t => t.type !== 'cash_in')
    .reduce((sum, t) => sum + t.fee, 0);

  const totalRwfInbound = filteredTxs
    .filter(t => t.type === 'cash_in')
    .reduce((sum, t) => sum + t.amount, 0);

  // Daily revenue computations
  const getDailyRevenueRwf = (record: AdRevenueRecord): number => {
    const totalUsd = record.monetag + record.adsterra + record.profiton;
    const netUsd = totalUsd - (record.serverCosts + record.adCosts);
    return Math.max(0, netUsd * settings.usdToRwfRate);
  };

  const getDailyGrossRevenueRwf = (record: AdRevenueRecord): number => {
    const totalUsd = record.monetag + record.adsterra + record.profiton;
    return totalUsd * settings.usdToRwfRate;
  };

  const getDailyCostsRwf = (record: AdRevenueRecord): number => {
    return (record.serverCosts + record.adCosts) * settings.usdToRwfRate;
  };

  const totalRevenueRwf = filteredRevs.reduce((sum, r) => sum + getDailyRevenueRwf(r), 0);
  const totalGrossRevenueRwf = filteredRevs.reduce((sum, r) => sum + getDailyGrossRevenueRwf(r), 0);
  const totalFixedCostsRwf = filteredRevs.reduce((sum, r) => sum + getDailyCostsRwf(r), 0);

  // Today's revenue record
  const todaysRevenueRec = revenueRecords.find(r => r.date === todayStr);
  const todaysRevenueRwf = todaysRevenueRec ? getDailyRevenueRwf(todaysRevenueRec) : 0;

  // Let's find any day with excessive spending warning
  // Group spending by date
  const spendingByDate: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type !== 'cash_in') {
      const d = t.formattedDate;
      spendingByDate[d] = (spendingByDate[d] || 0) + t.amount + t.fee;
    }
  });

  const alertDays: Array<{ date: string; spent: number; earned: number; diff: number }> = [];
  Object.entries(spendingByDate).forEach(([date, spent]) => {
    const revRec = revenueRecords.find(r => r.date === date);
    const earned = revRec ? getDailyRevenueRwf(revRec) : 0;
    if (spent > earned && earned > 0) {
      alertDays.push({
        date,
        spent,
        earned,
        diff: spent - earned,
      });
    }
  });

  // Calculate Average daily spending (over all unique transaction dates, or past 7 days)
  const uniqueDates = Array.from(new Set(transactions.map(t => t.formattedDate))).sort();
  const daysCount = Math.max(1, uniqueDates.length);
  const avgDailySpending = totalRwfSpent / daysCount;

  const handleSaveRate = () => {
    const r = parseFloat(rateVal);
    if (!isNaN(r) && r > 0) {
      onUpdateSettings({ ...settings, usdToRwfRate: r });
      setIsEditingRate(false);
    }
  };

  const handleSaveLimit = () => {
    const l = parseFloat(limitVal);
    if (!isNaN(l) && l > 0) {
      onUpdateSettings({ ...settings, dailySpendingLimit: l });
      setIsEditingLimit(false);
    }
  };

  const formatRwf = (val: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(val)) + ' RWF';
  };

  return (
    <div className="space-y-6">
      {/* Range Selection Control & Duration Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
        <div>
          <span className="text-white/50 text-[10px] font-bold uppercase tracking-wider block">Currently Auditing:</span>
          <span className="text-xs font-semibold text-blue-200 font-mono capitalize">
            {summaryRange === 'all' ? 'All Ledger Records' : `${summaryRange} Day Window`}{' '}
            <span className="text-white/40 font-normal">({rangeLabel})</span>
          </span>
        </div>
        <div className="flex items-center gap-1 bg-black/35 p-1 border border-white/10 rounded-xl text-xs font-semibold shadow-inner self-start sm:self-auto">
          {([7, 14, 30, 'all'] as const).map(lim => (
            <button
              key={lim}
              onClick={() => setSummaryRange(lim)}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition capitalize ${
                summaryRange === lim ? 'bg-blue-600/80 text-white font-bold shadow' : 'text-white/60 hover:text-white'
              }`}
            >
              {lim === 'all' ? 'All Time' : `${lim} Days`}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Net Cashflow */}
        <div id="net-cashflow-card" className="bg-white/10 backdrop-blur-lg border border-white/10 p-5 rounded-3xl relative overflow-hidden group shadow-lg">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Total Net Earnings</span>
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold font-mono text-emerald-300">
              {formatRwf(totalRevenueRwf - totalRwfSpent)}
            </h3>
            <p className="subtitle text-[11px] text-white/40 flex items-center gap-1">
              Gross ad income: <span className="font-mono text-white/70">{formatRwf(totalRevenueRwf)}</span>
            </p>
          </div>
        </div>

        {/* Total MoMo Spent */}
        <div id="total-momo-spent-card" className="bg-white/10 backdrop-blur-lg border border-white/10 p-5 rounded-3xl relative overflow-hidden group shadow-lg">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Total MoMo Expenses</span>
            <div className="p-2 bg-rose-500/20 rounded-xl text-rose-300">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold font-mono text-rose-300">
              {formatRwf(totalRwfSpent)}
            </h3>
            <p className="subtitle text-[11px] text-white/40">
              Includes <span className="font-mono text-rose-200">{formatRwf(totalRwfFees)}</span> MoMo fees
            </p>
          </div>
        </div>

        {/* Today's MoMo Spend */}
        <div id="avg-daily-spending-card" className="bg-white/10 backdrop-blur-lg border border-white/10 p-5 rounded-3xl relative overflow-hidden group shadow-lg">
          <div className={`absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 ${todaysSpent > settings.dailySpendingLimit ? 'bg-amber-500/10' : 'bg-blue-500/10'} rounded-full blur-xl transition-all`} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Today's MoMo Spend</span>
            <div className={`p-2 rounded-xl ${todaysSpent > settings.dailySpendingLimit ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-200'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1 animate-fade-in">
            <h3 className={`text-2xl font-bold font-mono ${todaysSpent > settings.dailySpendingLimit ? 'text-amber-300' : 'text-blue-200'}`}>
              {formatRwf(todaysSpent)}
            </h3>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] text-white/40">Target daily limit:</span>
              <span className="font-mono text-[11px] font-bold text-white/70">{formatRwf(settings.dailySpendingLimit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alarms and Safety Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending Alarms / Target Limit Status */}
        <div id="spending-target-alarm-panel" className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-300" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">Ceiling Limit Alert & Config</h4>
            </div>
            {isEditingLimit ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  className="bg-black/40 border border-white/20 text-white rounded px-2 py-0.5 text-xs font-mono w-20 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={limitVal}
                  onChange={e => setLimitVal(e.target.value)}
                />
                <button
                  onClick={handleSaveLimit}
                  className="bg-amber-400 hover:bg-amber-500 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded"
                >
                  Ok
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingLimit(true)}
                className="text-xs text-amber-300 hover:underline flex items-center gap-1 font-semibold"
              >
                Change limit
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Limit Warning bar */}
            <div>
              <div className="flex justify-between items-center text-xs text-white/70 mb-1.5">
                <span>Today's Spending Vs Target Limit</span>
                <span className="font-mono font-bold">
                  {Math.round((todaysSpent / settings.dailySpendingLimit) * 100)}%
                </span>
              </div>
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    todaysSpent > settings.dailySpendingLimit ? 'bg-rose-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, (todaysSpent / settings.dailySpendingLimit) * 100)}%` }}
                />
              </div>
            </div>

            {todaysSpent > settings.dailySpendingLimit ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl flex items-start gap-3 text-xs leading-relaxed animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-red-300 font-bold block mb-0.5">TODAY'S SPENDING CEILING VIOLATED!</strong>
                  Today you spent <span className="font-mono font-bold">{formatRwf(todaysSpent)}</span> which exceeds your daily ceiling limit of <span className="font-mono font-bold">{formatRwf(settings.dailySpendingLimit)}</span>. Try to stay within budget today!
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-2xl flex items-start gap-3 text-xs">
                <Award className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-300 font-bold block mb-0.5">TODAY'S BUDGET SAFE</strong>
                  Today you spent <span className="font-mono font-bold">{formatRwf(todaysSpent)}</span> which is safely below the limit of <span className="font-mono font-bold">{formatRwf(settings.dailySpendingLimit)}</span>. Beautifully managed!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-Time Daily Excessive Spending Warnings compared to that day's Website revenue */}
        <div id="realtime-overspending-panel" className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-300" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Daily Profit Loss Alerts</h4>
          </div>

          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
            {alertDays.length === 0 ? (
              <div className="h-[100px] flex flex-col items-center justify-center text-center text-white/50 space-y-1">
                <Sparkles className="w-5 h-5 text-emerald-300" />
                <p className="text-xs">Perfect. You did not spend more than ad revenues on any day!</p>
              </div>
            ) : (
              alertDays.map((day, idx) => (
                <div key={idx} className="bg-rose-950/20 border border-rose-500/30 p-2.5 rounded-2xl flex items-center justify-between text-xs transition duration-200 hover:bg-rose-950/35">
                  <div className="space-y-0.5">
                    <span className="font-bold text-white">{day.date}</span>
                    <div className="text-[11px] text-white/60">
                      Spent: <span className="font-mono text-rose-300 font-medium">{formatRwf(day.spent)}</span> | Converted Rev: <span className="font-mono text-emerald-400 font-medium">{formatRwf(day.earned)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                      Overspent by {formatRwf(day.diff)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
