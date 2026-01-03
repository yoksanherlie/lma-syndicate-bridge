import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface HeadroomChartProps {
  current: number;
  max: number;
  label: string;
  inverse?: boolean;
}

const HeadroomChart = (props: HeadroomChartProps) => {
  const { current, max, label, inverse = false } = props;
  
  // Calculate percentage fill
  let percent = 0;
  let fill = '#10b981'; // Emerald 500

  if (!inverse) {
    // Leverage: Higher is worse
    percent = (current / max) * 100;
  } else {
    // Interest Cover: Lower is worse.
    percent = (max / current) * 100; 
  }

  if (percent > 100) percent = 100;

  // Color logic
  if (percent > 90) fill = '#ef4444'; // Red (Breach/Danger)
  else if (percent > 75) fill = '#f59e0b'; // Amber (Warning)
  
  const chartData = [
    { name: 'Headroom', value: percent, fill: fill }
  ];

  // Defined as simple array variable
  const axisDomain = [0, 100];

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-slate-500 text-sm font-medium mb-2 uppercase tracking-wider">{label}</h3>
      <div className="h-48 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="70%" 
            outerRadius="100%" 
            barSize={15} 
            data={chartData} 
            startAngle={180} 
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={axisDomain} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: '#f1f5f9' }} // Slate 100
              dataKey="value"
              cornerRadius={10}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                formatter={(val: any) => [`${Number(val).toFixed(1)}% Used`, 'Capacity']}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none">
            <span className="text-3xl font-bold text-slate-900">{current.toFixed(2)}x</span>
            <span className="text-xs text-slate-500">Limit: {max.toFixed(2)}x</span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-medium text-slate-500">
            {inverse 
                ? `${(current - max).toFixed(2)}x Safety Buffer` 
                : `${(max - current).toFixed(2)}x Headroom`}
        </p>
      </div>
    </div>
  );
};

export default HeadroomChart;