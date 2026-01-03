import React, { useState } from 'react';
import { FileText, Database, CheckCircle2, RefreshCw, Quote, Copy, Check, PauseCircle, Leaf, TrendingDown, Send } from 'lucide-react';
import { CovenantRules, ReconciliationItem, FinancialHealth, HeadroomMetrics } from '../types';
import HeadroomChart from './HeadroomChart';
import ReconciliationTable from './ReconciliationTable';

interface DashboardViewProps {
    covenants: CovenantRules;
    headroom: HeadroomMetrics;
    health: FinancialHealth;
    reconciliation: ReconciliationItem[];
    userRole: string;
    onSave?: () => void;
    isSaving?: boolean;
    readOnly?: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
    covenants, headroom, health, reconciliation, userRole, onSave, isSaving, readOnly 
}) => {
    
    const [copySuccess, setCopySuccess] = useState(false);
    
    // Helper to get clean JSON
    const getCleanJsonString = () => {
        if (!covenants) return '';
        const { sourceDocument, ...rest } = covenants;
        const cleanData = sourceDocument 
            ? { ...rest, sourceDocument: { name: sourceDocument.name, data: "<Base64 Omitted>" } } 
            : rest;
        return JSON.stringify(cleanData, null, 2);
    };

    const handleCopyJson = () => {
        const jsonStr = getCleanJsonString();
        if (!jsonStr) return;
        navigator.clipboard.writeText(jsonStr);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleViewSourcePDF = (sourceDoc: { name: string, data: string }) => {
        try {
           const byteCharacters = atob(sourceDoc.data);
           const byteNumbers = new Array(byteCharacters.length);
           for (let i = 0; i < byteCharacters.length; i++) {
               byteNumbers[i] = byteCharacters.charCodeAt(i);
           }
           const byteArray = new Uint8Array(byteNumbers);
           const blob = new Blob([byteArray], { type: 'application/pdf' });
           const blobUrl = URL.createObjectURL(blob);
           window.open(blobUrl, '_blank');
        } catch (err) {
           console.error("Error opening PDF", err);
        }
     };

     const hasInterestCovenant = covenants?.financialCovenants?.some(c => 
        c.name.toLowerCase().includes('interest')
      );
      
      const leverageRule = covenants?.financialCovenants?.find(c => c.name.toLowerCase().includes('leverage'));
      const interestRule = covenants?.financialCovenants?.find(c => c.name.toLowerCase().includes('interest'));

     // Helper for dashboard cards
     const RuleCard = ({ label, value, unit, quote, sourceDoc }: { 
        label: string, 
        value: string | number, 
        unit?: string, 
        quote?: string,
        sourceDoc?: { name: string, data: string } | null 
      }) => {
        
        const handleViewSource = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (sourceDoc) handleViewSourcePDF(sourceDoc);
        };
    
        return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 relative group transition-all hover:border-emerald-300 shadow-sm">
          <div className="flex justify-between items-start">
              <span className="text-slate-500 text-xs font-bold uppercase">{label}</span>
              <div className="flex items-center gap-2">
                {sourceDoc && (
                    <button 
                        onClick={handleViewSource}
                        className="text-blue-500 opacity-50 hover:opacity-100 transition-opacity hover:bg-blue-50 p-1 rounded" 
                        title={`Open Source PDF: ${sourceDoc.name}`}
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
        <div className="space-y-6 animate-fade-in pb-8">
            
            {/* Top Action Bar for Borrower */}
            {!readOnly && userRole === 'borrower' && (
                <div className="flex justify-end bg-emerald-50 border border-emerald-100 p-4 rounded-xl items-center gap-4">
                    <div className="text-emerald-800 text-sm font-medium mr-auto">
                        Please review the figures below. Once confirmed, submit to the Facility Agent.
                    </div>
                    <button 
                        onClick={onSave}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Send size={18} />}
                        {isSaving ? 'Submitting...' : 'Confirm & Submit to Agent'}
                    </button>
                </div>
            )}

            {readOnly && (
                 <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-slate-200 rounded-full text-slate-600">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">Read Only View</h3>
                        <p className="text-xs text-slate-500">Viewing a submitted certificate.</p>
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
                                {covenants.sourceDocument && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleViewSourcePDF(covenants.sourceDocument!); }}
                                        className="text-blue-500 opacity-50 hover:opacity-100 transition-opacity hover:bg-blue-50 p-1 rounded" 
                                        title={`Open Source PDF: ${covenants.sourceDocument.name}`}
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
                      sourceDoc={covenants.sourceDocument}
                      quote={leverageRule?.sourceQuote}
                   />
               )}
               
               {/* Logic for 2nd and 3rd cards based on Trigger existence */}
               {headroom.triggerDetails ? (
                   <RuleCard 
                      label="Lev. Ratio (Max)" 
                      value={headroom.leverageThreshold.toFixed(2)} 
                      unit="x"
                      sourceDoc={covenants.sourceDocument}
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
                          sourceDoc={covenants.sourceDocument}
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
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                    ? (covenants.sustainabilityKpis.stepDownMarginMax * 100).toFixed(3) 
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
                                    <span className="text-xl font-bold text-slate-900">
                                        {kpi.targetValue}
                                    </span>
                                    <span className="text-xs text-slate-500 mb-1">{kpi.unit}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '75%' }}></div>
                                </div>
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
    );
};

export default DashboardView;