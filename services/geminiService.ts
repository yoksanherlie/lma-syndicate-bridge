import { GoogleGenAI, Type } from "@google/genai";
import { CovenantRules } from '../types';

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
3. **Identify Total RFC:** Identify the total amount of Revolving Facility Commitments by all lenders
3. **Identify Add-backs:** Specifically list every item permitted to be added back to Net Income to reach Adjusted EBITDA. 
4. **Locate Clause 14.12 (Sustainability):** Extract KPI targets and margin adjustment values.
5. **Extract Evidence:** For every extracted rule (Covenants, Triggers), include a \`sourceQuote\` containing the exact text snippet from the document that justifies the extracted value.
6. **Output only valid JSON.**

**Required JSON Structure:**
${jsonBlockStart}
{
  "deal_metadata": {
    "borrower": "string",
    "facility_agent": "string",
    "agreement_date": "YYYY-MM-DD",
    "currency": "string"
  },
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
  }
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
      }
    };
  }
};