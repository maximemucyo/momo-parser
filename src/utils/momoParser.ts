import { MomoTransaction } from '../types';

/**
 * Parses numeric strings containing commas, spaces, or currency symbols.
 */
function cleanNumber(str: string | undefined): number {
  if (!str) return 0;
  return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
}

/**
 * Cleans the counterparty string by removing extra tokens/references and capitalizing cleanly.
 */
function cleanCounterparty(cp: string): string {
  let cleaned = cp.trim();
  // Remove "with token and ET Id: ..." or "with token ..." and "ET Id: ..."
  cleaned = cleaned.replace(/\s+with\s+token.*$/i, '');
  cleaned = cleaned.replace(/\s+and\s+ET\s+Id.*$/i, '');
  cleaned = cleaned.replace(/\s+ET\s+Id.*$/i, '');
  // Normalize multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  // Handle explicit eKash requested styling
  if (cleaned.toLowerCase() === 'ekash') {
    return 'To Ekash';
  }
  return cleaned;
}

/**
 * Normalizes date strings to standard ISO format (or a clean YYYY-MM-DD HH:mm:ss).
 */
function parseDate(str: string | undefined): string {
  if (!str) return new Date().toISOString();
  // Standardize spaces and clean up
  const clean = str.trim().replace(/\s+/g, ' ');
  // If it matches YYYY-MM-DD HH:mm:ss, return or convert
  return clean;
}

/**
 * Automap counterparty labels to categories.
 */
export function autoCategorize(counterparty: string, type: string, customMappings: Record<string, string> = {}): string {
  const normCP = counterparty.toLowerCase();
  
  // Custom mappings first
  for (const [kw, cat] of Object.entries(customMappings)) {
    if (normCP.includes(kw.toLowerCase())) {
      return cat;
    }
  }

  // Fallbacks
  if (type === 'cash_in') return 'Income';
  if (normCP.includes('supermarket') || normCP.includes('simba') || normCP.includes('sawa') || normCP.includes('market') || normCP.includes('grocer')) {
    return 'Groceries & Shopping';
  }
  if (normCP.includes('petrol') || normCP.includes('sp ltd') || normCP.includes('shell') || normCP.includes('station') || normCP.includes('fuel') || normCP.includes('societe petroliere')) {
    return 'Transport & Fuel';
  }
  if (normCP.includes('rwandacell') || normCP.includes('mtn') || normCP.includes('airtime') || normCP.includes('telecom') || normCP.includes('canal') || normCP.includes('electricity') || normCP.includes('reg')) {
    return 'Utilities & Airtime';
  }
  if (normCP.includes('restaurant') || normCP.includes('cafe') || normCP.includes('food') || normCP.includes('bar') || normCP.includes('inn') || normCP.includes('grill')) {
    return 'Food & Dining';
  }
  if (type === 'transfer') {
    return 'Transfers (Sent)';
  }
  if (normCP.includes('server') || normCP.includes('host') || normCP.includes('aws') || normCP.includes('digitalocean') || normCP.includes('hetzner')) {
    return 'Server Costs';
  }
  if (normCP.includes('ads') || normCP.includes('adsterra') || normCP.includes('monetag') || normCP.includes('facebook') || normCP.includes('google ad')) {
    return 'Advertising Costs';
  }

  return 'Other Expenses';
}

/**
 * Primary Momo message parsing suite.
 */
