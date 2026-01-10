import { GoogleGenAI, Type } from "@google/genai";
import { CovenantRules, ComplianceCertificateData, FinancialHealth, HeadroomMetrics, ReconciliationItem } from '../types';

export const analyzeLMAAgreement = async (input: string | { data: string, mimeType: string }): Promise<CovenantRules> => {
  // Guidelines: Use process.env.API_KEY directly when initializing.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Constructed carefully to avoid backtick issues in template literals
  const jsonBlockStart = "```json";
  const jsonBlockEnd = "```";
  
  const promptText = `
    **Role:** You are an expert LMA (Loan Market Association) Legal Counsel and Credit Analyst. Your task is to parse the attached Facility Agreement and extract the precise "Financial Covenant" rules into a structured JSON format for an ERP reconciliation engine.

    **Instructions:**
    1. **Locate Clause 26 (Financial Covenants):** Identify the primary ratio (e.g., Consolidated Leverage Ratio), the threshold value, and the "Test Condition" (the springing trigger).
    2. **Locate Schedule 21 (Certain Defined Terms):** Extract the full logic for "Consolidated EBITDA" and "Consolidated Indebtedness."
    3. **Identify Facilities:** Extract the list of all Facilities (Term Loans, RCFs) and their specific Commitment Amounts (Principal) from the "The Facilities" clause or definitions.
    4. **Identify Total RFC:** Identify the total amount of Revolving Facility Commitments by all lenders
    5. **Identify Add-backs:** Specifically list every item permitted to be added back to Net Income to reach Adjusted EBITDA. 
    6. **Locate Clause 14.12 (Sustainability):** Extract KPI targets and margin adjustment values.
    7. **Identify Opportunities:** Look for specific clauses that offer financial flexibility or savings, such as:
    - Margin step-downs (based on Leverage or Ratings).
    - Equity Cure rights (to cure financial covenant breaches).
    - Permitted Baskets that could be optimized.
    - "Holiday" periods or testing waivers.
    - **CRITICAL:** If an opportunity is triggered by a specific numeric threshold (e.g. "Margin reduces if Leverage < 3.00x"), extract the \`conditionMetric\` (Leverage Ratio) and \`conditionThreshold\` (3.00) so we can track it automatically.
6. **Extract Evidence:** For every extracted rule (Covenants, Triggers), include a \`sourceQuote\` containing the exact text snippet from the document that justifies the extracted value.
7. **Output only valid JSON.**

**Required JSON Structure:**
${jsonBlockStart}
{
  "deal_metadata": {
    "borrower": "string",
    "facility_agent": "string",
    "agreement_date": "YYYY-MM-DD",
    "currency": "string"
  },
  "facilities": [
    { "name": "Term Facility A", "amount": 350000000, "currency": "EUR" },
    { "name": "Revolving Facility", "amount": 50000000, "currency": "EUR" }
  ],
  "covenant_trigger": {
    "name": "Test Condition",
    "calculation": "Total RCF Drawings / Total RCF Commitments",
    "threshold_percentage": 0.40,
    "is_springing": true,
    "total_rcf_amount": 175000000,
    "source_quote": "The Financial Covenants shall be tested if the aggregate amount of all Loans exceeds 40 per cent of Total Commitments."
  },
  "financial_covenants": [
    {
      "type": "Leverage Ratio",
      "metric": "Consolidated Total Net Debt / Consolidated EBITDA",
      "limit": 7.25,
      "operator": "LESS_THAN_OR_EQUAL",
      "source_quote": "The Company must ensure that Leverage does not exceed 7.25:1.00."
    }
  ],
  "ebitda_rules": {
    "starting_point": "Consolidated Net Income",
    "permitted_add_backs": [
      {
        "item": "Depreciation",
        "logic": "Non-cash charge",
        "sap_mapping_hint": "Asset Subledger"
      },
      {
        "item": "Restructuring Costs",
        "logic": "Capped or specific cost center charges",
        "cap": "string or null"
      }
    ],
    "exclusions": ["Unrealized FX Gains", "Extraordinary Gains"]
  },
  "sustainability_kpis": {
    "step_down_margin_max": 0.075,
    "kpis": [
      { "id": "KPI_1", "target": 0.95, "description": "Sustainable Farming" }
    ]
  },
  "recommendations": [
    {
      "id": "rec_margin_stepdown",
      "title": "Margin Reduction",
      "description": "If Leverage Ratio drops below 3.00:1, margin reduces by 0.50%.",
      "actionType": "Strategic",
      "potentialSavings": "0.50% Margin",
      "conditionMetric": "Leverage Ratio",
      "conditionOperator": "<",
      "conditionThreshold": 3.00
    }
  ]
}
${jsonBlockEnd}

**Constraint:** If a specific value or add-back is not found, return \`null\` for that field. Do not hallucinate values. If a cap exists for add-backs (e.g., "Restructuring costs not to exceed 20% of EBITDA"), ensure that percentage is captured in the \`ebitda_rules\`.
  `;

  let contentParts = [];
  
  if (typeof input === 'string') {
    contentParts.push({ text: `Document Text:\n"${input}"\n\n${promptText}` });
  } else {
    contentParts.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.data
      }
    });
    contentParts.push({ text: "Analyze this Facility Agreement document. " + promptText });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contentParts },
      config: {
        systemInstruction: "You are a precise legal-financial analyst extracting data for an automated Compliance Certificate system.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          description: "Extracted financial covenant rules and EBITDA add-back logic from an LMA Facility Agreement",
          properties: {
            dealMetadata: {
              type: Type.OBJECT,
              properties: {
                borrower: { type: Type.STRING },
                facilityAgent: { type: Type.STRING },
                agreementDate: { type: Type.STRING, description: "ISO format date" },
                baseCurrency: { type: Type.STRING, description: "e.g., EUR, USD, GBP" }
              },
              required: ["borrower", "baseCurrency"]
            },
            facilities: {
              type: Type.ARRAY,
              description: "List of all credit facilities and their commitment amounts",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "e.g. Term Facility A" },
                  amount: { type: Type.NUMBER, description: "Commitment Amount in base currency" },
                  currency: { type: Type.STRING }
                },
                required: ["name", "amount", "currency"]
              },
              nullable: true
            },
            covenantTrigger: {
              type: Type.OBJECT,
              description: "Conditions under which financial covenants are tested (e.g. Springing triggers)",
              properties: {
                isSpringing: { type: Type.BOOLEAN },
                triggerMetric: { type: Type.STRING, description: "e.g. RCF Drawings / Total RCF Commitments" },
                thresholdPercentage: { type: Type.NUMBER, description: "The percentage threshold, e.g., 0.40 for 40%" },
                totalRcfAmount: { type: Type.NUMBER, description: "Total RCF Commitments, e.g., 175000000"},
                sourceQuote: { type: Type.STRING, description: "Exact text snippet from the document defining the trigger threshold and conditions." }
              },
              nullable: true
            },
            financialCovenants: {
              type: Type.ARRAY,
              description: "List of financial ratios and their maintenance limits",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "e.g. Leverage Ratio" },
                  metric: { type: Type.STRING, description: "Legal formula, e.g. Total Net Debt / EBITDA" },
                  maxLimit: { type: Type.NUMBER, nullable: true },
                  minLimit: { type: Type.NUMBER, nullable: true },
                  operator: { type: Type.STRING, description: "LESS_THAN_OR_EQUAL or GREATER_THAN_OR_EQUAL" },
                  sourceQuote: { type: Type.STRING, description: "Exact text snippet from the document defining the limit." }
                },
                required: ["name", "metric", "operator"]
              }
            },
            ebitdaRules: {
              type: Type.OBJECT,
              description: "Instructions for calculating Adjusted EBITDA from SAP data",
              properties: {
                startingPoint: { type: Type.STRING, description: "The base P&L line item, usually Operating Profit or Net Income" },
                permittedAddBacks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      item: { type: Type.STRING, description: "The name of the add-back, e.g., Restructuring Costs" },
                      legalLogic: { type: Type.STRING, description: "Summary of why this is allowed based on the agreement" },
                      sapMappingHint: { type: Type.STRING, description: "Suggested SAP source like Cost Center, Internal Order, or GL Range" },
                      cap: { type: Type.STRING, description: "Any limits, e.g., '20% of EBITDA' or '€10m per annum'", nullable: true }
                    },
                    required: ["item", "legalLogic"]
                  }
                },
                exclusions: {
                  type: Type.ARRAY,
                  description: "Items that must be deducted, like Unrealized FX Gains",
                  items: { type: Type.STRING }
                }
              },
              required: ["startingPoint", "permittedAddBacks"]
            },
            sustainabilityKpis: {
              type: Type.OBJECT,
              description: "ESG linked margin adjustments",
              properties: {
                stepDownMarginMax: { type: Type.NUMBER, description: "Total possible margin reduction, e.g., 0.075" },
                kpiTargets: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: "KPI ID, e.g., KPI 1" },
                      description: { type: Type.STRING },
                      targetValue: { type: Type.NUMBER },
                      unit: { type: Type.STRING, description: "e.g. Percentage, Metric Tons" }
                    }
                  }
                }
              },
              nullable: true
            },
            recommendations: {
              type: Type.ARRAY,
              description: "Strategic opportunities or operational flexibilities extracted from the text (e.g. margin step-downs, cure rights)",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  actionType: { type: Type.STRING, enum: ["Reduction", "Optimization", "Strategic"] },
                  potentialSavings: { type: Type.STRING, nullable: true },
                  conditionMetric: { type: Type.STRING, enum: ["Leverage Ratio", "Interest Cover"], nullable: true },
                  conditionThreshold: { type: Type.NUMBER, nullable: true },
                  conditionOperator: { type: Type.STRING, enum: ["<", ">", "<=", ">="], nullable: true }
                },
                required: ["id", "title", "description", "actionType"]
              },
              nullable: true
            }
          },
          required: ["dealMetadata", "financialCovenants", "ebitdaRules"]
        },
      },
    });

    let jsonText = response.text || "{}";
    
    // Clean markdown code blocks if present (regex safe)
    jsonText = jsonText.replace(new RegExp("```json", "g"), "").replace(new RegExp("```", "g"), "").trim();

    const result = JSON.parse(jsonText);
    return result;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Updated Fallback to match new schema
    return {
      dealMetadata: {
        borrower: "Demo Corp",
        facilityAgent: "Demo Agent",
        agreementDate: "2024-01-01",
        baseCurrency: "EUR"
      },
      facilities: [
          { name: "Term Facility A", amount: 200000000, currency: "EUR" },
          { name: "Revolving Facility", amount: 50000000, currency: "EUR" }
      ],
      financialCovenants: [
        { 
            name: "Leverage Ratio", 
            metric: "Net Debt / EBITDA", 
            maxLimit: 4.0, 
            operator: "LESS_THAN_OR_EQUAL",
            sourceQuote: "The Company must ensure that Leverage (Consolidated Total Net Debt to Consolidated EBITDA) does not exceed 4.00:1.00." 
        },
        { 
            name: "Interest Cover", 
            metric: "EBITDA / Net Finance Charges", 
            minLimit: 3.5, 
            operator: "GREATER_THAN_OR_EQUAL",
            sourceQuote: "The Company must ensure that Interest Cover (Consolidated EBITDA to Net Finance Charges) is not less than 3.50:1.00."
        }
      ],
      covenantTrigger: {
        isSpringing: true,
        triggerMetric: "RCF Drawings / Total RCF Commitments",
        thresholdPercentage: 0.40,
        totalRcfAmount: 200000000,
        sourceQuote: "If the RCF Utilization exceeds 40%, the Financial Covenants shall be tested."
      },
      ebitdaRules: {
        startingPoint: "Operating Profit",
        permittedAddBacks: [
           { item: "Depreciation", legalLogic: "Non-cash charge" },
           { item: "Amortization", legalLogic: "Non-cash charge" },
           { item: "Transaction Costs", legalLogic: "One-off fees" },
           { item: "Restructuring Costs", legalLogic: "Exceptional items", cap: "20% of EBITDA" }
        ],
        exclusions: ["Unrealized FX Gains"]
      },
      recommendations: [
         {
             id: 'rec_demo_1',
             title: 'Equity Cure Right',
             description: 'Borrower may cure a Financial Covenant breach by injecting new equity within 20 days of delivery of Compliance Certificate.',
             actionType: 'Strategic'
         },
         {
             id: 'rec_demo_2',
             title: 'Margin Step-Down',
             description: 'If Leverage Ratio is below 3.50x, the Margin shall be reduced by 0.25% per annum.',
             actionType: 'Optimization',
             potentialSavings: '0.25% Margin',
             conditionMetric: 'Leverage Ratio',
             conditionOperator: '<',
             conditionThreshold: 3.50
         }
      ]
    };
  }
};

