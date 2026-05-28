/**
 * Type declarations for Momo Spend Tracker.
 */

export interface MomoTransaction {
  id: string; // TxId or custom ID
  rawText: string;
  type: 'payment' | 'transfer' | 'cash_in' | 'cash_out' | 'other';
  amount: number; // RWF
  fee: number; // RWF
  balance: number; // RWF
  counterparty: string; // name or company
  timestamp: string; // ISO date string or formatted date string
  formattedDate: string; // YYYY-MM-DD
  category: string;
  isCustom?: boolean; // manual entry
}

export interface AdRevenueRecord {
  date: string; // YYYY-MM-DD
  monetag: number; // USD
  adsterra: number; // USD
  profiton: number; // USD
  serverCosts: number; // USD
  adCosts: number; // USD
  checkedAt?: string; // timestamp when entered
}

export interface AppSettings {
  usdToRwfRate: number; // default 1465
  dailySpendingLimit: number; // default 20000 RWF
  customCategoryMappings: Record<string, string>; // Keyword -> Category
}

export interface CategoryBudget {
  category: string;
  limit: number;
}