export function parseMomoMessage(text: string, customMappings: Record<string, string> = {}): MomoTransaction | null {
  const cleanText = text.trim();
  if (!cleanText) return null;

  // Let's create unique ID
  let txId = '';
  // Try to find TxId inside the text at start or end
  const txMatch = cleanText.match(/TxId:?\s*(\d+)/i) || cleanText.match(/FT\s*Id:?\s*(\d+)/i) || cleanText.match(/transaction\s*id:?\s*(\d+)/i);
  if (txMatch) {
    txId = txMatch[1];
  } else {
    // Generate pseudorandom hash from content length + millisecond timestamp to prevent collisions
    txId = 'NONTX-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  }

  // Pattern 1: Payment of X RWF to Y was completed at Z. Balance: A RWF. Fee B RWF
  // Example: "TxId:28137396402*S*Your payment of 3,400 RWF to SIMBA SUPERMARKET LTD 6501832 was completed at 2026-05-25 21:11:50.  Balance: 2,217 RWF. Fee 0 RWF.*EN#"
  // Example: "TxId:28137562288*S*Your payment of 1,200 RWF to Jean Louis 565549 was completed at 2026-05-25 21:21:53.  Balance: 917 RWF. Fee 0 RWF.*EN#"
  const paymentRegex = /payment\s+of\s+([\d,]+)\s*RWF\s+to\s+(.*?)\s+was\s+completed\s+at\s+([\d-]+\s+[\d:]+)\.?\s*Balance:\s*([\d,]+)\s*RWF\.?\s*Fee\s*([\d,]+)\s*RWF/i;
  
  // Pattern 1b: Payment of X RWF to Y was completed at Z. Fee B RWF. Balance: A RWF
  // Example: "TxId:27756800536*S*Your payment of 600 RWF to eKash with token and ET Id: 27756800536 was completed at 2026-05-06 19:49:27. Fee 40 RWF. Balance: 128369 RWF . Message: - ACSC. *EN#"
  const paymentRegexFeeFirst = /payment\s+of\s+([\d,]+)\s*RWF\s+to\s+(.*?)\s+was\s+completed\s+at\s+([\d-]+\s+[\d:]+)\.?\s*Fee\s*([\d,]+)\s*RWF\.?\s*Balance:\s*([\d,]+)\s*RWF/i;

  // Pattern 2: X RWF transferred to Y (Z) at A .Fee: B.Balance: C
  // Example: "*165*S*3000 RWF transferred to Isabelle YAKUJIJE (250787611214) at 2026-05-25 21:17:37 .Fee: 100RWF.Balance: 2117RWF.Dial *182*1*3# and send money abroad *EN#"
  const transferRegex = /([\d,]+)\s*RWF\s+transferred\s+to\s+(.*?)\s+at\s+([\d-]+\s+[\d:]+)\s*\.?\s*Fee:\s*([\d,]+)\s*RWF?\.?\s*Balance:\s*([\d,]+)\s*RWF?/i;

  // Pattern 3: Y'ello, A transaction of X RWF by Y was completed at Z. Balance: A RWF. Fee B RWF
  // Example: "*164*S*Y'ello, A transaction of 1000 RWF by MTN RWANDACELL  LIMITED was completed at 2026-05-28 10:28:52. Balance:8209 RWF. Fee  0 RWF. FT Id: 28184232232. ET  Id: 17799569022355481.*EN#"
  const transactionByRegex = /transaction\s+of\s+([\d,]+)\s*RWF\s+by\s+(.*?)\s+was\s+completed\s+at\s+([\d-]+\s+[\d:]+)\.?\s*Balance:\s*([\d,]+)\s*RWF\.?\s*Fee\s*([\d,]+)\s*RWF/i;

  // Pattern 4: Received money inbound
  // Example: "You have received 15,000 RWF from John Doe (2507...) at 2026-05-28 12:00:00. Fee 0 RWF. Balance: 26,154 RWF"
  const receivedRegex = /received\s+([\d,]+)\s*RWF\s+from\s+(.*?)\s+at\s+([\d-]+\s+[\d:]+)\.?\s*(?:Fee\s*([\d,]+)\s*RWF\.?)?\s*Balance:\s*([\d,]+)\s*RWF/i;

  let type: 'payment' | 'transfer' | 'cash_in' | 'cash_out' | 'other' = 'other';
  let amount = 0;
  let fee = 0;
  let balance = 0;
  let counterparty = 'Unknown';
  let timestamp = new Date().toISOString().substring(0, 19).replace('T', ' ');

  if (paymentRegex.test(cleanText)) {
    const m = cleanText.match(paymentRegex)!;
    type = 'payment';
    amount = cleanNumber(m[1]);
    counterparty = cleanCounterparty(m[2]);
    timestamp = parseDate(m[3]);
    balance = cleanNumber(m[4]);
    fee = cleanNumber(m[5]);
  } else if (paymentRegexFeeFirst.test(cleanText)) {
    const m = cleanText.match(paymentRegexFeeFirst)!;
    type = 'payment';
    amount = cleanNumber(m[1]);
    counterparty = cleanCounterparty(m[2]);
    timestamp = parseDate(m[3]);
    fee = cleanNumber(m[4]);
    balance = cleanNumber(m[5]);
  } else if (transferRegex.test(cleanText)) {
    const m = cleanText.match(transferRegex)!;
    type = 'transfer';
    amount = cleanNumber(m[1]);
    counterparty = cleanCounterparty(m[2]);
    timestamp = parseDate(m[3]);
    fee = cleanNumber(m[4]);
    balance = cleanNumber(m[5]);
  } else if (transactionByRegex.test(cleanText)) {
    const m = cleanText.match(transactionByRegex)!;
    type = 'payment'; // Airtime/direct billing
    amount = cleanNumber(m[1]);
    counterparty = cleanCounterparty(m[2]);
    timestamp = parseDate(m[3]);
    balance = cleanNumber(m[4]);
    fee = cleanNumber(m[5]);
  } else if (receivedRegex.test(cleanText)) {
    const m = cleanText.match(receivedRegex)!;
    type = 'cash_in';
    amount = cleanNumber(m[1]);
    counterparty = cleanCounterparty(m[2]);
    timestamp = parseDate(m[3]);
    fee = cleanNumber(m[4]) || 0;
    balance = cleanNumber(m[5]);
  } else {
    // Let's do a fallback generic parser if they paste some other structure
    // e.g. "Cash out of 10000 RWF at agent 123 completed... Balance: 1000 RWF. Fee 200 RWF"
    const genericAmount = cleanText.match(/([\d,]+)\s*RWF/i);
    const genericBalance = cleanText.match(/Balance:?\s*([\d,]+)/i);
    const genericFee = cleanText.match(/Fee:?\s*([\d,]+)/i);
    
    if (genericAmount) {
      amount = cleanNumber(genericAmount[1]);
      balance = genericBalance ? cleanNumber(genericBalance[1]) : 0;
      fee = genericFee ? cleanNumber(genericFee[1]) : 0;
      type = cleanText.toLowerCase().includes('received') ? 'cash_in' : 'payment';
      counterparty = 'Momo System / Agent';
      
      // Match simple date
      const dateMatch = cleanText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
      if (dateMatch) {
        timestamp = dateMatch[1];
      }
    } else {
      return null; // Not parseable
    }
  }

  // Format YYYY-MM-DD
  let formattedDate = new Date().toISOString().substring(0, 10);
  if (timestamp) {
    const dMatch = timestamp.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (dMatch) {
      formattedDate = `${dMatch[1]}-${dMatch[2]}-${dMatch[3]}`;
    }
  }

  return {
    id: txId,
    rawText: cleanText,
    type,
    amount,
    fee,
    balance,
    counterparty,
    timestamp,
    formattedDate,
    category: autoCategorize(counterparty, type, customMappings)
  };
}
