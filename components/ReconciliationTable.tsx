import React from 'react';
import { ReconciliationItem } from '../types';
import { ArrowRight, AlertTriangle, Quote } from 'lucide-react';

interface Props {
  data: ReconciliationItem[];
  totalLabel?: string;
}

const ReconciliationTable: React.FC<Props> = ({ data, totalLabel = "Total" }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="overflow-x-auto min-h-[250px]">
      <table className="w-full text-left text-sm text-slate-500">
        <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
          <tr>
            <th className="px-6 py-4">LMA Item (The Rule)</th>
            <th className="px-6 py-4">SAP Source (The Data)</th>
            <th className="px-6 py-4 text-right">Raw Amount</th>
            <th className="px-6 py-4 text-center">Adjustment</th>
            <th className="px-6 py-4 text-right">Final Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900">
                {row.lmaItem}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  {row.sapSources.slice(0, 2).map(src => (
                    <div key={src.id} className="flex items-center gap-2 text-xs">
                        <div className="group relative">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 cursor-help hover:bg-slate-200 transition-colors border border-slate-200">
                                {src.accountCode}
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 w-max max-w-[200px] p-3 bg-white border border-slate-200 rounded-lg shadow-xl z-50 hidden group-hover:block pointer-events-none">
                                <div className="font-bold text-slate-900 text-xs mb-1">{src.accountName}</div>
                                <div className="flex items-center gap-1 text-[10px]">
                                    <span className="text-slate-500">Source:</span>
                                    <span className="text-emerald-600 font-mono">{src.sourceType}</span>
                                </div>
                                <div className="absolute top-full left-3 -mt-1 border-4 border-transparent border-t-slate-200"></div>
                            </div>
                        </div>
                        <span className="truncate max-w-[150px] text-slate-600">{src.accountName}</span>
                    </div>
                  ))}
                  {row.sapSources.length > 2 && (
                    <span className="text-xs text-slate-400 italic">+{row.sapSources.length - 2} more entries</span>
                  )}
                  {row.sapSources.length === 0 && <span className="text-slate-400 italic">No Data</span>}
                </div>
              </td>
              <td className="px-6 py-4 text-right font-mono text-slate-600">
                {formatCurrency(row.rawAmount)}
              </td>
              <td className="px-6 py-4 text-center">
                <div className="flex flex-col items-center justify-center gap-1">
                    {row.cappedAmount && row.rawAmount > row.cappedAmount ? (
                        <div className="flex items-center justify-center gap-1 text-amber-600" title={row.adjustmentReason}>
                            <AlertTriangle size={14} />
                            <span className="text-xs font-bold">CAPPED</span>
                        </div>
                    ) : (
                        <span className="text-xs text-slate-400">{row.adjustmentReason || '-'}</span>
                    )}
                    
                    {row.supportingQuote && (
                        <div className="group relative mt-1">
                           <div className="flex items-center justify-center text-emerald-600 cursor-help opacity-70 hover:opacity-100 transition-opacity p-1 bg-emerald-50 rounded-full">
                               <Quote size={12} />
                           </div>
                           <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-xl z-20 hidden group-hover:block pointer-events-none">
                               <p className="text-[10px] text-emerald-700 italic font-mono leading-tight">
                                   "{row.supportingQuote}"
                               </p>
                               <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-200"></div>
                           </div>
                        </div>
                    )}
                </div>
              </td>
              <td className={`px-6 py-4 text-right font-mono font-bold ${row.isAddBack ? 'text-emerald-600' : 'text-slate-900'}`}>
                {row.lmaItem.includes('(-)') ? '-' : '+'}{formatCurrency(Math.abs(row.finalAmount))}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-50 border-t-2 border-slate-200">
            <td colSpan={4} className="px-6 py-4 text-right font-bold text-lg text-slate-700">{totalLabel}</td>
            <td className="px-6 py-4 text-right font-bold text-lg text-emerald-600 font-mono">
                {formatCurrency(data.reduce((acc, row) => {
                    const val = row.finalAmount; 
                    return row.lmaItem.includes('(-)') ? acc - Math.abs(val) : acc + Math.abs(val);
                }, 0))} 
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ReconciliationTable;