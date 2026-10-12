import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAffiliates } from "@/lib/creator-enhancements/affiliates";
import { ActionForm } from "@/components/action-form";
import { ReasonField } from "@/components/admin-shared";
import { AffiliateReport } from "@/components/affiliate-report";
import {
  changeAffiliate,
  importAffiliateReceipt,
} from "@/app/creator-enhancement-actions";
export default async function Affiliates() {
  const a = await requireAdmin(),
    d = await readAffiliates(db(), a.id, "admin");
  const examples = {
    program: {
      partner: "Example partner",
      name: "Proposed Tool program",
      hosts: ["example.com"],
      proposedRateBps: 2000,
      startsAt: "2026-10-12T00:00:00Z",
      endsAt: "2027-10-12T00:00:00Z",
    },
    destination: {
      programId: "Select a configured program ID",
      label: "Tool website",
      url: "https://example.com/tool",
      parameters: { ref: "aibean", click_id: "{click}" },
      disclosure:
        "aiBean may earn a commission if you purchase through this link.",
      enabled: false,
    },
    relationship: {
      destinationId: "Select a configured destination ID",
      toolId: "Select a published Tool ID",
      campaignId: null,
      creatorShareBps: 0,
      enabled: false,
    },
  };
  return (
    <>
      <section className="placeholder-card">
        <h2 className="text-2xl">Affiliate program administration</h2>
        <p className="preview-notice my-5">
          Proposed / Preview. No tracked provider activation without independent
          owner approval and verified provider configuration. Proposed rate: 20%
          of eligible provider-confirmed revenue; Creator share defaults to 0%,
          with no payout system.
        </p>
        {!d.ready ? (
          <p>Affiliate administration awaits its reviewed database package.</p>
        ) : (
          <>
            {(["program", "destination", "relationship"] as const).map(
              (kind) => (
                <details className="account-row" key={kind}>
                  <summary className="cursor-pointer">Create {kind}</summary>
                  <ActionForm
                    action={changeAffiliate}
                    label={"Save " + kind + " proposal"}
                  >
                    <input type="hidden" name="operation" value={kind} />
                    <label className="field">
                      Reviewed configuration
                      <textarea
                        name="configuration"
                        rows={10}
                        required
                        maxLength={12000}
                        defaultValue={JSON.stringify(examples[kind], null, 2)}
                      />
                    </label>
                    <ReasonField />
                  </ActionForm>
                </details>
              ),
            )}
            {(
              [
                ["program", d.programs],
                ["destination", d.destinations],
                ["relationship", d.relationships],
              ] as const
            ).map(([kind, rows]) =>
              rows.map((r) => {
                const config =
                  kind === "program"
                    ? {
                        partner: r.partner,
                        name: r.name,
                        hosts: r.hosts,
                        proposedRateBps: r.proposed_rate_bps,
                        startsAt: new Date(String(r.starts_at)).toISOString(),
                        endsAt: new Date(String(r.ends_at)).toISOString(),
                      }
                    : kind === "destination"
                      ? {
                          programId: r.program_id,
                          label: r.label,
                          url: r.url,
                          parameters: r.parameters,
                          disclosure: r.disclosure,
                          enabled: r.enabled,
                        }
                      : {
                          destinationId: r.destination_id,
                          toolId: r.tool_id,
                          campaignId: r.campaign_id,
                          creatorShareBps: r.creator_share_bps,
                          enabled: r.enabled,
                        };
                return (
                  <details key={r.id} className="account-row">
                    <summary className="cursor-pointer break-all">
                      {kind}: {String(r.name || r.label || r.tool_id)} · {r.id}{" "}
                      · revision {r.revision}
                    </summary>
                    <ActionForm action={changeAffiliate} label="Save revision">
                      <input type="hidden" name="operation" value={kind} />
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="revision" value={r.revision} />
                      <label className="field">
                        Configuration
                        <textarea
                          name="configuration"
                          rows={10}
                          required
                          maxLength={12000}
                          defaultValue={JSON.stringify(config, null, 2)}
                        />
                      </label>
                      <ReasonField />
                    </ActionForm>
                    {kind === "program" && (
                      <>
                        <p className="text-sm break-all my-5">
                          {String(r.status)} · Full configuration SHA-256:{" "}
                          {String(r.config_sha256)}
                        </p>
                        <ActionForm
                          action={changeAffiliate}
                          label="Save program status"
                          confirmation="Confirm this program status change? Activation requires separate exact approval."
                        >
                          <input
                            type="hidden"
                            name="operation"
                            value="status"
                          />
                          <input type="hidden" name="id" value={r.id} />
                          <input
                            type="hidden"
                            name="revision"
                            value={r.revision}
                          />
                          <label className="field">
                            Program status
                            <select name="enabled">
                              <option value="false">Disabled</option>
                              <option value="true">
                                Enable independently approved configuration
                              </option>
                            </select>
                          </label>
                          <ReasonField />
                        </ActionForm>
                      </>
                    )}
                  </details>
                );
              }),
            )}
            <details className="account-row">
              <summary>Reconcile provider-verified conversion receipt</summary>
              <p className="my-5">
                Use a canonical provider-neutral receipt signed by the privately
                configured, verified adapter. Unsigned, stale and mismatched
                events cannot create conversions or commissions.
              </p>
              <ActionForm
                action={importAffiliateReceipt}
                label="Verify and reconcile receipt"
              >
                <label className="field">
                  Receipt JSON
                  <textarea
                    name="receipt"
                    required
                    maxLength={4000}
                    rows={10}
                  />
                </label>
                <label className="field">
                  Receipt signature
                  <input name="signature" required maxLength={64} />
                </label>
                <ReasonField />
              </ActionForm>
            </details>
          </>
        )}
      </section>
      <AffiliateReport actor={a.id} scope="admin" />
    </>
  );
}
