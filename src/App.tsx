import { useState, useEffect } from 'react';
import { MomoTransaction, AdRevenueRecord, AppSettings } from './types';
import { getInitialMomoTransactions, INITIAL_AD_REVENUES, DEFAULT_SETTINGS } from './data/initialData';
import { BudgetSummary } from './components/BudgetSummary';
import { TransactionParser } from './components/TransactionParser';
import { AdRevenueDashboard } from './components/AdRevenueDashboard';
import { VisualReports } from './components/VisualReports';
import { TransactionList } from './components/TransactionList';
import { Wallet, Landmark, RefreshCw, Layers, Calendar, BarChart3, HelpCircle, FileTerminal, ArrowRight, Sun, RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'trends' | 'earnings' | 'ledger'>('trends');

  const [transactions, setTransactions] = useState<MomoTransaction[]>([]);
  const [revenueRecords, setRevenueRecords] = useState<AdRevenueRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from SQLite API on mount
  useEffect(() => {
    let active = true;
    const loadFromSQLite = async () => {
      try {
        const [resSettings, resTxs, resRevenue] = await Promise.all([
          fetch('/api/settings').then(r => r.json()),
          fetch('/api/transactions').then(r => r.json()),
          fetch('/api/ad-revenue').then(r => r.json())
        ]);
        if (active) {
          setSettings(resSettings);
          setTransactions(resTxs);
          setRevenueRecords(resRevenue);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to parse from SQLite database', err);
        if (active) {
          setIsLoading(false);
        }
      }
    };
    loadFromSQLite();
    return () => {
      active = false;
    };
  }, []);

  // Handlers
  const handleAddTransactions = async (newTxs: MomoTransaction[]) => {
    setTransactions(prev => [...newTxs, ...prev]);
    try {
      await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTxs)
      });
    } catch (err) {
      console.error('Failed to save bulk transactions to SQLite', err);
    }
  };

  const handleAddRevenueRecord = async (rec: AdRevenueRecord) => {
    setRevenueRecords(prev => {
      // If a record already exists for the same date, overwrite it to have correct records
      const filtered = prev.filter(r => r.date !== rec.date);
      return [...filtered, rec];
    });
    try {
      await fetch('/api/ad-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rec)
      });
    } catch (err) {
      console.error('Failed to save ad revenue to SQLite', err);
    }
  };

  const handleDeleteRevenueRecord = async (date: string) => {
    setRevenueRecords(prev => prev.filter(r => r.date !== date));
    try {
      await fetch(`/api/ad-revenue/${date}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to delete ad revenue from SQLite', err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/transactions/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to delete transaction from SQLite', err);
    }
  };

  const handleUpdateTransactionCategory = async (id: string, newCategory: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
    try {
      await fetch('/api/transactions/update-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, category: newCategory })
      });
    } catch (err) {
      console.error('Failed to update transaction category in SQLite', err);
    }
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (err) {
      console.error('Failed to save settings to SQLite', err);
    }
  };

  const handleAddCategoryMapping = async (keyword: string, category: string) => {
    const updatedMappings = { ...settings.customCategoryMappings, [keyword]: category };
    const newSettings = { ...settings, customCategoryMappings: updatedMappings };
    setSettings(newSettings);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
    } catch (err) {
      console.error('Failed to save category mapping to SQLite', err);
    }
  };

  // Reset SQLite database to custom default demo statements
  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to reset the SQLite database back to the default demo statement data? Your custom edits will be re-initialized.')) {
      setIsLoading(true);
      try {
        await fetch('/api/reset', { method: 'POST' });
        const [resSettings, resTxs, resRevenue] = await Promise.all([
          fetch('/api/settings').then(r => r.json()),
          fetch('/api/transactions').then(r => r.json()),
          fetch('/api/ad-revenue').then(r => r.json())
        ]);
        setSettings(resSettings);
        setTransactions(resTxs);
        setRevenueRecords(resRevenue);
      } catch (err) {
        console.error('Failed to reset SQLite database', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header navbar with zero margin clutter */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md px-4 py-3.5 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 w-full">
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              MomoSpend Suite
              <span className="hidden sm:inline-block bg-indigo-400/10 text-indigo-300 text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest font-bold">
                PWA Ready
              </span>
            </h1>
            <p className="subtitle text-[10px] sm:text-[11px] text-white/50 line-clamp-1 sm:line-clamp-none max-w-[200px] sm:max-w-none">
              Automated Mobile Money SMS Parser & Website Ad Yield Dashboard
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Reset Button */}
            <button
              onClick={handleResetData}
              className="text-[10px] sm:text-xs text-indigo-205 hover:text-white bg-indigo-650/10 hover:bg-slate-500/20 border border-indigo-505/20 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1"
              title="Reset records to default demo statements"
            >
              <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              Reset
            </button>
            
            <div className="flex items-center gap-1 bg-black/30 px-2.5 py-1 sm:py-1.5 rounded-xl border border-white/10 text-[10px] sm:text-[11px] font-mono text-white/60">
              <strong className="text-indigo-300 font-bold">{settings.usdToRwfRate} RWF/$</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Navigation System */}
      <nav className="bg-white/5 border-b border-white/10 backdrop-blur-md py-2 px-4 sticky top-[57px] sm:top-[65px] z-20 shadow-sm leading-none">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'trends'
                ? 'bg-indigo-600/80 text-white font-bold shadow'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Trends & Overviews
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'earnings'
                ? 'bg-indigo-600/80 text-white font-bold shadow'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Ad Network Logs
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'ledger'
                ? 'bg-indigo-600/80 text-white font-bold shadow'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            MoMo Ledger & Rules
          </button>
        </div>
      </nav>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3.5" />
            <span className="text-sm font-semibold tracking-wide text-white">Retrieving Persistent Ledger Records...</span>
            <p className="text-[11px] text-white/40 mt-1">Connecting to back-end SQLite database engine</p>
          </div>
        ) : (
          <>
            {/* Dynamic Multi-Tab Content Engine */}
            {activeTab === 'trends' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Metric Indicators & Active Alarms */}
            <BudgetSummary
              transactions={transactions}
              revenueRecords={revenueRecords}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />

            {/* Quick SMS Paste Box & Info Banner side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TransactionParser
                  onAddTransactions={handleAddTransactions}
                  existingIds={transactions.map(t => t.id)}
                />
              </div>

              {/* Seamless instruction panel */}
              <div id="instructions-sidepanel" className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-200 mb-2 flex items-center gap-2">
                    <FileTerminal className="w-4 h-4 text-indigo-300" />
                    How to Parse & Log
                  </h3>
                  <ol className="list-decimal list-inside space-y-2.5 text-xs text-white/60 mt-2 leading-relaxed">
                    <li>Copy any raw MTN Mobile Money statement on your handset devices.</li>
                    <li>Paste the SMS text verbatim inside the box.</li>
                    <li>Hit <strong className="text-white font-semibold">Parse Statements</strong> &mdash; the system parses amounts, fees, balances, timestamps, and counterparties instantly.</li>
                    <li>The system automatically files transactions utilizing custom mapping configurations.</li>
                  </ol>
                </div>

                <div className="mt-4 p-3.5 bg-black/25 border border-white/5 rounded-2xl">
                  <span className="text-[11px] font-bold text-indigo-300 block mb-1 flex items-center gap-1">
                    💡 Easy Simulation Tip
                  </span>
                  <p className="text-[10px] text-white/50 leading-normal">
                    Click the <strong className="text-indigo-250 font-bold cursor-pointer hover:underline" onClick={() => setActiveTab('trends')}>Grab sample msg</strong> utility link above the paste box to load realistic pre-formatted real statements instantly!
                  </p>
                </div>
              </div>
            </div>

            {/* Visual reports charts */}
            <VisualReports
              transactions={transactions}
              revenueRecords={revenueRecords}
              settings={settings}
            />
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6 animate-fade-in">
            <AdRevenueDashboard
              revenueRecords={revenueRecords}
              onAddRecord={handleAddRevenueRecord}
              onDeleteRecord={handleDeleteRevenueRecord}
              settings={settings}
            />
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-6 animate-fade-in">
            <TransactionList
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction}
              onUpdateTransactionCategory={handleUpdateTransactionCategory}
              settings={settings}
              onAddCategoryMapping={handleAddCategoryMapping}
            />
          </div>
        )}
          </>
        )}
      </main>

      {/* Universal Footer */}
      <footer className="border-t border-white/5 bg-black/20 backdrop-blur-md py-5 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center text-white/40 text-[11px] font-mono">
          <p>
            MomoSpend Suite &mdash; Powered by full-stack React, Express, and a persistent SQLite database.
          </p>
          <p>
            Stateful VPS Ready Server Deployment with Local SQLite Registry.
          </p>
        </div>
      </footer>
    </div>
  );
}
