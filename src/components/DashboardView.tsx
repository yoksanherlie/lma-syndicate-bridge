import React, { useState } from 'react';
import { FileText, Database, CheckCircle2, FileCheck, RefreshCw, Quote, Copy, Check, PauseCircle, Leaf, TrendingDown, Send, Pencil, Lightbulb, Trophy, CircleX } from 'lucide-react';
import { CovenantRules, ReconciliationItem, FinancialHealth, HeadroomMetrics, CertificateStatus, Recommendation } from '../types';
import HeadroomChart from './HeadroomChart';
import ReconciliationTable from './ReconciliationTable';

interface DashboardViewProps {
    covenants: CovenantRules;
    headroom: HeadroomMetrics;
    health: FinancialHealth;
    reconciliation: ReconciliationItem[];
    userRole: string;
    status?: CertificateStatus;
    lastGeneratedCertUrl?: string | null;
    onSave?: () => void;
    onPrepareCertificate?: () => void;
    isSaving?: boolean;
    isPreparing?: boolean;
    readOnly?: boolean;
    documentUrl?: string | null;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
    covenants, headroom, health, reconciliation, userRole, status, lastGeneratedCertUrl, onSave, onPrepareCertificate, isSaving, isPreparing, readOnly, documentUrl
}) => {
    
    const [copySuccess, setCopySuccess] = useState(false);
    const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
    
    // Helper to get clean JSON
    const getCleanJsonString = () => {
        if (!covenants) return '';
        // Covenants object no longer contains the base64 sourceDocument, so we can stringify directly
        return JSON.stringify(covenants, null, 2);
    };

    const handleCopyJson = () => {
        const jsonStr = getCleanJsonString();
        if (!jsonStr) return;
        navigator.clipboard.writeText(jsonStr);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleViewSourcePDF = () => {
        if (documentUrl) {
            window.open(documentUrl, '_blank');
        } else {
            alert("No document URL available.");
        }
     };

     // Savings Calculation Helper
     const calculateSavings = (rec: Recommendation) => {
        let savingsText = rec.potentialSavings || '';
        let percentage = 0;
        let isPercentage = false;
        
        // Try to extract percentage
        const match = savingsText.match(/(\d+\.?\d*)%/);
        if (match) {
            percentage = parseFloat(match[1]);
            isPercentage = true;
        }

        const facilities = covenants.facilities || [];
        const hasGranularData = facilities.length > 0;

        let totalPrincipal = 0;
        let totalSaving = 0;
        let breakdown: { name: string, amount: number, saving: number, formattedAmount: string, formattedSaving: string }[] = [];

        if (hasGranularData) {
            breakdown = facilities.map(f => {
                const saving = isPercentage ? f.amount * (percentage / 100) : 0;
                return {
                    name: f.name,
                    amount: f.amount,
                    saving: saving,
                    formattedAmount: new Intl.NumberFormat('en-IE', { style: 'currency', currency: f.currency, maximumFractionDigits: 3, notation: "compact" }).format(f.amount),
                    formattedSaving: new Intl.NumberFormat('en-IE', { style: 'currency', currency: f.currency, maximumFractionDigits: 0 }).format(saving)
                };
            });
            totalPrincipal = facilities.reduce((sum, f) => sum + f.amount, 0);
            totalSaving = breakdown.reduce((sum, b) => sum + b.saving, 0);
        } else {
            // Fallback to Gross Debt
            totalPrincipal = health.grossDebt;
            totalSaving = isPercentage ? totalPrincipal * (percentage / 100) : 0;
        }

        return {
            isPercentage,
            percentage,
            hasGranularData,
            breakdown,
            formattedTotalPrincipal: new Intl.NumberFormat('en-IE', { style: 'currency', currency: covenants.dealMetadata.baseCurrency || 'EUR', maximumFractionDigits: 3, notation: "compact" }).format(totalPrincipal),
            formattedTotalSaving: new Intl.NumberFormat('en-IE', { style: 'currency', currency: covenants.dealMetadata.baseCurrency || 'EUR', maximumFractionDigits: 0 }).format(totalSaving)
        };
     };

     const Modal = () => {
        if (!selectedRec) return null;
        const calc = calculateSavings(selectedRec);

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedRec(null)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 m-4" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Lightbulb size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{selectedRec.title}</h3>
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{selectedRec.actionType} Opportunity</span>
                            </div>
                        </div>
                        <button onClick={() => setSelectedRec(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <CircleX size={24} /> 
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 leading-relaxed border border-slate-100">
                            {selectedRec.description}
                        </div>

                        {calc.isPercentage ? (
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Database size={12} /> Projected Impact Analysis
                                </h4>
                                
                                {calc.hasGranularData ? (
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3">Facility</th>
                                                    <th className="px-4 py-3 text-right">Commitment</th>
                                                    <th className="px-4 py-3 text-right text-emerald-600">Saving</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {calc.breakdown.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                                                        <td className="px-4 py-3 text-right text-slate-500 font-mono">{item.formattedAmount}</td>
                                                        <td className="px-4 py-3 text-right text-emerald-600 font-mono font-bold">+{item.formattedSaving}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                                <tr>
                                                    <td className="px-4 py-3 font-bold text-slate-900">Total</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{calc.formattedTotalPrincipal}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{calc.formattedTotalSaving}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 border border-slate-200 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">Total Debt</div>
                                            <div className="font-mono font-semibold text-slate-900">{calc.formattedTotalPrincipal}</div>
                                        </div>
                                        <div className="p-3 border border-slate-200 rounded-lg">
                                            <div className="text-xs text-slate-500 mb-1">Rate Reduction</div>
                                            <div className="font-mono font-semibold text-emerald-600">-{calc.percentage}%</div>
                                        </div>
                                    </div>
                                )}

                                <div className="relative p-4 bg-emerald-50 border border-emerald-100 rounded-xl overflow-hidden mt-2">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <TrendingDown size={80} className="text-emerald-600" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-sm text-emerald-800 font-medium mb-1">Est. Total Annual Savings</div>
                                        <div className="text-3xl font-bold text-emerald-700 tracking-tight">{calc.formattedTotalSaving}</div>
                                        <div className="text-[14px] text-emerald-600 mt-2 font-mono opacity-80">
                                            Based on {calc.percentage}% reduction across all facilities.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                                <TrendingDown className="text-indigo-600 mt-1" size={20} />
                                <div>
                                    <h4 className="text-indigo-900 font-bold text-sm">Potential Benefit</h4>
                                    <p className="text-xs text-indigo-700 mt-1">
                                        {selectedRec.potentialSavings || "Impact is variable based on execution."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                        <button 
                            onClick={() => setSelectedRec(null)}
                            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
     };

      const hasInterestCovenant = covenants?.financialCovenants?.some(c => 
        c.name.toLowerCase().includes('interest')
      );
      
      const leverageRule = covenants?.financialCovenants?.find(c => c.name.toLowerCase().includes('leverage'));
      const interestRule = covenants?.financialCovenants?.find(c => c.name.toLowerCase().includes('interest'));

      const getRecommendations = (): (Recommendation & { status?: string, progress?: number })[] => {
        // Start with recommendations extracted directly from the PDF (e.g. Cure Rights, Margin Step-downs)
        const extractedRecs = covenants.recommendations ? [...covenants.recommendations] : [];
        
        const processedRecs = extractedRecs.map(rec => {
             if (rec.conditionMetric === 'Leverage Ratio' && rec.conditionThreshold !== null && rec.conditionThreshold !== undefined) {
                 const current = headroom.leverageRatio;
                 const target = rec.conditionThreshold;
                 const operator = rec.conditionOperator || '<';
                 
                 let isMet = false;
                 if (operator === '<' || operator === '<=') isMet = current <= target;
                 else if (operator === '>' || operator === '>=') isMet = current >= target;
                 
                 return {
                     ...rec,
                     status: isMet ? 'Achieved' : 'Tracking',
                     progress: operator === '<' || operator === '<=' 
                        ? Math.max(0, current - target) // Distance to go (lower is better)
                        : Math.max(0, target - current) // Distance to go (higher is better)
                 };
             }
             return rec;
        });

        const recs: (Recommendation & { status?: string, progress?: number })[] = [...processedRecs];
        
        // Logic 1: Leverage Warning (Dynamic)
        if (headroom.leverageRatio > headroom.leverageThreshold * 0.85 && headroom.status !== 'Breach') {
             recs.push({
                 id: 'rec_lev_dynamic',
                 title: 'Reduce RCF Utilization',
                 description: `Leverage (${headroom.leverageRatio.toFixed(2)}x) is approaching the limit (${headroom.leverageThreshold.toFixed(2)}x). Repaying €2M of RCF would improve headroom by approx 0.5x.`,
                 actionType: 'Reduction',
                 potentialSavings: '€45k interest',
                 status: 'Action Required'
             });
        }
        
        // Logic 2: Sustainability (Dynamic check if not already covered)
        if (covenants.sustainabilityKpis?.stepDownMarginMax && !recs.some(r => r.id.includes('margin'))) {
             // Check if we have KPI data to track status - assuming not for now, just static
             recs.push({
                 id: 'rec_esg_dynamic',
                 title: 'Target Sustainability KPI',
                 description: 'Meeting the Carbon Intensity target will trigger a margin reduction.',
                 actionType: 'Strategic',
                 potentialSavings: `${(covenants.sustainabilityKpis.stepDownMarginMax)}% margin`
             });
        }
        
        // Logic 3: Cash Management (Dynamic)
        if (health.cashAtBank > 5000000 && headroom.leverageRatio > 2.0) {
             recs.push({
                 id: 'rec_cash_dynamic',
                 title: 'Sweep Excess Cash',
                 description: 'Use excess cash on balance sheet to prepay RCF and reduce interest expense.',
                 actionType: 'Optimization',
                 potentialSavings: 'Variable',
                 status: 'Opportunity'
             });
        }

        // Fallback if absolutely nothing
        if (recs.length === 0) {
             recs.push({
                 id: 'rec_gen',
                 title: 'Optimize Working Capital',
                 description: 'Improving receivables collection by 5 days could increase cash for debt service.',
                 actionType: 'Optimization'
             });
        }
        
        return recs;
    };

     // Helper for dashboard cards
     const RuleCard = ({ label, value, unit, quote }: { 
        label: string, 
        value: string | number, 
        unit?: string, 
        quote?: string
      }) => {
        
        const handleViewSource = (e: React.MouseEvent) => {
            e.stopPropagation();
            handleViewSourcePDF();
        };
    
        return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 relative group transition-all hover:border-emerald-300 shadow-sm">
          <div className="flex justify-between items-start">
              <span className="text-slate-500 text-xs font-bold uppercase">{label}</span>
              <div className="flex items-center gap-2">
                {documentUrl && (
                    <button 
                        onClick={handleViewSource}
                        className="text-blue-500 opacity-50 hover:opacity-100 transition-opacity hover:bg-blue-50 p-1 rounded" 
                        title="Open Source PDF"
                    >
                        <FileText size={14} />
                    </button>
                )}
                {quote && (
                    <div className="text-emerald-600 opacity-50 group-hover:opacity-100 transition-opacity cursor-help" title="Source Evidence">
                      <Quote size={14} /> 
                    </div>
                )}
              </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {value}{unit && <span className="text-lg font-normal text-slate-500 ml-0.5">{unit}</span>}
          </div>
          
          {quote && (
            <div className="mt-3 pt-3 border-t border-slate-100 hidden group-hover:block animate-fade-in">
               <p className="text-[10px] text-emerald-700 font-mono italic leading-relaxed">
                 "{quote}"
               </p>
            </div>
          )}
          {!quote && <div className="text-xs text-slate-400 mt-1">Mock Data</div>}
       </div>
      )};

    return (
        <>
        <div className="space-y-6 animate-fade-in pb-8">

            {readOnly && userRole === 'agent' && (
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-end gap-3">
                    <div className="flex items-center gap-3 mr-auto">
                        <div className="p-2 bg-slate-200 rounded-full text-slate-600">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm">Compliance Certificate Available (Read Only View)</h3>
                            <p className="text-xs text-slate-500">The formal Form of Compliance Certificate document has been submitted by the borrower.</p>
                        </div>
                    </div>
                    <a 
                        href={lastGeneratedCertUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <FileText size={18} />
                        View Signed Certificate
                    </a>
                 </div>
            )}
            
            {/* Success Banner for Generated Certificate - Visible to all if available */}
            {lastGeneratedCertUrl && userRole === 'borrower' && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-end shadow-sm animate-in fade-in slide-in-from-top-2 gap-4">
                    <div className="flex items-center gap-3 mr-auto">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <FileCheck size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-emerald-900 text-sm">Compliance Certificate Available</h3>
                            <p className="text-xs text-emerald-700">
                                The formal Form of Compliance Certificate document has been generated {status == 'submitted' ? 'and submitted' : 'but not yet submitted'}.
                            </p>
                        </div>
                    </div>
                    <a 
                        href={lastGeneratedCertUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <FileText size={18} />
                        View Signed Certificate
                    </a>
                    {status !== 'submitted' && (
                        <button 
                            onClick={onSave}
                            disabled={isSaving}
                            className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
                        >
                            {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Send size={18} />}
                            {isSaving ? 'Submitting...' : 'Confirm & Submit'}
                        </button>
                    )}
                </div>
            )}

            {/* Information Banner for Agents viewing Drafts */}
            {userRole === 'agent' && status === 'draft' && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
                        <Pencil size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-amber-900 text-sm">Draft Review</h3>
                        <p className="text-xs text-amber-700">
                            Compliance certificate is still being prepared by the borrower. Meanwhile, you can view the interim data and reconciliation bridges below.
                        </p>
                    </div>
                </div>
            )}

            {/* Top Action Bar for Borrower - Only show if in draft status */}
            {!readOnly && userRole === 'borrower' && status === 'draft' && !lastGeneratedCertUrl && (
                <div className="flex flex-col gap-3">
                    <div className="flex justify-end bg-emerald-50 border border-emerald-100 p-4 rounded-xl items-center gap-4">
                        <div className="text-emerald-800 text-sm font-medium mr-auto">
                            Please review the figures below. Once confirmed, prepare the certificate or submit directly.
                        </div>
                        <button 
                            onClick={onPrepareCertificate}
                            disabled={isPreparing}
                            className="bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-700 border border-emerald-200 px-6 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-all"
                        >
                            {isPreparing ? <RefreshCw className="animate-spin" size={18}/> : <FileText size={18} />}
                            {isPreparing ? 'Generating...' : (lastGeneratedCertUrl ? 'Regenerate Certificate' : 'Prepare Compliance Certificate')}
                        </button>
                        
                    </div>
                </div>
            )}
            
            {/* Springing Trigger Banner */}
            {headroom.status === 'Skipped' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
                 <PauseCircle size={32} className="text-blue-500" />
                 <div>
                    <h3 className="font-bold text-lg text-blue-900">Covenant Holiday Active</h3>
                    <p className="text-sm opacity-80">
                        Springing Test Condition ({headroom.triggerDetails?.metricName}) is below the threshold. Financial covenants are not being tested for this period.
                    </p>
                 </div>
              </div>
            )}
            
            {/* Top Cards: Rules vs Reality */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               
               {/* Trigger Card */}
               {headroom.triggerDetails ? (
                   <div className="bg-white p-5 rounded-xl border border-slate-200 relative flex flex-col justify-between group shadow-sm">
                      <div>
                        <div className="flex justify-between items-start">
                             <div className="flex flex-col">
                                <span className="text-slate-500 text-xs font-bold uppercase">Test Condition</span>
                                {headroom.testConditionActive ? 
                                    <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-bold w-fit mt-1 border border-amber-200">ACTIVE</span> : 
                                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold w-fit mt-1 border border-emerald-200">INACTIVE</span>
                                }
                             </div>
                             <div className="flex items-center gap-2">
                                {documentUrl && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleViewSourcePDF(); }}
                                        className="text-blue-500 opacity-50 hover:opacity-100 transition-opacity hover:bg-blue-50 p-1 rounded" 
                                        title="Open Source PDF"
                                    >
                                        <FileText size={14} />
                                    </button>
                                )}
                                {covenants.covenantTrigger?.sourceQuote && (
                                    <div className="text-emerald-600 opacity-50 group-hover:opacity-100 transition-opacity cursor-help" title="Source Evidence">
                                    <Quote size={14} /> 
                                    </div>
                                )}
                             </div>
                        </div>
                        <div className={`text-2xl font-bold mt-2 ${headroom.testConditionActive ? 'text-amber-500' : 'text-slate-400'}`}>
                            {(headroom.triggerDetails.currentValue * 100).toFixed(1)}%
                            <span className="text-sm text-slate-400 font-normal ml-1">Utilization</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3 mb-1">
                            <div className={`h-1.5 flex-1 rounded-full ${headroom.testConditionActive ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                <div className={`h-full rounded-full ${headroom.testConditionActive ? 'bg-amber-500' : 'bg-slate-300'}`} style={{ width: `${Math.min(headroom.triggerDetails.currentValue * 100, 100)}%` }}></div>
                            </div>
                        </div>
                      </div>

                      <div className="space-y-1 pt-2 border-t border-slate-100 mt-2">
                         <div className="flex justify-between text-xs">
                             <span className="text-slate-500">Threshold</span>
                             <span className="text-slate-700 font-mono">{(headroom.triggerDetails.threshold * 100).toFixed(0)}%</span>
                         </div>
                         {headroom.triggerDetails.capacity > 0 && (
                             <div className="flex justify-between text-xs">
                                 <span className="text-slate-500">Total Capacity</span>
                                 <span className="text-slate-700 font-mono">
                                    {new Intl.NumberFormat('en-IE', { style: 'currency', currency: covenants.dealMetadata.baseCurrency || 'EUR', maximumFractionDigits: 0, notation: "compact" }).format(headroom.triggerDetails.capacity)}
                                 </span>
                             </div>
                         )}
                      </div>
                      {covenants.covenantTrigger?.sourceQuote && (
                        <div className="mt-3 pt-3 border-t border-slate-100 hidden group-hover:block animate-fade-in absolute bottom-0 left-0 w-full bg-white z-10 p-4 rounded-b-xl border-x border-b border-slate-200 shadow-xl">
                           <p className="text-[10px] text-emerald-700 font-mono italic leading-relaxed">"{covenants.covenantTrigger.sourceQuote}"</p>
                        </div>
                      )}
                   </div>
               ) : (
                   <RuleCard 
                      label="Lev. Ratio (Max)" 
                      value={headroom.leverageThreshold.toFixed(2)} 
                      unit="x"
                      quote={leverageRule?.sourceQuote}
                   />
               )}
               
               {/* Logic for 2nd and 3rd cards based on Trigger existence */}
               {headroom.triggerDetails ? (
                   <RuleCard 
                      label="Lev. Ratio (Max)" 
                      value={headroom.leverageThreshold.toFixed(2)} 
                      unit="x"
                      quote={leverageRule?.sourceQuote}
                   />
               ) : (
                   <div className="bg-white p-5 rounded-xl border border-slate-200 group relative shadow-sm">
                     <span className="text-slate-500 text-xs font-bold uppercase">Actual Leverage</span>
                     <div className={`text-2xl font-bold mt-1 ${headroom.status === 'Breach' ? 'text-red-600' : (headroom.status === 'Skipped' ? 'text-slate-400' : 'text-emerald-600')}`}>
                       {headroom.leverageRatio.toFixed(2)}x
                     </div>
                     <div className="text-xs text-slate-400">Net Debt / EBITDA</div>
                   </div>
               )}
               
               {headroom.triggerDetails ? (
                <>
                   <div className="bg-white p-5 rounded-xl border border-slate-200 group relative shadow-sm">
                      <span className="text-slate-500 text-xs font-bold uppercase">Actual Leverage</span>
                      <div className={`text-2xl font-bold mt-1 ${headroom.status === 'Breach' ? 'text-red-600' : (headroom.status === 'Skipped' ? 'text-slate-400' : 'text-emerald-600')}`}>
                        {headroom.leverageRatio.toFixed(2)}x
                      </div>
                      <div className="text-xs text-slate-400">Net Debt / EBITDA</div>
                   </div>

                   <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-full shadow-sm">
                      <div className="p-4 border-b border-slate-100 flex-1 relative group hover:bg-slate-50 transition-colors rounded-t-xl">
                          <div className="flex justify-between items-start">
                             <span className="text-slate-500 text-xs font-bold uppercase">Net Debt</span>
                          </div>
                          <div className="text-lg font-bold text-slate-900 mt-0.5">
                            €{(health.netDebt / 1000000).toFixed(1)}m
                          </div>
                      </div>
                      <div className="p-4 flex-1 relative group hover:bg-slate-50 transition-colors rounded-b-xl">
                          <div className="flex justify-between items-start">
                             <span className="text-slate-500 text-xs font-bold uppercase">EBITDA</span>
                          </div>
                          <div className="text-lg font-bold text-slate-900 mt-0.5">
                            €{(health.adjustedEBITDA / 1000000).toFixed(1)}m
                          </div>
                      </div>
                   </div>
                </>
               ) : (
                <>
                   {interestRule ? (
                       <RuleCard 
                          label="Int. Cover (Min)" 
                          value={headroom.interestThreshold.toFixed(2)} 
                          unit="x"
                          quote={interestRule.sourceQuote}
                       />
                   ) : (
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-slate-500 text-xs font-bold uppercase">Cash @ Bank</span>
                          <div className="text-2xl font-bold text-slate-900 mt-1">
                            €{(health.cashAtBank / 1000000).toFixed(1)}m
                          </div>
                      </div>
                   )}
                   <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-full shadow-sm">
                      <div className="p-4 border-b border-slate-100 flex-1 relative group hover:bg-slate-50 transition-colors rounded-t-xl">
                          <div className="flex justify-between items-start">
                             <span className="text-slate-500 text-xs font-bold uppercase">Net Debt</span>
                          </div>
                          <div className="text-lg font-bold text-slate-900 mt-0.5">
                            €{(health.netDebt / 1000000).toFixed(1)}m
                          </div>
                      </div>
                      <div className="p-4 flex-1 relative group hover:bg-slate-50 transition-colors rounded-b-xl">
                          <div className="flex justify-between items-start">
                             <span className="text-slate-500 text-xs font-bold uppercase">EBITDA</span>
                          </div>
                          <div className="text-lg font-bold text-slate-900 mt-0.5">
                            €{(health.adjustedEBITDA / 1000000).toFixed(1)}m
                          </div>
                      </div>
                   </div>
                </>
               )}
            </div>

             {/* Main Visuals Row */}
             <div className={`grid grid-cols-1 md:grid-cols-2 ${hasInterestCovenant ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
                <HeadroomChart
                  current={headroom.leverageRatio}
                  max={headroom.leverageThreshold}
                  label="Leverage Ratio"
                />
                {hasInterestCovenant && (
                  <HeadroomChart
                    current={headroom.interestCoverageRatio}
                    max={headroom.interestThreshold}
                    label="Interest Cover"
                    inverse
                  />
                )}
               
               {userRole !== 'agent' && (
               <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col relative shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                                              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                  <Lightbulb size={16} />
                                              </div>
                                              <span className="text-slate-500 text-xs font-bold uppercase">Opportunities</span>
                                          </div>
                                          <div className="flex-1 flex flex-col gap-3 overflow-y-auto overflow-x-hidden max-h-[160px] pr-1 scrollbar-thin">
                                              {getRecommendations().map(rec => (
                                                  <div key={rec.id} onClick={() => setSelectedRec(rec)} className="group cursor-pointer relative hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">                            <div className="flex justify-between items-start">
                                <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors pr-8">{rec.title}</h4>
                                {rec.status === 'Achieved' ? (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                        <Trophy size={10} /> Active
                                    </span>
                                ) : (
                                    rec.potentialSavings && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">{rec.potentialSavings}</span>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed line-clamp-3">{rec.description}</p>
                            
                            {/* Tracking Progress Bar */}
                            {rec.status === 'Tracking' && rec.conditionThreshold !== undefined && (
                                <div className="mt-2">
                                    <div className="flex justify-between text-[9px] text-slate-400 mb-0.5 uppercase font-bold">
                                        <span>Current: {headroom.leverageRatio.toFixed(2)}x</span>
                                        <span>Target: {rec.conditionOperator} {rec.conditionThreshold.toFixed(2)}x</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-indigo-400 h-full rounded-full transition-all duration-1000" 
                                            // Scale: Assume "Starting Point" is current covenant limit? Too complex.
                                            // Simple approach: Inverse percentage for "Less Than"
                                            style={{ width: '50%' }} 
                                        ></div> 
                                    </div>
                                    <div className="text-[9px] text-indigo-500 mt-0.5 text-right font-medium">
                                        {(rec.progress || 0).toFixed(2)}x to go
                                    </div>
                                </div>
                            )}
                        </div>
                     ))}
                  </div>
               </div>
               )}

               <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-center items-center relative overflow-hidden shadow-sm">
                  <div className={`absolute inset-0 opacity-10 ${headroom.status === 'Breach' ? 'bg-red-500' : (headroom.status === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500')}`}></div>
                  <div className="text-center z-10">
                    <p className="text-slate-500 text-sm font-bold uppercase mb-2">Compliance Status</p>
                    <div className={`text-3xl font-bold mb-1 ${headroom.status === 'Breach' ? 'text-red-600' : (headroom.status === 'Warning' ? 'text-amber-500' : 'text-emerald-500')}`}>
                      {headroom.status.toUpperCase()}
                    </div>
                    <p className="text-xs text-slate-400">
                        {headroom.status === 'Healthy' ? 'All covenants satisfied.' : (headroom.status === 'Skipped' ? 'Testing conditions not met.' : 'Attention required.')}
                    </p>
                  </div>
               </div>
            </div>

            {/* Sustainability Linked Loan Section */}
            {covenants.sustainabilityKpis && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Leaf size={120} />
                 </div>
                 <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Leaf size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Sustainability Linked Loan</h3>
                        <p className="text-xs text-slate-500">ESG KPI Performance & Margin Adjustments</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Margin Benefit</span>
                        <div className="mt-2">
                            <div className="text-3xl font-bold text-emerald-600 flex items-center gap-2">
                                <TrendingDown size={28} />
                                {covenants.sustainabilityKpis.stepDownMarginMax 
                                    ? (covenants.sustainabilityKpis.stepDownMarginMax)
                                    : '0.00'}%
                            </div>
                            <div className="text-xs text-slate-400 mt-1">Interest rate reduction if targets met</div>
                        </div>
                    </div>
                    <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {covenants.sustainabilityKpis.kpiTargets?.map((kpi, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                        {kpi.id || `KPI ${idx+1}`}
                                    </span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Tracking</span>
                                </div>
                                <div className="text-sm font-medium text-slate-700 mb-1 line-clamp-2" title={kpi.description}>
                                    {kpi.description || "Sustainability Target"}
                                </div>
                                <div className="flex items-end gap-1 mt-2">
                                    <span className="text-xs text-emerald-600 mb-1 mr-1">Target:</span>
                                    <span className="text-xl font-bold text-slate-900">
                                        {kpi.targetValue}
                                    </span>
                                    <span className="text-xs text-slate-500 mb-1">{kpi.unit === 'Percentage' ? '%' : kpi.unit}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '75%' }}></div>
                                </div>
                                <span className="text-xs text-red-300">Progress is mocked</span>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
            )}

            {/* Reconciliation Tables */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Database size={18} className="text-emerald-600" />
                        EBITDA Reconciliation Bridge
                    </h3>
                </div>
                <ReconciliationTable data={reconciliation.filter(item => item.section === 'EBITDA')} totalLabel="Adjusted EBITDA" />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Database size={18} className="text-blue-500" />
                        Net Debt Reconciliation Bridge
                    </h3>
                </div>
                <ReconciliationTable data={reconciliation.filter(item => item.section === 'NET_DEBT')} totalLabel="Total Net Debt" />
            </div>

            {/* JSON Output Section */}
            {!readOnly && (
                <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <FileText size={20} className="text-slate-400" />
                            Extracted LMA Definitions
                        </h3>
                        <button 
                            onClick={handleCopyJson}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-medium text-slate-600 transition-colors"
                        >
                            {copySuccess ? <Check size={14} className="text-emerald-600"/> : <Copy size={14} />}
                            {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
                        </button>
                    </div>
                    <textarea
                        readOnly
                        className="w-full h-48 bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs text-slate-500 focus:outline-none resize-y"
                        value={getCleanJsonString()}
                    />
                </div>
            )}
        </div>
        <Modal />
        </>
    );
};

export default DashboardView;