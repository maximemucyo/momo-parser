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

  // Calculations
  const totalRwfSpent = transactions
    .filter(t => t.type !== 'cash_in')
    .reduce((sum, t) => sum + t.amount + t.fee, 0);

  const totalRwfFees = transactions
    .filter(t => t.type !== 'cash_in')
    .reduce((sum, t) => sum + t.fee, 0);

  const totalRwfInbound = transactions
    .filter(t => t.type === 'cash_in')
    .reduce((sum, t) => sum + t.amount, 0);

  // Today calculations
  const todayStr = new Date().toISOString().substring(0, 10);
  const todaysTransactions = transactions.filter(t => t.formattedDate === todayStr && t.type !== 'cash_in');
  const todaysSpent = todaysTransactions.reduce((sum, t) => sum + t.amount + t.fee, 0);

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

  const totalRevenueRwf = revenueRecords.reduce((sum, r) => sum + getDailyRevenueRwf(r), 0);
  const totalGrossRevenueRwf = revenueRecords.reduce((sum, r) => sum + getDailyGrossRevenueRwf(r), 0);
  const totalFixedCostsRwf = revenueRecords.reduce((sum, r) => sum + getDailyCostsRwf(r), 0);

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
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        {/* Average Daily Spending vs 20K Target */}
        <div id="avg-daily-spending-card" className="bg-white/10 backdrop-blur-lg border border-white/10 p-5 rounded-3xl relative overflow-hidden group shadow-lg">
          <div className={`absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 ${avgDailySpending > settings.dailySpendingLimit ? 'bg-amber-500/10' : 'bg-indigo-500/10'} rounded-full blur-xl transition-all`} />
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Daily Est. Spending</span>
            <div className={`p-2 rounded-xl ${avgDailySpending > settings.dailySpendingLimit ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-200'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1 animate-fade-in">
            <h3 className={`text-2xl font-bold font-mono ${avgDailySpending > settings.dailySpendingLimit ? 'text-amber-300' : 'text-indigo-200'}`}>
              {formatRwf(avgDailySpending)}
            </h3>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] text-white/40">Target daily ceiling:</span>
              <span className="font-mono text-[11px] font-bold text-white/70">{formatRwf(settings.dailySpendingLimit)}</span>
            </div>
          </div>
        </div>

        {/* Currency & Conversion Rate Config */}
        <div id="currency-rate-card" className="bg-white/10 backdrop-blur-lg border border-white/10 p-5 rounded-3xl relative overflow-hidden group shadow-lg">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-amber-500/10 rounded-full blur-xl transition-all" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">USD Conversion Rate</span>
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-300">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            {isEditingRate ? (
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="number"
                  className="bg-black/40 border border-white/20 text-white rounded px-2 py-0.5 text-sm font-mono w-24 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={rateVal}
                  onChange={e => setRateVal(e.target.value)}
                />
                <button
                  onClick={handleSaveRate}
                  className="bg-amber-400 hover:bg-amber-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-lg"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold font-mono text-amber-300">
                  1 USD = {settings.usdToRwfRate} RWF
                </span>
                <button
                  onClick={() => setIsEditingRate(true)}
                  className="text-white/50 hover:text-white transition"
                  title="Configure USD to RWF Rate"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-[11px] text-white/40 flex items-center gap-1">
              Ad revenue ends at <span className="text-amber-300 font-semibold">9:00 AM Kigali Time</span>
            </p>
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
                <span>Est. Daily Spending Vs Target Limit</span>
                <span className="font-mono font-bold">
                  {Math.round((avgDailySpending / settings.dailySpendingLimit) * 100)}%
                </span>
              </div>
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    avgDailySpending > settings.dailySpendingLimit ? 'bg-rose-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, (avgDailySpending / settings.dailySpendingLimit) * 100)}%` }}
                />
              </div>
            </div>

            {avgDailySpending > settings.dailySpendingLimit ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl flex items-start gap-3 text-xs leading-relaxed animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-red-300 font-bold block mb-0.5">ESTIMATED SPENDING CEILING VIOLATED!</strong>
                  Your daily average spent (<span className="font-mono font-bold">{formatRwf(avgDailySpending)}</span>) exceeds your targeted daily ceiling limit of <span className="font-mono font-bold">{formatRwf(settings.dailySpendingLimit)}</span>. Paste fewer expenses or raise the profit ceiling.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-2xl flex items-start gap-3 text-xs">
                <Award className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-300 font-bold block mb-0.5">BUDGET SAFE</strong>
                  Your daily average spent (<span className="font-mono font-bold">{formatRwf(avgDailySpending)}</span>) is currently keeping below the limit of <span className="font-mono font-bold">{formatRwf(settings.dailySpendingLimit)}</span>. Beautifully managed!
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
