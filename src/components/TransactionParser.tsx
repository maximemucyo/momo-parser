import React, { useState } from 'react';
import { MomoTransaction } from '../types';
import { parseMomoMessage } from '../utils/momoParser';
import { Clipboard, Check, HelpCircle, FilePlus2, Plus, ArrowRight } from 'lucide-react';

interface TransactionParserProps {
  onAddTransactions: (txs: MomoTransaction[]) => void;
  existingIds: string[];
}

export const TransactionParser: React.FC<TransactionParserProps> = ({
  onAddTransactions,
  existingIds,
}) => {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'paste' | 'manual'>('paste');
  const [feedback, setFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Manual entry states
  const [mCP, setMCP] = useState('');
  const [mAmount, setMAmount] = useState('');
  const [mFee, setMFee] = useState('');
  const [mType, setMType] = useState<'payment' | 'transfer' | 'cash_in' | 'cash_out'>('payment');
  const [mDate, setMDate] = useState(new Date().toISOString().substring(0, 10));

  const handleBulkParse = () => {
    if (!inputText.trim()) return;

    // Split raw paste by standard statements markers.
    // MTN MoMo signals usually terminate with *EN# or contain indicators like "TxId" or "transferred"
    const lines = inputText
      .split(/(?=\*16[45]\*S\*)|(?=TxId:\d+)/gi)
      .map(s => s.trim())
      .filter(s => s.length > 10); // omit tiny empty chunks

    const parsedList: MomoTransaction[] = [];
    let duplicates = 0;

    for (const msg of lines) {
      const tx = parseMomoMessage(msg);
      if (tx) {
        if (existingIds.includes(tx.id)) {
          duplicates++;
        } else {
          parsedList.push(tx);
        }
      }
    }

    if (parsedList.length > 0) {
      onAddTransactions(parsedList);
      setFeedback({
        success: true,
        msg: `Successfully parsed and recorded ${parsedList.length} new transactions! ${
          duplicates > 0 ? `(${duplicates} duplicate statements skipped)` : ''
        }`,
      });
      setInputText('');
    } else {
      setFeedback({
        success: false,
        msg: duplicates > 0 
          ? `No new transactions. (All matching raw lines are already recorded in local storage)`
          : 'Could not detect any valid MTN Mobile Money messages. Check the formats in the guide!',
      });
    }

    setTimeout(() => setFeedback(null), 8000);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mCP.trim() || !mAmount) {
      setFeedback({ success: false, msg: 'Please provide counterparty name and amount!' });
      return;
    }

    const amt = parseFloat(mAmount);
    const fee = parseFloat(mFee) || 0;
    if (isNaN(amt) || amt <= 0) {
      setFeedback({ success: false, msg: 'Amount must be a positive number!' });
      return;
    }

    const isReceive = mType === 'cash_in';
    const txId = 'MAN-' + Date.now().toString(36).toUpperCase();

    const newTx: MomoTransaction = {
      id: txId,
      rawText: `[Manual Entry] Pay to ${mCP}: Amount ${amt} RWF. Fee: ${fee}`,
      type: mType,
      amount: amt,
      fee: fee,
      balance: 0, // Not applicable
      counterparty: mCP,
      timestamp: `${mDate} 12:00:00`,
      formattedDate: mDate,
      category: isReceive ? 'Income' : 'Other Expenses',
      isCustom: true
    };

    onAddTransactions([newTx]);
    setFeedback({ success: true, msg: 'Manual transaction record loaded successfully!' });
    setMCP('');
    setMAmount('');
    setMFee('');
    
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadSampleMomoMessage = () => {
    // Inject a quick random raw SMS statement
    const samplePool = [
      "TxId:28137396402*S*Your payment of 3,400 RWF to SIMBA SUPERMARKET LTD 6501832 was completed at 2026-05-25 21:11:50.  Balance: 2,217 RWF. Fee 0 RWF.*EN#",
      "*165*S*3000 RWF transferred to Isabelle YAKUJIJE (250787611214) at 2026-05-25 21:17:37 .Fee: 100RWF.Balance: 2117RWF.Dial *182*1*3# and send money abroad *EN#",
      "*165*S*20000 RWF transferred to Anne Marie TWAGIRAYEZU (250789955598) at 2026-05-27 19:25:47 .Fee: 250RWF.Balance: 2609RWF.Dial *182*1*3# and send money abroad *EN#",
      "TxId:28178794963*S*Your payment of 10,000 RWF to SOCIETE PETROLIERE  LTD 322210 was completed at 2026-05-27 21:53:27.  Balance: 9,209 RWF. Fee 0 RWF.*EN#",
      "*164*S*Y'ello, A transaction of 1000 RWF by MTN RWANDACELL  LIMITED was completed at 2026-05-28 10:28:52. Balance:8209 RWF. Fee  0 RWF. FT Id: 28184232232. ET  Id: 17799569022355481.*EN#"
    ];
    const rand = samplePool[Math.floor(Math.random() * samplePool.length)];
    setInputText(prev => prev + (prev ? '\n' : '') + rand);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-3xl shadow-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/25">
        <button
          onClick={() => setActiveTab('paste')}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'paste'
              ? 'text-white bg-[#121c2e]/10 border-b-2 border-indigo-400'
              : 'text-white/45 hover:text-white hover:bg-white/5'
          }`}
        >
          Paste Raw Momo Messages
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'manual'
              ? 'text-white bg-[#121c2e]/10 border-b-2 border-indigo-400'
              : 'text-white/45 hover:text-white hover:bg-white/5'
          }`}
        >
          Add Manual Expense
        </button>
      </div>

      <div className="p-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 mb-4 rounded-2xl text-xs flex items-center gap-2 animate-fade-in ${
              feedback.success
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-200'
            }`}
          >
            {feedback.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <HelpCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{feedback.msg}</span>
          </div>
        )}

        {activeTab === 'paste' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-white/70 text-xs font-bold block">
                Line-by-Line SMS Statements
              </label>
              <button
                type="button"
                onClick={loadSampleMomoMessage}
                className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 hover:underline flex items-center gap-1 cursor-pointer transition"
              >
                + Grab sample msg
              </button>
            </div>

            <textarea
              className="w-full h-32 bg-black/35 border border-white/10 rounded-2xl p-3.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-505 resize-none custom-scrollbar"
              placeholder="Paste raw MTN Mobile Money statements here. You can paste multiple messages together, the engine handles bulk extraction automatically..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1.5">
              <span className="text-[11px] text-white/45 max-w-[70%]">
                Supports payments, individual transfers (such as Isabelle, Jean Louis), airtime, and received transfers.
              </span>
              <button
                onClick={handleBulkParse}
                disabled={!inputText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:hover:bg-indigo-650 text-white font-bold px-4 py-2 rounded-full text-xs flex items-center gap-2 cursor-pointer transition shadow-md self-end"
              >
                <Clipboard className="w-3.5 h-3.5" />
                Parse Statements
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white/55 text-xs font-bold block mb-1">Counterparty Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Simba Supermarket, Isabelle"
                  className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-505 placeholder:text-white/20"
                  value={mCP}
                  onChange={e => setMCP(e.target.value)}
                />
              </div>

              <div>
                <label className="text-white/55 text-xs font-bold block mb-1">Transaction Type</label>
                <select
                  className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-indigo-200 focus:outline-none focus:ring-1 focus:ring-indigo-505"
                  value={mType}
                  onChange={e => setMType(e.target.value as any)}
                >
                  <option value="payment" className="bg-slate-900 text-white">Payment Purchase</option>
                  <option value="transfer" className="bg-slate-900 text-white">Money Transfer (Sent)</option>
                  <option value="cash_in" className="bg-slate-900 text-white">Received Cash In</option>
                  <option value="cash_out" className="bg-slate-900 text-white">Cash Out Agent</option>
                </select>
              </div>

              <div>
                <label className="text-white/55 text-xs font-bold block mb-1">Amount (RWF)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-505 placeholder:text-white/20"
                  value={mAmount}
                  onChange={e => setMAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="text-white/55 text-xs font-bold block mb-1">Momo Fee (RWF)</label>
                <input
                  type="number"
                  placeholder="e.g. 100"
                  className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-505 placeholder:text-white/20"
                  value={mFee}
                  onChange={e => setMFee(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-white/55 text-xs font-bold block mb-1">Post Date</label>
                <input
                  type="date"
                  className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-505"
                  value={mDate}
                  onChange={e => setMDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-full text-xs flex items-center gap-1.5 transition shadow-lg cursor-pointer animate-pulse-subtle"
              >
                <Plus className="w-4 h-4" />
                Add Record
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
