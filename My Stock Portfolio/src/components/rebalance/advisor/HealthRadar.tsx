import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts';

interface HealthRadarProps {
  data: {
    diversification: number;
    valuation: number;
    growth: number;
    risk: number;
    income: number;
  };
}

export const HealthRadar: React.FC<HealthRadarProps> = ({ data }) => {
  const chartData = [
    { subject: 'Diversification', A: data.diversification, fullMark: 100 },
    { subject: 'Valuation', A: data.valuation, fullMark: 100 },
    { subject: 'Growth', A: data.growth, fullMark: 100 },
    { subject: 'Risk Mgmt', A: data.risk, fullMark: 100 },
    { subject: 'Income', A: data.income, fullMark: 100 },
  ];

  return (
    <div className="w-full h-full min-h-[250px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#2A2E45" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#CBD5E1', fontSize: 13, fontWeight: 500 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="A"
            stroke="#A855F7"
            fill="#A855F7"
            fillOpacity={0.35}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#181B2A', borderColor: '#2A2E45', borderRadius: '8px', fontSize: '13px' }}
            itemStyle={{ color: '#A855F7', fontWeight: 'bold' }}
            formatter={(value: number) => [`${value}/100`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
