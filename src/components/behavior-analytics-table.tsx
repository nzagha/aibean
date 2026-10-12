import type { BehaviorRow } from "@/lib/discovery/analytics";
export function BehaviorAnalyticsTable({
  ready,
  rows,
}: {
  ready: boolean;
  rows: BehaviorRow[];
}) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl mb-4">Recorded engagement</h2>
      <p className="my-4 text-sm">
        Last 30 days · UTC · Recorded requests deduplicated per session, action,
        target and minute. These are not unique visitors or conversions. At most
        500 aggregate rows are displayed.
      </p>
      {!ready ? (
        <p className="preview-notice">
          Behavioral reporting awaits the reviewed discovery package.
        </p>
      ) : !rows.length ? (
        <p>No recorded engagement yet.</p>
      ) : (
        <div
          className="compare-scroll"
          tabIndex={0}
          role="region"
          aria-label="Recorded engagement"
        >
          <table className="compare-table">
            <thead>
              <tr>
                {[
                  "Day",
                  "Content",
                  "Action",
                  "On-platform source",
                  "Resource campaign",
                  "Recorded events",
                ].map((t) => (
                  <th key={t} scope="col">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.day}</td>
                  <td>
                    {r.kind} · {r.target_id}
                  </td>
                  <td>{r.event.replaceAll("_", " ")}</td>
                  <td>{r.source === "direct" ? "Unattributed" : r.source}</td>
                  <td>{r.campaign_id || "None verified"}</td>
                  <td>{r.requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
