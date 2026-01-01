import { SAPEntry, ReconciliationItem, FinancialHealth, CovenantRules, HeadroomMetrics } from '../types';

// Helper to map LMA extracted text to Mock SAP Categories
const mapRuleToSAPCategory = (ruleName: string): string[] => {
  const lower = ruleName.toLowerCase();
  
  if (lower.includes('depreciation') || lower.includes('amortization') || lower.includes('impairment')) {
    return ['D&A'];
  }
  if (lower.includes('transaction') || lower.includes('legal') || lower.includes('professional') || lower.includes('acquisition')) {
    return ['Transaction'];
  }
  if (lower.includes('restructuring') || lower.includes('redundancy') || lower.includes('reorganization') || lower.includes('exceptional')) {
    return ['Restructuring'];
  }
  if (lower.includes('fx') || lower.includes('exchange')) {
    return ['FX'];
  }
  
  return [];
};

export const runReconciliation = (sapData: SAPEntry[], rules: CovenantRules): {
  reconciliation: ReconciliationItem[];
  health: FinancialHealth;
  headroom: HeadroomMetrics;
} => {
  const reconciliation: ReconciliationItem[] = [];
  const usedSapIds = new Set<string>();

  // --- SECTION 1: EBITDA CALCULATION ---
  
  // 1.1 Operating Profit (Starting Point)
  // We identify the Base P&L items regardless of rules to establish the "Top Line" of the calc
  const revenueEntries = sapData.filter(i => i.category === 'Revenue');
  const opexEntries = sapData.filter(i => i.category === 'OpEx');
  
  revenueEntries.forEach(i => usedSapIds.add(i.id));
  opexEntries.forEach(i => usedSapIds.add(i.id));

  const revenue = revenueEntries.reduce((acc, curr) => acc + curr.amount, 0);
  const opex = opexEntries.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  const operatingProfit = revenue - opex;
  
  const startPointLabel = rules.ebitdaRules?.startingPoint || "Operating Profit";

  reconciliation.push({
    lmaItem: `A. ${startPointLabel}`,
    sapSources: [...revenueEntries, ...opexEntries],
    rawAmount: operatingProfit,
    isAddBack: false,
    finalAmount: operatingProfit,
    supportingQuote: null,
    section: 'EBITDA'
  });

  let runningEBITDA = operatingProfit;
  let depreciationTotal = 0; // For health object later
  let restructuringTotal = 0;
  let transactionTotal = 0;
  let fxAdjustmentTotal = 0;

  // 1.2 Dynamic Add-Backs Processing based on Extracted Rules
  if (rules.ebitdaRules?.permittedAddBacks) {
    rules.ebitdaRules.permittedAddBacks.forEach(rule => {
      const targetCategories = mapRuleToSAPCategory(rule.item);
      
      // Find matching SAP entries that haven't been used yet
      const matchingEntries = sapData.filter(entry => 
        targetCategories.includes(entry.category) && !usedSapIds.has(entry.id)
      );

      if (matchingEntries.length > 0) {
        matchingEntries.forEach(e => usedSapIds.add(e.id));
        
        // Calculate raw amount (absolute value for add-backs)
        const rawAmount = matchingEntries.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
        let finalAmount = rawAmount;
        let adjustmentReason = rule.legalLogic;
        let cappedAmount: number | undefined = undefined;

        // --- Logic specific to item types for Health Object totals ---
        if (targetCategories.includes('D&A')) depreciationTotal += rawAmount;
        if (targetCategories.includes('Transaction')) transactionTotal += rawAmount;
        
        // --- Cap Logic ---
        // Check if rule has a cap (e.g., "20% of EBITDA")
        if (rule.cap && (rule.cap.includes('%') || rule.cap.toLowerCase().includes('cap'))) {
            // Simplified logic: Cap is usually based on "EBITDA before this deduction" or "Opening EBITDA + D&A"
            // For this demo, we use (Operating Profit + D&A) as the base for the % cap
            const capBase = operatingProfit + depreciationTotal; 
            
            // Extract number from string like "20%" or "15%"
            const percentMatch = rule.cap.match(/(\d+)%/);
            const capPercent = percentMatch ? parseInt(percentMatch[1]) : 20; // default to 20 if parse fails but cap exists
            
            const maxAllowed = capBase * (capPercent / 100);
            
            if (rawAmount > maxAllowed) {
                finalAmount = maxAllowed;
                cappedAmount = maxAllowed;
                adjustmentReason = `Capped at ${capPercent}% of Base`;
            } else {
                adjustmentReason = "Permitted (Within Cap)";
            }
            
            restructuringTotal += finalAmount;
        } else if (targetCategories.includes('Restructuring')) {
            restructuringTotal += finalAmount;
        }

        reconciliation.push({
            lmaItem: `(+) ${rule.item}`,
            sapSources: matchingEntries,
            rawAmount: rawAmount,
            isAddBack: true,
            cappedAmount: cappedAmount,
            finalAmount: finalAmount,
            adjustmentReason: adjustmentReason,
            supportingQuote: rule.sapMappingHint ? `${rule.legalLogic} (Hint: ${rule.sapMappingHint})` : rule.legalLogic,
            section: 'EBITDA'
        });

        runningEBITDA += finalAmount;
      }
    });
  }

  // 1.3 Exclusions (Specifically FX Logic)
  // Check if extracted exclusions list mentions FX
  const hasFXExclusion = rules.ebitdaRules?.exclusions?.some(ex => 
    ex.toLowerCase().includes('fx') || ex.toLowerCase().includes('exchange')
  );

  if (hasFXExclusion) {
      const fxEntries = sapData.filter(i => i.category === 'FX' && !usedSapIds.has(i.id));
      if (fxEntries.length > 0) {
          fxEntries.forEach(e => usedSapIds.add(e.id));
          const netFX = fxEntries.reduce((acc, curr) => acc + curr.amount, 0);
          
          // Logic: If Net FX is Gain (Positive), we deduct it. If Loss (Negative), we usually add back (if allowed) or ignore.
          // LMA usually says "Exclude Unrealized Gains".
          
          if (netFX > 0) {
             fxAdjustmentTotal = netFX;
             reconciliation.push({
                lmaItem: "(-) Unrealized FX Gain",
                sapSources: fxEntries,
                rawAmount: netFX,
                isAddBack: false,
                isDeduction: true,
                finalAmount: -netFX,
                adjustmentReason: "Excluded Gain",
                section: 'EBITDA'
             });
             runningEBITDA -= netFX;
          }
      }
  }

  const adjustedEBITDA = runningEBITDA;


  // --- SECTION 2: NET FINANCE CHARGES ---
  
  const interestExpEntries = sapData.filter(i => i.category === 'Interest Expense');
  const interestExpense = interestExpEntries.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  reconciliation.push({
    lmaItem: "B. Finance Costs",
    sapSources: interestExpEntries,
    rawAmount: interestExpense,
    isAddBack: false,
    finalAmount: interestExpense,
    section: 'FINANCE_CHARGES'
  });

  const interestIncEntries = sapData.filter(i => i.category === 'Interest Income');
  const interestIncome = interestIncEntries.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);

  reconciliation.push({
    lmaItem: "(-) Finance Income",
    sapSources: interestIncEntries,
    rawAmount: interestIncome,
    isAddBack: false,
    isDeduction: true,
    finalAmount: -interestIncome,
    section: 'FINANCE_CHARGES'
  });

  const netFinanceCharges = interestExpense - interestIncome;


  // --- SECTION 3: NET DEBT ---

  const grossDebtEntries = sapData.filter(i => i.category === 'Gross Debt');
  const leaseEntries = sapData.filter(i => i.category === 'Leases');
  const debtTotal = grossDebtEntries.reduce((acc, curr) => acc + curr.amount, 0) + leaseEntries.reduce((acc, curr) => acc + curr.amount, 0);

  reconciliation.push({
    lmaItem: "A. Gross Borrowings",
    sapSources: [...grossDebtEntries, ...leaseEntries],
    rawAmount: debtTotal,
    isAddBack: false,
    finalAmount: debtTotal,
    section: 'NET_DEBT'
  });

  const cashEntries = sapData.filter(i => i.category === 'Cash');
  const cashTotal = cashEntries.reduce((acc, curr) => acc + curr.amount, 0);

  reconciliation.push({
    lmaItem: "(-) Cash & Cash Equivalents",
    sapSources: cashEntries,
    rawAmount: cashTotal,
    isAddBack: false,
    isDeduction: true,
    finalAmount: -cashTotal,
    section: 'NET_DEBT'
  });

  const netDebt = debtTotal - cashTotal;


  // --- CALCULATE RATIOS & SPRINGING TRIGGER ---

  const levRule = rules.financialCovenants?.find(c => c.name && c.name.toLowerCase().includes('leverage'));
  const intRule = rules.financialCovenants?.find(c => c.name && c.name.toLowerCase().includes('interest'));

  const leverageRatio = adjustedEBITDA !== 0 ? netDebt / adjustedEBITDA : 0;
  const interestCoverageRatio = netFinanceCharges !== 0 ? adjustedEBITDA / netFinanceCharges : 0;
  
  const levMax = levRule?.maxLimit || 4.0;
  const intMin = intRule?.minLimit || 0;

  // Springing Trigger Calculation
  let testConditionActive = true;
  let triggerDetails = undefined;

  if (rules.covenantTrigger && rules.covenantTrigger.isSpringing) {
      // Logic: Check RCF Utilization
      // Use extracted total RCF amount, or default to 0 if not found/applicable
      const totalRcfCapacity = rules.covenantTrigger.totalRcfAmount || 0;
      
      const rcfEntry = grossDebtEntries.find(i => i.accountName.toLowerCase().includes('rcf') || i.accountName.toLowerCase().includes('revolving'));
      const rcfDrawdown = rcfEntry ? rcfEntry.amount : 0;
      
      const utilization = totalRcfCapacity > 0 ? rcfDrawdown / totalRcfCapacity : 0;
      const threshold = rules.covenantTrigger.thresholdPercentage || 0.40; // Default 40%

      testConditionActive = utilization > threshold;
      
      triggerDetails = {
          metricName: rules.covenantTrigger.triggerMetric || "RCF Drawings / Total RCF Commitments",
          currentValue: utilization,
          threshold: threshold,
          capacity: totalRcfCapacity
      };
  }

  // Determine Status
  let status: 'Healthy' | 'Warning' | 'Breach' | 'Skipped' = 'Healthy';

  if (!testConditionActive) {
      status = 'Skipped';
  } else {
      // Leverage Check (Max)
      if (leverageRatio > levMax) status = 'Breach';
      else if (leverageRatio > (levMax * 0.9)) status = 'Warning';

      // Interest Check (Min)
      // Only check if not already breached by leverage
      if (status !== 'Breach') {
          if (interestCoverageRatio < intMin) status = 'Breach';
          else if (interestCoverageRatio < (intMin * 1.1) && status !== 'Warning') status = 'Warning';
      }
  }

  return { 
    reconciliation, 
    health: {
      adjustedEBITDA,
      netDebt,
      netFinanceCharges,
      grossDebt: debtTotal,
      cashAtBank: cashTotal,
      operatingProfit,
      depreciation: depreciationTotal,
      amortization: 0,
      restructuringCosts: restructuringTotal,
      transactionCosts: transactionTotal,
      unrealizedFX: fxAdjustmentTotal,
      interestExpense
    }, 
    headroom: {
      leverageRatio,
      leverageThreshold: levMax,
      interestCoverageRatio,
      interestThreshold: intMin,
      status,
      leverageHeadroom: levMax - leverageRatio,
      interestHeadroom: interestCoverageRatio - intMin,
      testConditionActive,
      triggerDetails
    } 
  };
};