import { SAPEntry, SAPSourceType } from './types';

export const APP_NAME = "LMA Syndicate Bridge";

// Simulated "Sample" LMA Agreement Text for the demo if user doesn't have a file
export const SAMPLE_LMA_TEXT = `
FACILITY AGREEMENT - COMPLIANCE CERTIFICATE REQUIREMENTS
DATED: 20 December 2024
BORROWER: NOMAD FOODS LIMITED

SECTION 1: DEFINITIONS

"Consolidated EBITDA" means, for any Relevant Period, the operating profit of the Group:
(a) excluding Depreciation and Amortization (including impairments);
(b) excluding any Transaction Costs associated with the 2025 Amendment;
(c) excluding any Restructuring Costs (capped at 15% of EBITDA);
(d) excluding unrealized foreign exchange gains or losses.

"Net Finance Charges" means Finance Costs minus Finance Income.
"Finance Costs" means interest, commission, fees, discounts and other finance payments.
"Finance Income" means interest and other finance income received.

"Net Debt" means the aggregate amount of all obligations of the Group for or in respect of Borrowings, LESS Cash and Cash Equivalents.
"Borrowings" includes:
(a) moneys borrowed (Loans, Notes, Bonds);
(b) Finance Leases (capitalized per IFRS 16);
(c) any amount raised under any other transaction having the commercial effect of a borrowing.

SECTION 18: FINANCIAL COVENANTS
18.1 Leverage Ratio
The Company must ensure that Leverage (Consolidated Total Net Debt to Consolidated EBITDA) does not exceed 5.00:1.00.
18.2 Interest Cover
The Company must ensure that Interest Cover (Consolidated EBITDA to Net Finance Charges) is not less than 3.00:1.00.
18.3 Springing Test
If the RCF Utilization exceeds 40%, the Financial Covenants shall be tested.
`;

// Mock SAP Data matching the full compliance use case for Nomad Foods Limited
export const MOCK_SAP_DATA: SAPEntry[] = [
  // --- P&L: REVENUE & OPEX (EBITDA BASE) ---
  { id: '101', accountCode: '400000', accountName: 'Total Revenue', sourceType: SAPSourceType.GL, amount: 1250000000, category: 'Revenue' },
  { id: '102', accountCode: '510000', accountName: 'Cost of Goods Sold', sourceType: SAPSourceType.GL, amount: -750000000, category: 'OpEx' },
  { id: '103', accountCode: '520000', accountName: 'Operating Expenses (G&A)', sourceType: SAPSourceType.GL, amount: -200000000, category: 'OpEx' },

  // --- P&L: ADJUSTMENTS (D&A, ONE-OFFS) ---
  { id: '201', accountCode: 'ASSET_DEP_01', accountName: 'Tangible Depreciation', sourceType: SAPSourceType.ASSET_SUBLEDGER, amount: -55000000, category: 'D&A' },
  { id: '202', accountCode: '600500', accountName: 'Intangible Amortization', sourceType: SAPSourceType.GL, amount: -12000000, category: 'D&A' },
  { id: '203', accountCode: '600550', accountName: 'Impairment Charges', sourceType: SAPSourceType.GL, amount: -3000000, category: 'D&A' },
  
  // Restructuring (Cost Center Splits)
  { id: '301', accountCode: 'CC_RESTRUCT_01', accountName: 'Restructuring - Redundancy UK', sourceType: SAPSourceType.COST_CENTER, amount: -8500000, category: 'Restructuring' }, 
  { id: '302', accountCode: 'CC_RESTRUCT_02', accountName: 'Office Closure - Italy', sourceType: SAPSourceType.COST_CENTER, amount: -2000000, category: 'Restructuring' },
  
  // Transaction Costs
  { id: '401', accountCode: 'IO_2025_AMEND', accountName: 'LMA Amendment 2025 Legal Fees', sourceType: SAPSourceType.INTERNAL_ORDER, amount: -1500000, category: 'Transaction' },
  
  // FX
  { id: '501', accountCode: '700100', accountName: 'Unrealized FX Gain', sourceType: SAPSourceType.TREASURY, amount: 4200000, category: 'FX' },

  // --- P&L: INTEREST (FOR INTEREST COVER) ---
  //{ id: '601', accountCode: '530000', accountName: 'Consolidated Interest Expense', sourceType: SAPSourceType.GL, amount: -45000000, category: 'Interest Expense' },
  // Assuming minimal interest income for this dataset as none explicitly listed in 'trial_balance' of prompt, but standard to have some.
  //{ id: '602', accountCode: '530900', accountName: 'Interest Income', sourceType: SAPSourceType.GL, amount: 1500000, category: 'Interest Income' },

  // --- BALANCE SHEET: DEBT (FOR LEVERAGE) ---
  { id: '701', accountCode: '210000', accountName: 'Senior Secured Notes 2028 (Tranche 1)', sourceType: SAPSourceType.TREASURY, amount: 750000000, category: 'Gross Debt' },
  { id: '702', accountCode: '210100', accountName: 'Senior Secured Notes 2028 (Tranche 2)', sourceType: SAPSourceType.TREASURY, amount: 50000000, category: 'Gross Debt' },
  { id: '703', accountCode: '210500', accountName: 'Facility B1 Drawing', sourceType: SAPSourceType.TREASURY, amount: 880000000, category: 'Gross Debt' },
  { id: '704', accountCode: '230000', accountName: 'Revolving Credit Facility (RCF) - Drawn', sourceType: SAPSourceType.TREASURY, amount: 95000000, category: 'Gross Debt' },
  
  // --- BALANCE SHEET: LEASES (IFRS 16) ---
  { id: '801', accountCode: '220000', accountName: 'IFRS 16 Lease Liabilities', sourceType: SAPSourceType.GL, amount: 15000000, category: 'Leases' },

  // --- BALANCE SHEET: CASH ---
  { id: '901', accountCode: '110000', accountName: 'Cash and Cash Equivalents', sourceType: SAPSourceType.TREASURY, amount: 120000000, category: 'Cash' },
];

export const MOCK_NET_DEBT = 0;