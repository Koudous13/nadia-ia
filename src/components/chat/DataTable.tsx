'use client';

export function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return null;
  const columns = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-md shadow-gray-200/30 bg-white msg-enter">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-[#eff6ff] to-[#f0f4ff]">
            {columns.map(col => (
              <th key={col} className="px-4 py-3 text-left text-[12px] font-semibold text-[#1e40af] uppercase tracking-wider border-b border-blue-100/50">
                {col.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
              {columns.map(col => (
                <td key={col} className="px-4 py-2.5 text-[13px] text-gray-600">
                  {String(row[col] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
