import type { AnalyticsRow } from "@/lib/content/analytics";
export function AnalyticsTable({ rows }: { rows: AnalyticsRow[] }) {
  return (
    <>
      <p className="my-5 text-sm">
        Last 30 days · Explicit external-link requests, including repeat
        requests and automated traffic. These counts do not represent unique
        visitors, conversions or organic ranking. No visitor identities are
        recorded.
      </p>
      {!rows.length ? (
        <p className="my-5">No outbound requests recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">
              Daily outbound request aggregates
            </caption>
            <thead>
              <tr>
                {["Day", "Content", "Acquisition source", "Requests"].map(
                  (h) => (
                    <th scope="col" className="py-3 pr-5" key={h}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={[r.day, r.kind, r.source].join(":")}
                  className="border-t border-line"
                >
                  <td className="py-3 pr-5">{r.day}</td>
                  <td>{r.kind}</td>
                  <td>{r.source}</td>
                  <td>{r.requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
