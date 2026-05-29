import React, { useState } from 'react';
import { MomoTransaction, AppSettings } from '../types';
import { Search, Filter, Trash2, ArrowUpDown, ChevronDown, ChevronUp, RefreshCw, FileText, CheckCircle } from 'lucide-react';

interface TransactionListProps {
  transactions: MomoTransaction[];
  onDeleteTransaction: (id: string) => void;
  onUpdateTransactionCategory: (id: string, newCategory: string) => void;
  settings: AppSettings;
  onAddCategoryMapping: (keyword: string, category: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onDeleteTransaction,
  onUpdateTransactionCategory,
  settings,
  onAddCategoryMapping,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Expandable RAW statement message drawer
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Suggested Category Mapping states
  const [mappingKw, setMappingKw] = useState('');
  const [mappingCat, setMappingCat] = useState('Groceries & Shopping');
  const [mappingSuccess, setMappingSuccess] = useState(false);

  // Standard categories
  const standardCategories = [
    'Groceries & Shopping',
    'Transport & Fuel',
    'Utilities & Airtime',
    'Food & Dining',
    'Transfers (Sent)',
    'Transfers (Received)',
    'Server Costs',
    'Advertising Costs',
    'Other Expenses',
    'Income'
  ];

  // Map types for badges
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'payment':
        return <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-bold text-[9px] uppercase tracking-wide">Payment</span>;
      case 'transfer':
        return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-bold text-[9px] uppercase tracking-wide">Transfer</span>;
      case 'cash_in':
        return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[9px] uppercase tracking-wide">Deposit</span>;
      case 'cash_out':
        return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-bold text-[9px] uppercase tracking-wide">Cash Out</span>;
      default:
        return <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded font-bold text-[9px] uppercase tracking-wide">Other</span>;
    }
  };

  const handleCreateMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (mappingKw.trim()) {
      onAddCategoryMapping(mappingKw.trim(), mappingCat);
      setMappingKw('');
      setMappingSuccess(true);
      setTimeout(() => setMappingSuccess(false), 2500);
    }
  };

  // Filter & Sort
  const filteredTxs = transactions
    .filter(t => {
      const matchSearch = t.counterparty.toLowerCase().includes(search.toLowerCase()) || 
                          t.rawText.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || t.type === filterType;
      const matchCategory = filterCategory === 'all' || t.category === filterCategory;
      
      const txDate = t.formattedDate; // YYYY-MM-DD
      const matchStart = !startDate || txDate >= startDate;
      const matchEnd = !endDate || txDate <= endDate;
      
      return matchSearch && matchType && matchCategory && matchStart && matchEnd;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return b.timestamp.localeCompare(a.timestamp);
      if (sortBy === 'date-asc') return a.timestamp.localeCompare(b.timestamp);
      if (sortBy === 'amount-desc') return (b.amount + b.fee) - (a.amount + a.fee);
      if (sortBy === 'amount-asc') return (a.amount + a.fee) - (b.amount + b.fee);
      return 0;
    });

  const formatRwf = (val: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(val)) + ' RWF';
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 animate-fade-in">
      {/* Category Mapper Manager */}
      <div id="category-mapping-manager" className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl p-6 shadow-xl xl:col-span-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200 mb-2.5 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-300" />
          Smart Rule Customizer
        </h3>
        <p className="text-xs text-white/60 leading-relaxed mb-4">
          Assign keywords (e.g. SIMBA, Isabelle, SP) to automatic budget categories. Every subsequent Mobile Money statement containing this word will classify instantly.
        </p>

        {mappingSuccess && (
          <div className="p-2 mb-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs rounded-xl flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-300" />
            Rule mapped perfectly!
          </div>
        )}

        {/* Mapper Form */}
        <form onSubmit={handleCreateMapping} className="space-y-3.5">
          <div>
            <label className="text-white/50 text-[10px] font-bold block mb-1">Company / Keyword</label>
            <input
              type="text"
              required
              placeholder="e.g. SP LTD, Isabelle"
              className="w-full bg-black/35 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-white/20"
              value={mappingKw}
              onChange={e => setMappingKw(e.target.value)}
            />
          </div>

          <div>
            <label className="text-white/50 text-[10px] font-bold block mb-1">Budget Category</label>
            <select
              className="w-full bg-black/35 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={mappingCat}
              onChange={e => setMappingCat(e.target.value)}
            >
              {standardCategories.map((cat, i) => (
                <option key={i} value={cat} className="bg-slate-900 text-white">{cat}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-200 font-bold py-2 px-3 rounded-full text-xs transition-all duration-250 cursor-pointer shadow-md"
          >
            Add Automation Rule
          </button>
        </form>

        {/* Active Rules List */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-2.5">Active Auto Rules</span>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {Object.entries(settings.customCategoryMappings).length === 0 ? (
              <span className="text-white/40 text-[11px] block italic">No customized rules added yet.</span>
            ) : (
              Object.entries(settings.customCategoryMappings).map(([kw, cat], idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] bg-black/25 border border-white/5 px-2.5 py-2 rounded-xl">
                  <span className="font-mono text-white/90 font-semibold">{kw}</span>
                  <span className="text-blue-200 font-medium">{cat}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div id="momo-transactions-data-panel" className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl p-6 shadow-xl xl:col-span-3 flex flex-col">
        {/* Filters Top Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200">
            Parsed Mobile Money History ({filteredTxs.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/45" />
              <input
                type="text"
                className="bg-black/35 border border-white/10 text-white rounded-xl text-xs pl-9 pr-3 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-white/30"
                placeholder="Search phone/firm..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Filter class */}
            <select
              className="bg-black/35 border border-white/10 text-white rounded-xl text-xs px-2 py-1.5 focus:outline-none"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all" className="bg-slate-900">All Types</option>
              <option value="payment" className="bg-slate-900">Payments</option>
              <option value="transfer" className="bg-slate-900">Transfers</option>
              <option value="cash_in" className="bg-slate-900">Inbound (Deposits)</option>
              <option value="cash_out" className="bg-slate-900">Cash Out Agent</option>
            </select>

            <select
              className="bg-black/35 border border-white/10 text-white rounded-xl text-xs px-2 py-1.5 focus:outline-none"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
            >
              <option value="all" className="bg-slate-900">All Categories</option>
              {standardCategories.map((c, i) => (
                <option key={i} value={c} className="bg-slate-900">{c}</option>
              ))}
            </select>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1.5 bg-black/35 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white">
              <span className="text-[10px] text-white/50 font-bold uppercase">From:</span>
              <input
                type="date"
                className="bg-transparent text-white focus:outline-none w-[110px] text-right cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1.5 bg-black/35 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white">
              <span className="text-[10px] text-white/50 font-bold uppercase">To:</span>
              <input
                type="date"
                className="bg-transparent text-white focus:outline-none w-[110px] text-right cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[10px] text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 py-1.5 rounded-xl cursor-pointer transition font-bold"
              >
                Clear Dates
              </button>
            )}

            {/* SortBy option */}
            <select
              className="bg-black/35 border border-white/10 text-white rounded-xl text-xs px-2 py-1.5 focus:outline-none"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
            >
              <option value="date-desc" className="bg-slate-900">Newest First</option>
              <option value="date-asc" className="bg-slate-900">Oldest First</option>
              <option value="amount-desc" className="bg-slate-900">Highest Cost</option>
              <option value="amount-asc" className="bg-slate-900">Lowest Cost</option>
            </select>
          </div>
        </div>

        {/* Spreadsheet Table */}
        <div className="flex-1 overflow-x-auto min-h-[300px] custom-scrollbar">
          {filteredTxs.length === 0 ? (
            <div className="text-center text-white/40 py-16 flex flex-col items-center justify-center">
              <Search className="w-8 h-8 text-white/20 mb-2" />
              <p className="text-sm font-bold">No matching transactions found</p>
              <p className="text-xs">Try adjusting filters or import more messages above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop view */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs text-white/80">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase font-bold text-white/50 tracking-wider">
                      <th className="pb-3 pl-2">Stamp / Date</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Recipient/Counterparty</th>
                      <th className="pb-3 text-center">Base Cost</th>
                      <th className="pb-3 text-center">Fee</th>
                      <th className="pb-3 text-right">Total Debit</th>
                      <th className="pb-3">Category Map</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTxs.map((tx, idx) => {
                      const isExpand = expandedTxId === tx.id;
                      const combinedCost = tx.amount + tx.fee;
                      const isIncome = tx.type === 'cash_in';

                      return (
                        <React.Fragment key={tx.id || idx}>
                          <tr className="hover:bg-white/5 transition duration-200 group">
                            <td className="py-3 pl-2 font-mono text-[11px] text-white/50">
                              {tx.timestamp.substring(2)}
                            </td>
                            <td className="py-3">
                              {getTypeBadge(tx.type)}
                            </td>
                            <td className="py-3 font-bold text-white max-w-[140px] truncate">
                              {tx.counterparty}
                            </td>
                            <td className={`py-3 text-center font-mono font-medium ${isIncome ? 'text-emerald-400' : 'text-white/80'}`}>
                              {formatRwf(tx.amount)}
                            </td>
                            <td className="py-3 text-center font-mono text-rose-300">
                              {tx.fee > 0 ? formatRwf(tx.fee) : '0 RWF'}
                            </td>
                            <td className={`py-3 text-right font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-455'}`}>
                              {isIncome ? '+' : '-'}{formatRwf(combinedCost)}
                            </td>
                            <td className="py-3">
                              <select
                                className="bg-black/40 border border-white/10 text-[11px] text-blue-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer hover:bg-black/50 transition"
                                value={tx.category}
                                onChange={e => onUpdateTransactionCategory(tx.id, e.target.value)}
                              >
                                {standardCategories.map((c, i) => (
                                  <option key={i} value={c} className="bg-slate-900 text-white">{c}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1 px-2">
                                {/* Raw message view toggle */}
                                <button
                                  onClick={() => setExpandedTxId(isExpand ? null : tx.id)}
                                  className="p-1 px-2 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                                  title="Show raw SMS statement"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteTransaction(tx.id)}
                                  className="p-1 px-2 text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                  title="Delete record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable SMS Block Drawer */}
                          {isExpand && (
                            <tr>
                              <td colSpan={8} className="bg-black/35 p-4 rounded-3xl border border-white/10">
                                <div className="space-y-2.5 text-xs">
                                  <span className="font-bold text-blue-200 block">Raw SMS Message Text:</span>
                                  <p className="font-mono text-[11px] break-all leading-relaxed text-white/80 bg-black/40 p-3 rounded-2xl border border-white/5 select-all">
                                    {tx.rawText}
                                  </p>
                                  <div className="text-[10px] text-white/40 flex justify-between items-center py-1">
                                    <span>Momo Tracker Reference ID: <strong className="font-mono">{tx.id}</strong></span>
                                    <span>Estimated Remaining MoMo Balance: <strong className="font-mono text-white/70">{formatRwf(tx.balance)}</strong></span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  
                  {/* Visual table summaries footer */}
                  {(() => {
                    const totalBase = filteredTxs.reduce((sum, t) => sum + t.amount, 0);
                    const totalFee = filteredTxs.reduce((sum, t) => sum + t.fee, 0);
                    const totalNet = filteredTxs.reduce((sum, t) => {
                      const combined = t.amount + t.fee;
                      return t.type === 'cash_in' ? sum + t.amount : sum - combined;
                    }, 0);

                    return (
                      <tfoot className="border-t border-white/25 bg-black/40 font-bold text-[10px] uppercase">
                        <tr className="border-t border-white/10">
                          <td className="py-3.5 pl-2 text-blue-200 font-extrabold font-sans">TOTALS ({filteredTxs.length})</td>
                          <td className="py-3.5"></td>
                          <td className="py-3.5 text-white/40 font-normal normal-case italic">Filtered net budget change:</td>
                          <td className="py-3.5 text-center font-mono text-white text-[11px] font-bold">
                            {formatRwf(totalBase)}
                          </td>
                          <td className="py-3.5 text-center font-mono text-rose-300 text-[11px] font-bold">
                            {formatRwf(totalFee)}
                          </td>
                          <td className={`py-3.5 text-right font-mono text-[11px] font-extrabold pr-2 ${totalNet >= 0 ? 'text-emerald-400' : 'text-rose-300'}`}>
                            {totalNet >= 0 ? '+' : ''}{formatRwf(totalNet)}
                          </td>
                          <td className="py-3.5"></td>
                          <td className="py-3.5"></td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>

              {/* Mobile View Card List */}
              <div className="block md:hidden space-y-3.5">
                {filteredTxs.map((tx, idx) => {
                  const isExpand = expandedTxId === tx.id;
                  const combinedCost = tx.amount + tx.fee;
                  const isIncome = tx.type === 'cash_in';

                  return (
                    <div key={tx.id || idx} className="bg-black/30 border border-white/10 p-4 rounded-2xl space-y-3 relative">
                      {/* Top Bar: Timestamp and Actions */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="font-mono text-[10px] text-white/40">{tx.timestamp}</span>
                        <div className="flex items-center gap-1.5">
                          {getTypeBadge(tx.type)}
                          <button
                            onClick={() => setExpandedTxId(isExpand ? null : tx.id)}
                            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                            title="Show raw SMS statement"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 rounded transition cursor-pointer"
                            title="Delete transaction record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Data block */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-white/40 uppercase tracking-wide">Recipient / Sender</span>
                          <strong className="text-white text-xs sm:text-sm font-bold block max-w-[170px] truncate">{tx.counterparty}</strong>
                        </div>
                        <div className="text-right space-y-0.5">
                          <span className="text-[9px] text-white/40 uppercase tracking-wide">Combined Debit</span>
                          <strong className={`font-mono text-xs sm:text-sm font-extrabold ${isIncome ? 'text-emerald-400' : 'text-rose-455'}`}>
                            {isIncome ? '+' : '-'}{formatRwf(combinedCost)}
                          </strong>
                        </div>
                      </div>

                      {/* Break Downs */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-black/20 p-2 rounded-xl border border-white/5 text-white/70 font-mono">
                        <div>
                          <span className="text-white/40 block uppercase text-[8px] tracking-wide mb-0.5">Base Sum</span>
                          <span className={isIncome ? 'text-emerald-400' : 'text-white/80'}>{formatRwf(tx.amount)}</span>
                        </div>
                        <div>
                          <span className="text-white/40 block uppercase text-[8px] tracking-wide mb-0.5">MTN Fee</span>
                          <span className="text-rose-300">{tx.fee > 0 ? formatRwf(tx.fee) : '0 RWF'}</span>
                        </div>
                      </div>

                      {/* Category Mapping selector on Touch-friendly targets */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Category Map:</span>
                        <select
                          className="bg-black/45 border border-white/10 text-xs text-blue-200 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer w-[140px]"
                          value={tx.category}
                          onChange={e => onUpdateTransactionCategory(tx.id, e.target.value)}
                        >
                          {standardCategories.map((c, i) => (
                            <option key={i} value={c} className="bg-slate-900 text-white">{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Expanded Raw Area */}
                      {isExpand && (
                        <div className="bg-black/50 p-3 rounded-xl border border-white/5 text-[10px] space-y-2 mt-2">
                          <span className="font-bold text-blue-200 block">Raw SMS Message Text:</span>
                          <p className="font-mono break-all leading-normal text-white/80 bg-black/60 p-2.5 rounded-lg select-all">
                            {tx.rawText}
                          </p>
                          <div className="text-[8px] text-white/40 flex flex-col gap-0.5 py-0.5 uppercase">
                            <span>Momo Ref: <span className="font-mono text-white/70">{tx.id}</span></span>
                            <span>Recorded Balance: <span className="font-mono text-white/70">{formatRwf(tx.balance)}</span></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Mobile summary sticky footer card */}
                {(() => {
                  const totalBase = filteredTxs.reduce((sum, t) => sum + t.amount, 0);
                  const totalFee = filteredTxs.reduce((sum, t) => sum + t.fee, 0);
                  const totalNet = filteredTxs.reduce((sum, t) => {
                    const combined = t.amount + t.fee;
                    return t.type === 'cash_in' ? sum + t.amount : sum - combined;
                  }, 0);

                  return (
                    <div className="bg-gradient-to-br from-blue-950/30 to-black/50 border border-white/20 p-4 rounded-2xl space-y-2.5 uppercase text-[9px] font-semibold">
                      <div className="text-blue-200 font-extrabold text-xs tracking-wider mb-1">TOTALS ({filteredTxs.length})</div>
                      <div className="flex justify-between items-center text-white/60">
                        <span>Total Base:</span>
                        <strong className="text-white font-bold font-mono text-[10px]">{formatRwf(totalBase)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-white/60">
                        <span>Total Fees:</span>
                        <strong className="text-rose-300 font-bold font-mono text-[10px]">{formatRwf(totalFee)}</strong>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/10 pt-2">
                        <span className="text-white/80 font-bold">Filtered Net Change:</span>
                        <strong className={`font-mono text-[11px] font-extrabold ${totalNet >= 0 ? 'text-emerald-400' : 'text-rose-300'}`}>
                          {totalNet >= 0 ? '+' : ''}{formatRwf(totalNet)}
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
