export enum LMASection {
  DEFINITIONS = 'Section 1: Definitions',
  COVENANTS = 'Section 18: Financial Covenants'
}

export enum SAPSourceType {
  GL = 'General Ledger',
  ASSET_SUBLEDGER = 'Asset Subledger',
  COST_CENTER = 'Cost Center',
  INTERNAL_ORDER = 'Internal Order',
  PNL = 'P&L',
  TREASURY = 'Treasury System',
  AP = 'Accounts Payable',
  AR = 'Accounts Receivable'
}

// Mock SAP Data Structure
export interface SAPEntry {
  id: string;
  accountCode: string;
  accountName: string;
  sourceType: SAPSourceType;
  amount: number; 
  category: 'Revenue' | 'OpEx' | 'D&A' | 'Restructuring' | 'Transaction' | 'FX' | 'Interest Expense' | 'Interest Income' | 'Gross Debt' | 'Cash' | 'Leases';
}

export type CertificateStatus = 'draft' | 'submitted';

// The Bridge Row
export interface ReconciliationItem {
  lmaItem: string; // e.g., "Operating Profit"
  sapSources: SAPEntry[];
  rawAmount: number;
  adjustmentReason?: string;
  isAddBack: boolean; // green/red styling logic
  isDeduction?: boolean; // explicit deduction logic
  cappedAmount?: number; // If cap applies
  finalAmount: number;
  supportingQuote?: string | null;
  section?: 'EBITDA' | 'NET_DEBT' | 'FINANCE_CHARGES';
}

export interface FinancialHealth {
  adjustedEBITDA: number;
  netDebt: number;
  netFinanceCharges: number;
  cashAtBank: number;
  grossDebt: number;
  operatingProfit: number;
  depreciation: number;
  amortization: number;
  restructuringCosts: number;
  transactionCosts: number;
  unrealizedFX: number;
  interestExpense: number;
}

export interface HeadroomMetrics {
  leverageRatio: number; // Net Debt / EBITDA
  leverageThreshold: number;
  interestCoverageRatio: number; // EBITDA / Net Finance Charges
  interestThreshold: number;
  status: 'Healthy' | 'Warning' | 'Breach' | 'Skipped';
  leverageHeadroom: number;
  interestHeadroom: number;
  
  // Springing Covenant Logic
  testConditionActive: boolean;
  triggerDetails?: {
    metricName: string;
    currentValue: number;
    threshold: number;
    capacity: number; // e.g. Total Commitment
  };
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  actionType: 'Reduction' | 'Optimization' | 'Strategic';
  potentialSavings?: string;
  // Tracking Metadata
  conditionMetric?: 'Leverage Ratio' | 'Interest Cover' | 'EBITDA' | 'Net Debt';
  conditionOperator?: '<' | '>' | '<=' | '>=';
  conditionThreshold?: number;
}

// --- NEW STRUCTURES MATCHING GEMINI SCHEMA ---

export interface EBITDAAddBack {
  item: string;
  legalLogic: string;
  sapMappingHint?: string;
  cap?: string | null;
}

export interface FinancialCovenantRule {
  name: string;
  metric: string;
  maxLimit?: number | null;
  minLimit?: number | null;
  operator: string;
  sourceQuote?: string; // Evidence text from document
}

export interface Facility {
  name: string; // e.g. "Term Facility A"
  amount: number;
  currency: string;
}

export interface CovenantRules {
  dealMetadata: {
    borrower?: string;
    facilityAgent?: string;
    agreementDate?: string;
    baseCurrency: string;
  };
  facilities?: Facility[];
  covenantTrigger?: {
    isSpringing: boolean;
    triggerMetric?: string;
    thresholdPercentage?: number;
    totalRcfAmount?: number;
    sourceQuote?: string; // Evidence text from document
  };
  financialCovenants: FinancialCovenantRule[];
  ebitdaRules: {
    startingPoint: string;
    permittedAddBacks: EBITDAAddBack[];
    exclusions?: string[];
  };
  sustainabilityKpis?: {
    stepDownMarginMax?: number;
    kpiTargets?: Array<{
      id: string;
      description?: string;
      targetValue?: number;
      unit?: string;
    }>;
  };
  recommendations?: Recommendation[];
}

export interface ComplianceCertificateData {
  header: {
    to: string;
    from: string;
    date: string;
    agreement_title: string;
  };
  period: string;
  covenants: Array<{
    name: string;
    formula: string;
    actual_value: string;
    required_value: string;
    compliant: boolean;
  }>;
  ebitda_reconciliation: Array<{
    item: string;
    amount: string;
    is_add_back: boolean;
  }>;
  ebitda_total: string;
  net_debt_reconciliation: Array<{
    item: string;
    amount: string;
  }>;
  net_debt_total: string;
  sustainability?: Array<{
    kpi: string;
    target: string;
    actual?: string;
    status: string;
  }>;
  confirmation_text: string;
}