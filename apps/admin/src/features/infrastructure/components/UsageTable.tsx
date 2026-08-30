interface Row {
  key: string;
  primary: string;
  columns: (string | number)[];
}

/** Shared shell for the small counter tables, so they stay visually identical. */
export function UsageTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: Row[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#1C1C1C] p-5 text-sm text-white/35">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#1C1C1C]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-white/40">
              {headers.map((h) => (
                <th key={h} className="px-5 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-3 font-medium text-white">
                  {r.primary}
                </td>
                {r.columns.map((c, i) => (
                  <td key={i} className="px-5 py-3 text-white/70">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
