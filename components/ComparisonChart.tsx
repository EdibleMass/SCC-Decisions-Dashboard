import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ComparisonChartProps {
  agreementCount: number;
  disagreementCount: number;
}

const COLORS = ['#003366', '#ef4444']; // SCC Blue, Red for Disagree

const ComparisonChart: React.FC<ComparisonChartProps> = ({ agreementCount, disagreementCount }) => {
  const data = [
    { name: 'Agreed', value: agreementCount },
    { name: 'Disagreed', value: disagreementCount },
  ];

  if (agreementCount === 0 && disagreementCount === 0) {
    return <div className="text-gray-400 text-center py-10">No shared cases found.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComparisonChart;
