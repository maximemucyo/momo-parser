import { MomoTransaction, AdRevenueRecord, AppSettings } from '../types';
import { parseMomoMessage } from '../utils/momoParser';

export const INITIAL_MOMO_RAW_MESSAGES = [
  "TxId:28137396402*S*Your payment of 3,400 RWF to SIMBA SUPERMARKET LTD 6501832 was completed at 2026-05-25 21:11:50.  Balance: 2,217 RWF. Fee 0 RWF.*EN#",
  "*165*S*3000 RWF transferred to Isabelle YAKUJIJE (250787611214) at 2026-05-25 21:17:37 .Fee: 100RWF.Balance: 2117RWF.Dial *182*1*3# and send money abroad *EN#",
  "TxId:28137562288*S*Your payment of 1,200 RWF to Jean Louis 565549 was completed at 2026-05-25 21:21:53.  Balance: 917 RWF. Fee 0 RWF.*EN#",
  "*165*S*20000 RWF transferred to Anne Marie TWAGIRAYEZU (250789955598) at 2026-05-27 19:25:47 .Fee: 250RWF.Balance: 2609RWF.Dial *182*1*3# and send money abroad *EN#",
  "*165*S*3300 RWF transferred to Aboubakar MASHIMANGO (250787704374) at 2026-05-27 21:46:38 .Fee: 100RWF.Balance: 19209RWF.Dial *182*1*3# and send money abroad *EN#",
  "TxId:28178794963*S*Your payment of 10,000 RWF to SOCIETE PETROLIERE  LTD 322210 was completed at 2026-05-27 21:53:27.  Balance: 9,209 RWF. Fee 0 RWF.*EN#",
  "*164*S*Y'ello, A transaction of 1000 RWF by MTN RWANDACELL  LIMITED was completed at 2026-05-28 10:28:52. Balance:8209 RWF. Fee  0 RWF. FT Id: 28184232232. ET  Id: 17799569022355481.*EN#",
  "*165*S*100000 RWF transferred to Th odette MUKAMUHIZI (250787775523) at 2026-05-28 11:24:18 .Fee: 250RWF.Balance: 11154RWF.Dial *182*1*3# and send money abroad *EN#",
];

export const getInitialMomoTransactions = (): MomoTransaction[] => {
  const list: MomoTransaction[] = [];
  for (const msg of INITIAL_MOMO_RAW_MESSAGES) {
    const tx = parseMomoMessage(msg);
    if (tx) {
      list.push(tx);
    }
  }
  return list;
};

export const INITIAL_AD_REVENUES: AdRevenueRecord[] = [
  {
    date: "2026-05-25",
    monetag: 15.5,
    adsterra: 12.8,
    profiton: 9.4,
    serverCosts: 1.5,
    adCosts: 5.0,
    checkedAt: "2026-05-25T23:00:00Z"
  },
  {
    date: "2026-05-26",
    monetag: 18.2,
    adsterra: 14.5,
    profiton: 11.0,
    serverCosts: 1.5,
    adCosts: 6.0,
    checkedAt: "2026-05-26T23:00:00Z"
  },
  {
    date: "2026-05-27",
    monetag: 12.0,
    adsterra: 8.5,
    profiton: 5.2,
    serverCosts: 1.5,
    adCosts: 4.5,
    checkedAt: "2026-05-27T23:00:00Z"
  },
  {
    date: "2026-05-28",
    monetag: 22.4,
    adsterra: 19.1,
    profiton: 13.8,
    serverCosts: 1.5,
    adCosts: 8.0,
    checkedAt: "2026-05-28T13:35:00Z"
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  usdToRwfRate: 1465,
  dailySpendingLimit: 20000,
  customCategoryMappings: {
    "SIMBA": "Groceries & Shopping",
    "SOCIETE PETROLIERE": "Transport & Fuel",
    "RWANDACELL": "Utilities & Airtime",
    "Jean Louis": "Transfers (Sent)"
  }
};
