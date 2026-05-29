import React, { useState } from 'react';
import { AdRevenueRecord, AppSettings } from '../types';
import { Landmark, Calendar, DollarSign, Cloud, Percent, ChevronRight, HelpCircle, Send, Save, Trash2, Pencil, X } from 'lucide-react';

interface AdRevenueDashboardProps {
  revenueRecords: AdRevenueRecord[];
  onAddRecord: (rec: AdRevenueRecord) => void;
  onDeleteRecord: (date: string) => void;
  settings: AppSettings;
}

export const AdRevenueDashboard: React.FC<AdRevenueDashboardProps> = ({
  revenueRecords,
  onAddRecord,
  onDeleteRecord,
  settings,
}) => {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [monetag, setMonetag] = useState('');
  const [adsterra, setAdsterra] = useState('');
  const [profiton, setProfiton] = useState('');
  const [serverCosts, setServerCosts] = useState('0.0'); // default zero server cost
  const [adCosts, setAdCosts] = useState('0.0');

  const [dateTarget, setDateTarget] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const getTargetDate = (target: 'today' | 'yesterday' | 'custom'): string => {
    const d = new Date();
    if (target === 'yesterday') {
      d.setDate(d.getDate() - 1);
      return d.toISOString().substring(0, 10);
    }
    if (target === 'today') {
      return d.toISOString().substring(0, 10);
    }
    return date;
  };

  const handleQuickDateTap = (target: 'today' | 'yesterday' | 'custom') => {
    setDateTarget(target);
    const resolvedDate = getTargetDate(target);
    setDate(resolvedDate);
  };

  const handleEditClick = (rec: AdRevenueRecord) => {
    setEditingDate(rec.date);
    setDate(rec.date);
    
    const dToday = new Date().toISOString().substring(0, 10);
    const dYesterday = new Date();
    dYesterday.setDate(dYesterday.getDate() - 1);
    const dYesterdayStr = dYesterday.toISOString().substring(0, 10);
    
    if (rec.date === dToday) {
      setDateTarget('today');
    } else if (rec.date === dYesterdayStr) {
      setDateTarget('yesterday');
    } else {
      setDateTarget('custom');
    }

    setMonetag(rec.monetag.toString());
    setAdsterra(rec.adsterra.toString());
    setProfiton(rec.profiton.toString());
    setServerCosts(rec.serverCosts.toString());
    setAdCosts(rec.adCosts.toString());
    
    const formEl = document.getElementById('ad-logger-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingDate(null);
    setMonetag('');
    setAdsterra('');
    setProfiton('');
    setServerCosts('1.5');
    setAdCosts('0.0');
    setDateTarget('today');
    setDate(new Date().toISOString().substring(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedDate = getTargetDate(dateTarget);
    
    const monetagVal = parseFloat(monetag) || 0;
    const adsterraVal = parseFloat(adsterra) || 0;
    const profitonVal = parseFloat(profiton) || 0;
    const serverCostsVal = parseFloat(serverCosts) || 0;
    const adCostsVal = parseFloat(adCosts) || 0;

    const newRec: AdRevenueRecord = {
      date: resolvedDate,
      monetag: monetagVal,
      adsterra: adsterraVal,
      profiton: profitonVal,
      serverCosts: serverCostsVal,
      adCosts: adCostsVal,
      checkedAt: new Date().toISOString()
    };

    onAddRecord(newRec);

    // reset fields gracefully
    setMonetag('');
    setAdsterra('');
    setProfiton('');
    setEditingDate(null);
  };

  const formatRwf = (val: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(val)) + ' RWF';
  };

  const formatUsd = (val: number) => {
    return '$' + val.toFixed(2);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
      {/* Logger Panel */}
      <div id="ad-logger-form" className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl p-6 shadow-xl xl:col-span-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-300" />
              {editingDate ? 'Update Daily Log' : 'Log Daily Monetization'}
            </h3>
            {editingDate && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition"
                title="Cancel modifications"
              >
                <X className="w-3 h-3" />
                Cancel Edit
              </button>
            )}
          </div>

          {editingDate && (
            <div className="mb-3.5 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-200 rounded-2xl text-xs leading-normal">
              Adjusting values for logged date <strong className="text-white font-mono">{editingDate}</strong>. Submitting will rewrite logs.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Date Toggle */}
            <div>
              <span className="text-white/60 text-xs font-bold block mb-1.5 font-sans">Reporting Date</span>
              <div className="grid grid-cols-3 gap-1 bg-black/30 p-1 rounded-xl border border-white/10 text-xs text-center font-medium">
                <button
                  type="button"
                  onClick={() => handleQuickDateTap('today')}
                  disabled={!!editingDate}
                  className={`py-1.5 rounded-lg cursor-pointer transition ${
                    dateTarget === 'today' ? 'bg-blue-600/80 text-white font-bold' : 'text-white/50 hover:text-white/80'
                  } disabled:opacity-55 disabled:cursor-not-allowed`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDateTap('yesterday')}
                  disabled={!!editingDate}
                  className={`py-1.5 rounded-lg cursor-pointer transition ${
                    dateTarget === 'yesterday' ? 'bg-blue-600/80 text-white font-bold' : 'text-white/50 hover:text-white/80'
                  } disabled:opacity-55 disabled:cursor-not-allowed`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDateTap('custom')}
                  disabled={!!editingDate}
                  className={`py-1.5 rounded-lg cursor-pointer transition ${
                    dateTarget === 'custom' ? 'bg-blue-600/80 text-white font-bold' : 'text-white/50 hover:text-white/80'
                  } disabled:opacity-55 disabled:cursor-not-allowed`}
                >
                  Calendar
                </button>
              </div>

              {dateTarget === 'custom' && (
                <input
                  type="date"
                  required
                  disabled={!!editingDate}
                  className="w-full mt-2 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-base md:text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              )}
              <p className="text-[10px] text-white/40 mt-1 uppercase tracking-wide">
                Selected Date: <span className="text-blue-200 font-mono font-bold">{getTargetDate(dateTarget)}</span>
              </p>
            </div>

            <div className="space-y-3">
              <span className="text-white/70 text-xs font-semibold block border-b border-white/15 pb-1 flex items-center gap-1 font-sans">
                <DollarSign className="w-3.5 h-3.5 text-blue-300" />
                Ad Network Earning (USD)
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-white/50 text-[10px] font-bold block mb-1">Monetag</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full bg-black/35 border border-white/10 rounded-xl px-2 py-2 text-base md:text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-white/20"
                    value={monetag}
                    onChange={e => setMonetag(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-white/50 text-[10px] font-bold block mb-1">Adsterra</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full bg-black/35 border border-white/10 rounded-xl px-2 py-2 text-base md:text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-white/20"
                    value={adsterra}
                    onChange={e => setAdsterra(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-white/50 text-[10px] font-bold block mb-1">Profiton</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full bg-black/35 border border-white/10 rounded-xl px-2 py-2 text-base md:text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-white/20"
                    value={profiton}
                    onChange={e => setProfiton(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <span className="text-white/70 text-xs font-semibold block border-b border-white/15 pb-1 flex items-center gap-1 font-sans">
                <Cloud className="w-3.5 h-3.5 text-blue-300" />
                Fixed Cost Deductions (USD)
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white/50 text-[10px] font-bold block mb-1">Server Costs</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className="w-full bg-black/35 border border-white/10 rounded-xl px-2 py-2 text-base md:text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    value={serverCosts}
                    onChange={e => setServerCosts(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-white/50 text-[10px] font-bold block mb-1">Ad Campaigns</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className="w-full bg-black/35 border border-white/10 rounded-xl px-2 py-2 text-base md:text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    value={adCosts}
                    onChange={e => setAdCosts(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[10px] text-white/40 italic">
                * Dedicated servers, VPS hosting and CPC advertising targets.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-full text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-900/20 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Save className="w-4 h-4" />
              {editingDate ? 'Update Ledger Record' : 'Commit Revenue'}
            </button>
          </form>
        </div>

        <div className="mt-4 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
          <h4 className="text-[11px] font-bold text-blue-200 uppercase tracking-wide flex items-center gap-1 mb-1">
            <HelpCircle className="w-3.5 h-3.5 text-blue-300" />
            9:00 AM Kigali Cutoff
          </h4>
          <p className="text-[10px] leading-relaxed text-white/60">
            Ad networks usually deliver report summaries for the previous calendar day at 9AM Kigali time (09:00 Rwanda standard time). Adding yesterday's numbers today will place them exactly on yesterday's date for precise comparison against MoMo statements of that day.
          </p>
        </div>
      </div>

      {/* Revenue list table */}
      <div id="revenue-history-table" className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl p-6 shadow-xl xl:col-span-2 flex flex-col">
        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200 mb-4">
          Ad Revenue Logs (Converted to RWF at {settings.usdToRwfRate}/$)
        </h3>

        <div className="flex-1 overflow-x-auto min-h-[300px] custom-scrollbar">
          {revenueRecords.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center text-white/40 py-12">
              <Calendar className="w-10 h-10 text-white/20 mb-2" />
              <p className="text-sm font-bold">No revenue records logged yet</p>
              <p className="text-xs">Use the left input panel to record your ad networks income details.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs text-white/85">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase font-bold text-white/50 tracking-wider">
                      <th className="pb-3 pl-2">Reporting Date</th>
                      <th className="pb-3 text-center">Networks (USD)</th>
                      <th className="pb-3 text-center">Server/Ad Costs (USD)</th>
                      <th className="pb-3 text-center">Net Gross (USD)</th>
                      <th className="pb-3 text-right pr-2">Total Net RWF</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {revenueRecords
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((rec, idx) => {
                        const totalGrossUsd = rec.monetag + rec.adsterra + rec.profiton;
                        const totalCostsUsd = rec.serverCosts + rec.adCosts;
                        const netUsd = totalGrossUsd - totalCostsUsd;
                        const netRwf = netUsd * settings.usdToRwfRate;

                        return (
                          <tr key={idx} className="hover:bg-white/5 transition duration-200 group">
                            <td className="py-3 pl-2 font-bold font-mono text-white/90">{rec.date}</td>
                            <td className="py-3 text-center font-mono">
                              <span className="text-orange-300 font-medium" title="Monetag">{formatUsd(rec.monetag)}</span> +{' '}
                              <span className="text-cyan-300 font-medium" title="Adsterra">{formatUsd(rec.adsterra)}</span> +{' '}
                              <span className="text-emerald-300 font-medium" title="Profiton">{formatUsd(rec.profiton)}</span>
                            </td>
                            <td className="py-3 text-center font-mono text-rose-300">
                              {formatUsd(totalCostsUsd)}
                            </td>
                            <td className="py-3 text-center font-mono font-bold text-white/80">
                              {formatUsd(netUsd)}
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-emerald-300 pr-2">
                              {formatRwf(netRwf)}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  onClick={() => handleEditClick(rec)}
                                  className="p-1 px-2 text-blue-400 hover:text-blue-350 hover:bg-blue-500/10 rounded transition cursor-pointer"
                                  title="Edit revenue data"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteRecord(rec.date)}
                                  className="p-1 px-2 text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 rounded transition mr-2 cursor-pointer"
                                  title="Delete revenue record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>

                  {/* Table totals summary row */}
                  {(() => {
                    const totalMonetag = revenueRecords.reduce((sum, r) => sum + r.monetag, 0);
                    const totalAdsterra = revenueRecords.reduce((sum, r) => sum + r.adsterra, 0);
                    const totalProfiton = revenueRecords.reduce((sum, r) => sum + r.profiton, 0);
                    const totalCosts = revenueRecords.reduce((sum, r) => sum + (r.serverCosts + r.adCosts), 0);
                    const totalGrossUSD = totalMonetag + totalAdsterra + totalProfiton;
                    const totalNetUSD = totalGrossUSD - totalCosts;
                    const totalNetRWF = totalNetUSD * settings.usdToRwfRate;

                    return (
                      <tfoot className="border-t border-white/25 bg-black/40 font-bold text-[10px] uppercase">
                        <tr>
                          <td className="py-3.5 pl-2 text-blue-200 font-extrabold">TOTALS ({revenueRecords.length})</td>
                          <td className="py-3.5 text-center font-mono">
                            <span className="text-orange-300 font-bold" title="Monetag Sum">{formatUsd(totalMonetag)}</span> +{' '}
                            <span className="text-cyan-300 font-bold" title="Adsterra Sum">{formatUsd(totalAdsterra)}</span> +{' '}
                            <span className="text-emerald-300 font-bold" title="Profiton Sum">{formatUsd(totalProfiton)}</span>
                          </td>
                          <td className="py-3.5 text-center font-mono text-rose-300 font-bold">
                            {formatUsd(totalCosts)}
                          </td>
                          <td className="py-3.5 text-center font-mono text-white text-[11px] font-extrabold">
                            {formatUsd(totalNetUSD)}
                          </td>
                          <td className={`py-3.5 text-right font-mono text-[11px] font-extrabold pr-2 ${totalNetRWF >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatRwf(totalNetRWF)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden space-y-3.5">
                {revenueRecords
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((rec, idx) => {
                    const totalGrossUsd = rec.monetag + rec.adsterra + rec.profiton;
                    const totalCostsUsd = rec.serverCosts + rec.adCosts;
                    const netUsd = totalGrossUsd - totalCostsUsd;
                    const netRwf = netUsd * settings.usdToRwfRate;

                    return (
                      <div key={idx} className="bg-black/35 border border-white/10 p-4 rounded-2xl space-y-3 relative">
                        {/* Top: Date & Action */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="font-bold font-mono text-xs text-white/90">{rec.date}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditClick(rec)}
                              className="p-1.5 text-blue-400 hover:text-blue-350 hover:bg-blue-500/10 rounded transition cursor-pointer"
                              title="Edit revenue data"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteRecord(rec.date)}
                              className="p-1.5 text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 rounded transition cursor-pointer"
                              title="Delete ad revenue record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Breakdown block */}
                        <div className="space-y-2 text-[11px]">
                          <div className="flex justify-between items-center bg-black/15 p-2 rounded-xl border border-white/5">
                            <span className="text-white/40 font-semibold uppercase text-[9px]">Gross Networks:</span>
                            <div className="font-mono text-[10px] text-right">
                              <span className="text-orange-300" title="Monetag">{formatUsd(rec.monetag)}</span> +{' '}
                              <span className="text-cyan-300" title="Adsterra">{formatUsd(rec.adsterra)}</span> +{' '}
                              <span className="text-emerald-300" title="Profiton">{formatUsd(rec.profiton)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 font-mono">
                            <div className="bg-black/15 p-2 rounded-xl border border-white/5">
                              <span className="text-white/40 block uppercase text-[8px]">Costs Deduct</span>
                              <span className="text-rose-300 font-semibold">{formatUsd(totalCostsUsd)}</span>
                            </div>
                            <div className="bg-black/15 p-2 rounded-xl border border-white/5">
                              <span className="text-white/40 block uppercase text-[8px]">Net Yield USD</span>
                              <span className="text-white font-extrabold">{formatUsd(netUsd)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-white/5 pt-2">
                            <span className="text-white/50 uppercase text-[9px] font-bold">Total Net RWF Yield:</span>
                            <span className={`font-mono text-xs font-extrabold ${netRwf >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatRwf(netRwf)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Mobile summary card footer */}
                {(() => {
                  const totalMonetag = revenueRecords.reduce((sum, r) => sum + r.monetag, 0);
                  const totalAdsterra = revenueRecords.reduce((sum, r) => sum + r.adsterra, 0);
                  const totalProfiton = revenueRecords.reduce((sum, r) => sum + r.profiton, 0);
                  const totalCosts = revenueRecords.reduce((sum, r) => sum + (r.serverCosts + r.adCosts), 0);
                  const totalGrossUSD = totalMonetag + totalAdsterra + totalProfiton;
                  const totalNetUSD = totalGrossUSD - totalCosts;
                  const totalNetRWF = totalNetUSD * settings.usdToRwfRate;

                  return (
                    <div className="bg-gradient-to-br from-blue-950/30 to-black/50 border border-white/20 p-4 rounded-2xl space-y-2.5 uppercase text-[9px] font-semibold">
                      <div className="text-blue-200 font-extrabold text-xs tracking-wider mb-1">TOTALS ({revenueRecords.length})</div>
                      <div className="flex justify-between items-center text-white/60">
                        <span>Total Monetag:</span>
                        <strong className="text-orange-300 font-bold font-mono text-[10px]">{formatUsd(totalMonetag)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-white/60">
                        <span>Total Adsterra:</span>
                        <strong className="text-cyan-300 font-bold font-mono text-[10px]">{formatUsd(totalAdsterra)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-white/60">
                        <span>Total Profiton:</span>
                        <strong className="text-emerald-300 font-bold font-mono text-[10px]">{formatUsd(totalProfiton)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-white/60 border-t border-white/5 pt-2">
                        <span>Total Costs:</span>
                        <strong className="text-rose-300 font-bold font-mono text-[10px]">{formatUsd(totalCosts)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-white/60 border-b border-white/5 pb-2">
                        <span>Total Net USD:</span>
                        <strong className="text-white font-extrabold font-mono text-[10px]">{formatUsd(totalNetUSD)}</strong>
                      </div>
                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-white/80 font-bold">Total Net RWF Yield:</span>
                        <strong className={`font-mono text-[11px] font-extrabold ${totalNetRWF >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatRwf(totalNetRWF)}
                        </strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
