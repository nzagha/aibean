import { db } from "@/lib/db";
import { readAffiliates } from "@/lib/creator-enhancements/affiliates";
export async function AffiliateReport({
  actor,
  scope,
  tool,
}: {
  actor: string;
  scope: "admin" | "creator" | "vendor";
  tool?: string;
}) {
  const d = await readAffiliates(db(), actor, scope, tool);
  const counts = d.clicks.reduce((n, r) => n + Number(r.clicks), 0),
    c = d.conversions[0];
  return (
    <section className="placeholder-card my-8">
      <h2 className="text-2xl">Affiliate attribution</h2>
      {!d.ready ? (
        <p className="preview-notice my-5">
          Affiliate reporting awaits the reviewed database package.
        </p>
      ) : (
        <>
          <p className="my-5">
            {counts} deduplicated eligible clicks recorded in the last 30 days.
            These are requests, not unique visitors.
          </p>
          <p className="my-5">
            Provider-verified conversions:{" "}
            {c?.conversions == null ? "None recorded" : String(c.conversions)} ·
            Provider-verified commissions:{" "}
            {c?.commission_cents == null
              ? "None recorded"
              : "$" + (Number(c.commission_cents) / 100).toFixed(2) + " USD"}
            . Commission totals cover retained reconciled receipts and do not
            represent payouts.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">
                Recorded affiliate click attribution
              </caption>
              <thead>
                <tr>
                  {["Day", "Tool", "Campaign", "Source", "Clicks"].map((h) => (
                    <th className="p-3" scope="col" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.clicks.map((r, i) => (
                  <tr key={i}>
                    {[
                      r.day,
                      r.tool_id,
                      r.campaign_id || "Direct",
                      r.source,
                      r.clicks,
                    ].map((v, n) => (
                      <td className="p-3" key={n}>
                        {String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="text-xl my-5">Authorized relationships</h3>
          {!d.relationships.length ? (
            <p>No relationships recorded.</p>
          ) : (
            d.relationships.map((r) => (
              <p className="account-row" key={r.id}>
                {String(r.label)} · {r.enabled ? "Configured" : "Disabled"} ·
                Program {String(r.program_status)} · {String(r.disclosure)}
              </p>
            ))
          )}
          <p className="text-sm mt-5">
            Admin-managed relationships cannot grant editorial approval,
            verification, ownership or organic rank. No automatic commission or
            revenue estimates.
          </p>
        </>
      )}
    </section>
  );
}
