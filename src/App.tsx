import { useState, useEffect, FormEvent } from 'react';
import { MomoTransaction, AdRevenueRecord, AppSettings } from './types';
import { getInitialMomoTransactions, INITIAL_AD_REVENUES, DEFAULT_SETTINGS } from './data/initialData';
import { BudgetSummary } from './components/BudgetSummary';
import { TransactionParser } from './components/TransactionParser';
import { AdRevenueDashboard } from './components/AdRevenueDashboard';
import { VisualReports } from './components/VisualReports';
import { TransactionList } from './components/TransactionList';
import { Wallet, Landmark, RefreshCw, Layers, Calendar, BarChart3, HelpCircle, FileTerminal, ArrowRight, Sun, RotateCcw, MessageSquarePlus, Bell, LogOut, Check } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'messages' | 'analytics' | 'earnings' | 'ledger'>('messages');

  const [transactions, setTransactions] = useState<MomoTransaction[]>([]);
  const [revenueRecords, setRevenueRecords] = useState<AdRevenueRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Authentication States
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('momo_auth_logged') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Notification / Reminder states
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [reminderActive, setReminderActive] = useState(() => {
    return localStorage.getItem('momo_reminder_active') !== 'false'; // default is true if supported
  });

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Daily 7 PM check loop (checks if 7 PM and triggers reminder once per day)
  useEffect(() => {
    if (!reminderActive || notificationPermission !== 'granted') return;

    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 19) { // 7:00 PM - 7:59 PM
        const lastRemindedDate = localStorage.getItem('momo_last_reminded');
        const todayStr = now.toISOString().substring(0, 10);
        if (lastRemindedDate !== todayStr) {
          localStorage.setItem('momo_last_reminded', todayStr);
          try {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification('MomoSpend Reminder', {
                  body: 'Hey Maxime, it is 7:00 PM! Time to paste your MTN MoMo statements and log your daily website ad yield.',
                  icon: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=192&h=192&fit=crop',
                  tag: 'daily-reminder-momo'
                });
              });
            } else {
              new Notification('MomoSpend Daily Reminder', {
                body: 'Hey Maxime, it is 7:00 PM! Time to paste your MTN MoMo statements and log your daily website ad yield.',
                icon: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=192&h=192&fit=crop'
              });
            }
          } catch (e) {
            console.warn('Failed to dispatch background notification:', e);
          }
        }
      }
    }, 45000); // Check every 45 seconds

    return () => clearInterval(interval);
  }, [reminderActive, notificationPermission]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (loginEmail.trim() === 'maximemucyo1@gmail.com' && loginPassword === 'Welcome@1234') {
      localStorage.setItem('momo_auth_logged', 'true');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid security email address or passcode.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('momo_auth_logged');
    setIsAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
  };

  const handleEnableNotification = async () => {
    if (!('Notification' in window)) {
      alert('This device/browser does not support native notifications.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      localStorage.setItem('momo_reminder_active', 'true');
      setReminderActive(true);
      try {
        new Notification('MomoSpend Suite', {
          body: 'Success! Logging reminders are active. You will receive a daily alert at 7:00 PM.',
          icon: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=192&h=192&fit=crop'
        });
      } catch (err) {
        console.warn('Error launching initial prompt:', err);
      }
    }
  };

  const toggleReminder = () => {
    const nextState = !reminderActive;
    setReminderActive(nextState);
    localStorage.setItem('momo_reminder_active', String(nextState));
  };

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070b15] text-white flex flex-col items-center justify-center p-4 selection:bg-blue-500 font-sans">
        <div className="w-full max-w-sm bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Ambient radial blur */}
          <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl" />
          <div className="absolute left-0 bottom-0 -translate-x-1/3 translate-y-1/3 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl" />
          
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-blue-600/10 rounded-2xl text-blue-400 mb-3 border border-blue-500/20">
              <Wallet className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">MomoSpend Suite</h2>
            <p className="subtitle text-[11px] text-white/45 mt-1">Authorized access credentials required</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-white/55 text-xs font-semibold block mb-1">Email / Username</label>
              <input
                type="email"
                required
                className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-base md:text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-white/25 shadow-inner"
                placeholder="Enter your email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-white/55 text-xs font-semibold block mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-base md:text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-white/20 shadow-inner"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
              />
            </div>
            
            {loginError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/15 text-rose-300 text-[11px] rounded-xl text-center font-semibold">
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow-lg cursor-pointer mt-2"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Header navbar with zero margin clutter */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md px-4 py-3.5 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 w-full">
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              MomoSpend Suite
              <span className="hidden sm:inline-block bg-blue-400/10 text-blue-300 text-[9px] font-mono px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest font-bold">
                PWA Ready
              </span>
            </h1>
            <p className="subtitle text-[10px] sm:text-[11px] text-white/50 line-clamp-1 sm:line-clamp-none max-w-[200px] sm:max-w-none font-medium">
              Automated Mobile Money SMS Parser & Website Ad Yield Dashboard
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Reset Button */}
            <button
              onClick={handleResetData}
              className="text-[10px] sm:text-xs text-blue-200 hover:text-white bg-blue-600/10 hover:bg-slate-500/20 border border-blue-500/20 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1"
              title="Reset records to default demo statements"
            >
              <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              Reset
            </button>
            
            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="text-[10px] sm:text-xs text-rose-300 hover:text-white bg-rose-600/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl cursor-pointer transition flex items-center gap-1"
              title="Sign out securely"
            >
              <LogOut className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Primary Navigation System */}
      <nav className="bg-white/5 border-b border-white/10 backdrop-blur-md py-2 px-4 sticky top-[57px] sm:top-[65px] z-20 shadow-sm leading-none">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'messages'
                ? 'bg-blue-600/80 text-white font-bold shadow'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4" />
            Paste Messages
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'analytics'
                ? 'bg-blue-600/80 text-white font-bold shadow'
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
                ? 'bg-blue-600/80 text-white font-bold shadow'
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
                ? 'bg-blue-600/80 text-white font-bold shadow'
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
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-3.5" />
            <span className="text-sm font-semibold tracking-wide text-white">Retrieving Persistent Ledger Records...</span>
            <p className="text-[11px] text-white/40 mt-1">Connecting to back-end SQLite database engine</p>
          </div>
        ) : (
          <>
            {/* Messages Homepage Tab */}
            {activeTab === 'messages' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-blue-500/10 border border-blue-500/15 p-5 rounded-3xl">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-1 uppercase tracking-wider">
                    Welcome, Maxime!
                  </h2>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Paste your MTN Mobile Money SMS strings below to instantly log transactions, or log manually if desired.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <TransactionParser
                      onAddTransactions={handleAddTransactions}
                      existingIds={transactions.map(t => t.id)}
                    />
                  </div>

                  {/* iOS / iPhone Notification Controller Dashboard */}
                  <div id="reminder-widget" className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-blue-200 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${reminderActive && notificationPermission === 'granted' ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${reminderActive && notificationPermission === 'granted' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        </span>
                        Daily 7 PM Reminder
                      </h3>
                      <p className="text-xs text-white/55 leading-relaxed font-medium">
                        Prompts you automatically inside Safari/iOS at 7:00 PM local time to log messages.
                      </p>
                    </div>

                    <div className="p-3.5 bg-black/25 border border-white/5 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
                        <span className="text-white/40">Push Console:</span>
                        <strong className={`font-mono ${notificationPermission === 'granted' ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {notificationPermission === 'granted' ? 'Granted' : 'Unauthorized'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide border-t border-white/5 pt-2">
                        <span className="text-white/40">Status:</span>
                        <strong className={`font-mono ${reminderActive && notificationPermission === 'granted' ? 'text-emerald-300 animate-pulse' : 'text-white/40'}`}>
                          {reminderActive && notificationPermission === 'granted' ? 'Trigger active' : 'Disabled'}
                        </strong>
                      </div>

                      {notificationPermission !== 'granted' ? (
                        <button
                          onClick={handleEnableNotification}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer shadow mt-1"
                        >
                          Authorize Notification
                        </button>
                      ) : (
                        <button
                          onClick={toggleReminder}
                          className={`w-full font-bold py-1.5 px-3 rounded-lg text-[11px] transition-all cursor-pointer border mt-1 ${
                            reminderActive 
                              ? 'bg-rose-600/20 border-rose-500/30 text-rose-300 hover:bg-rose-600/35' 
                              : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/35'
                          }`}
                        >
                          {reminderActive ? 'Temporarily Mute Alert' : 'Enable Daily Alert'}
                        </button>
                      )}
                    </div>

                    <div className="text-[10px] text-white/40 leading-normal space-y-1 bg-black/15 p-3 rounded-2xl border border-white/5">
                      <p className="font-bold text-blue-200 uppercase tracking-widest text-[9px]">📲 iOS Installation Guide:</p>
                      <p>1. Open this page in standard Safari on your iPhone.</p>
                      <p>2. Tap the browser Share Arrow ➔ Choose "Add to Home Screen".</p>
                      <p>3. Run MomoSpend from homescreen icon and click "Authorize" above.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trends and Overviews Tab Selector */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-fade-in">
                {/* Top Metric Indicators & Active Alarms */}
                <BudgetSummary
                  transactions={transactions}
                  revenueRecords={revenueRecords}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                />

                {/* Visual reports charts */}
                <VisualReports
                  transactions={transactions}
                  revenueRecords={revenueRecords}
                  settings={settings}
                />
              </div>
            )}

            {/* Ad Revenue logs screen */}
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

            {/* Transaction Ledger & Custom Categories screen */}
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