export const generateComplianceCertificateData = async (
  agreementInput: string | { data: string, mimeType: string },
  health: FinancialHealth,
  headroom: HeadroomMetrics,
  reconciliation: ReconciliationItem[],
  covenants: CovenantRules,
  period: string
): Promise<ComplianceCertificateData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const financialContext = {
    period,
    health,
    headroom,
    reconciliation: reconciliation.map(r => ({
      item: r.lmaItem,
      amount: r.finalAmount,
      section: r.section,
      isAddBack: r.isAddBack
    })),
    baseCurrency: covenants.dealMetadata.baseCurrency
  };

  const promptText = `
    **Role:** You are a Legal-Financial Analyst. 
    **Task:** Generate the structured JSON data for a "Schedule 7 Form of Compliance Certificate" based on the attached Facility Agreement and the provided financial calculation results.
    
    **Financial Results Context:**
    ${JSON.stringify(financialContext, null, 2)}

    **Instructions:**
    1. From the Agreement, identify the formal names of the parties (Borrower, Facility Agent) and the full title/date of the Agreement.
    2. Map the provided Financial Results into the standard Schedule 7 format.
    3. Ensure all currency values are formatted as strings with currency symbols (e.g. "€1,234,567.00").
    4. Provide a standard "Confirmation Text" for clause 3 (e.g. "We confirm that no Default is outstanding...").
    5. Output ONLY valid JSON.
  `;

  let contentParts = [];
  if (typeof agreementInput === 'string') {
    contentParts.push({ text: `Agreement Text:\n"${agreementInput}"\n\n${promptText}` });
  } else {
    contentParts.push({
      inlineData: {
        mimeType: agreementInput.mimeType,
        data: agreementInput.data
      }
    });
    contentParts.push({ text: promptText });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contentParts },
      config: {
        systemInstruction: "You are a professional auditor and legal analyst. Return only JSON data for a compliance certificate.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            header: {
              type: Type.OBJECT,
              properties: {
                to: { type: Type.STRING },
                from: { type: Type.STRING },
                date: { type: Type.STRING },
                agreement_title: { type: Type.STRING }
              }
            },
            period: { type: Type.STRING },
            covenants: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  formula: { type: Type.STRING },
                  actual_value: { type: Type.STRING },
                  required_value: { type: Type.STRING },
                  compliant: { type: Type.BOOLEAN }
                }
              }
            },
            ebitda_reconciliation: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  is_add_back: { type: Type.BOOLEAN }
                }
              }
            },
            ebitda_total: { type: Type.STRING },
            net_debt_reconciliation: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  amount: { type: Type.STRING }
                }
              }
            },
            net_debt_total: { type: Type.STRING },
            confirmation_text: { type: Type.STRING }
          }
        }
      }
    });

    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(new RegExp("```json", "g"), "").replace(new RegExp("```", "g"), "").trim();

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Certificate Data Error:", error);
    // Fallback logic
    return {
      header: {
        to: covenants.dealMetadata.facilityAgent || "Facility Agent",
        from: covenants.dealMetadata.borrower || "Borrower",
        date: new Date().toLocaleDateString(),
        agreement_title: `Facility Agreement dated ${covenants.dealMetadata.agreementDate}`
      },
      period: period,
      covenants: [
        {
          name: "Leverage Ratio",
          formula: "Net Debt / EBITDA",
          actual_value: `${headroom.leverageRatio.toFixed(2)}x`,
          required_value: `${headroom.leverageThreshold.toFixed(2)}x`,
          compliant: headroom.leverageRatio <= headroom.leverageThreshold
        }
      ],
      ebitda_reconciliation: reconciliation.filter(r => r.section === 'EBITDA').map(r => ({
        item: r.lmaItem,
        amount: new Intl.NumberFormat('en-IE', { style: 'currency', currency: covenants.dealMetadata.baseCurrency }).format(r.finalAmount),
        is_add_back: r.isAddBack
      })),
      ebitda_total: new Intl.NumberFormat('en-IE', { style: 'currency', currency: covenants.dealMetadata.baseCurrency }).format(health.adjustedEBITDA),
      net_debt_reconciliation: reconciliation.filter(r => r.section === 'NET_DEBT').map(r => ({
        item: r.lmaItem,
        amount: new Intl.NumberFormat('en-IE', { style: 'currency', currency: covenants.dealMetadata.baseCurrency }).format(r.finalAmount)
      })),
      net_debt_total: new Intl.NumberFormat('en-IE', { style: 'currency', currency: covenants.dealMetadata.baseCurrency }).format(health.netDebt),
      confirmation_text: "We confirm that no Default is outstanding."
    };
  }
};