'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

interface DataChartProps {
  data: Record<string, unknown>[];
  type: 'bar' | 'line' | 'pie';
}

export function DataChart({ data, type }: DataChartProps) {
  if (!data.length) return null;

  const keys = Object.keys(data[0]);
  // Première colonne = labels, le reste = valeurs numériques
  const labelKey = keys[0];
  const valueKeys = keys.slice(1).filter(k =>
    data.some(d => typeof d[k] === 'number' || !isNaN(Number(d[k])))
  );

  // Convertir les valeurs en nombres
  const chartData = data.map(row => {
    const converted: Record<string, unknown> = { [labelKey]: row[labelKey] };
    for (const k of valueKeys) {
      converted[k] = Number(row[k]) || 0;
    }
    return converted;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={300}>
        {type === 'bar' ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {valueKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {valueKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
            ))}
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={chartData}
              dataKey={valueKeys[0]}
              nameKey={labelKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
