import { db } from "@/lib/db";
import { readPricing } from "@/lib/pricing/releases";
import { ActionForm } from "./action-form";
import { ReasonField } from "./admin-shared";
import { changePricing, decideRefund } from "@/app/pricing-actions";
import { resultRows } from "@/lib/admin/tool-workflows";
import { sql } from "drizzle-orm";
import { checkAdmin } from "@/lib/admin/tool-workflows";
import { nextPricingVersion } from "@/lib/pricing/config";
export async function AdminPricing({ admin }: { admin: string }) {
  const data = await readPricing(db(), admin);
  const refunds = data.ready
    ? await db().transaction(async (tx) => {
        await checkAdmin(tx, admin);
        return resultRows<{
          id: string;
          status: string;
          amount: number;
          reason: string;
          revision: number;
        }>(
          await tx.execute(
            sql`SELECT id,status,amount,reason,revision FROM public.pricing_refunds ORDER BY created_at DESC,id LIMIT 50`,
          ),
        );
      })
    : [];
  return (
    <section className="mt-8">
      <h2 className="text-2xl">Versioned plans & entitlements</h2>
      <p className="preview-notice my-5">
        Proposed / Preview. Review does not activate billing. Sandbox activation
        requires separate owner authorization for the exact configuration
        checksum and verified test price IDs. Live offerings are unsupported.
      </p>
      {!data.ready ? (
        <p>
          The separate pricing-v1 package and private enable flag are required.
          Proposed recommendations remain visible on Pricing.
        </p>
      ) : (
        <>
          <ActionForm action={changePricing} label="Create pricing proposal">
            <input type="hidden" name="operation" value="save" />
            <label className="field">
              Versioned configuration JSON
              <textarea
                name="config"
                required
                maxLength={16384}
                rows={14}
                defaultValue={JSON.stringify(
                  {
                    ...data.config,
                    version: data.rows.length
                      ? nextPricingVersion(data.config.version)
                      : data.config.version,
                  },
                  null,
                  2,
                )}
              />
            </label>
            <ReasonField />
          </ActionForm>
          {data.rows.map((r) => (
            <details className="account-row" key={r.id}>
              <summary>
                {r.version} · {r.status} · Revision {r.revision}
              </summary>
              <p className="my-4 break-all">
                Configuration SHA-256: {r.config_sha256}
              </p>
              <pre className="preview-notice whitespace-pre-wrap break-words text-sm">
                {JSON.stringify(r.config, null, 2)}
              </pre>
              {r.status === "proposed" && (
                <>
                  <ActionForm
                    action={changePricing}
                    label="Update proposed configuration"
                  >
                    <input type="hidden" name="operation" value="save" />
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="revision" value={r.revision} />
                    <label className="field">
                      Configuration JSON
                      <textarea
                        name="config"
                        rows={10}
                        maxLength={16384}
                        defaultValue={JSON.stringify(r.config, null, 2)}
                      />
                    </label>
                    <ReasonField />
                  </ActionForm>
                  <ActionForm
                    action={changePricing}
                    label="Approve for sandbox review"
                  >
                    <input type="hidden" name="operation" value="review" />
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="revision" value={r.revision} />
                    <ReasonField />
                  </ActionForm>
                </>
              )}
              {r.status === "reviewed" && (
                <ActionForm
                  action={changePricing}
                  label="Validate & activate sandbox configuration"
                  confirmation="Validate this exact separately owner-approved configuration against test prices and activate sandbox checkout only?"
                >
                  <input type="hidden" name="operation" value="activate" />
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="revision" value={r.revision} />
                  <label className="field">
                    Test price bindings JSON
                    <textarea
                      name="providerPrices"
                      rows={6}
                      required
                      maxLength={2000}
                      placeholder={
                        '{"creator_pro_month":"price_...","creator_pro_year":"price_...","vendor_pro_month":"price_...","vendor_pro_year":"price_..."}'
                      }
                    />
                  </label>
                  <ReasonField />
                </ActionForm>
              )}
            </details>
          ))}
          <h3 className="text-xl mt-8">Refund review</h3>
          {!refunds.length && <p className="my-5">No refund requests.</p>}
          {refunds.map((f) => (
            <article className="account-row" key={f.id}>
              <p>
                {f.id} · {f.status} · USD {(f.amount / 100).toFixed(2)}
              </p>
              <p className="my-4">{f.reason}</p>
              {f.status === "requested" && (
                <ActionForm action={decideRefund} label="Save refund decision">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="revision" value={f.revision} />
                  <label className="field">
                    Decision
                    <select name="decision">
                      <option value="rejected">Reject</option>
                      <option value="approved">Approve full refund</option>
                    </select>
                  </label>
                  <ReasonField />
                </ActionForm>
              )}
              {f.status === "approved" && (
                <ActionForm
                  action={decideRefund}
                  label="Execute approved sandbox refund"
                  confirmation="Refund this approved sandbox payment? Membership cancellation must already be confirmed; editorial history and capabilities will be preserved."
                >
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="operation" value="execute" />
                </ActionForm>
              )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
