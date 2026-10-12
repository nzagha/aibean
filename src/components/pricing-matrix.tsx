import Link from "next/link";
import {
  dollars,
  feeQuote,
  type PricingConfig,
  quotaKeys,
  quotaLabels,
} from "@/lib/pricing/config";
import { ActionForm } from "./action-form";
import { checkout } from "@/app/commerce/actions";
export function PricingMatrix({
  config,
  chargeable = false,
  user,
  eligible = [],
}: {
  config: PricingConfig;
  chargeable?: boolean;
  user?: string;
  eligible?: string[];
}) {
  return (
    <>
      <p className="preview-notice my-6">
        Proposed / Preview
        {chargeable ? " · Approved sandbox configuration" : ""} ·{" "}
        {config.version} · No live charges. Editorial decisions, ownership,
        verification and organic rank remain independent.
      </p>
      <div className="grid gap-6 md:grid-cols-3 mt-8">
        {config.plans.map((p) => (
          <article key={p.id} className="placeholder-card">
            <h2 className="text-2xl">{p.name}</h2>
            <p className="my-5">
              {p.monthly
                ? `${dollars(p.monthly)}/month or ${dollars(p.annual)}/year`
                : "$0 · Free membership"}
            </p>
            <p className="text-sm">
              {p.monthly
                ? `Annual saves ${dollars(p.monthly * 12 - p.annual)} compared with twelve monthly payments.`
                : "No payment required."}
            </p>
            <dl className="my-5">
              {quotaKeys.map((k) => (
                <div key={k} className="my-2">
                  <dt>{quotaLabels[k]}</dt>
                  <dd>
                    {k === "storageBytes" ? p.quotas[k] / 1048576 : p.quotas[k]}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="my-4">
              Submission {p.discounts.submission / 100}% · edit{" "}
              {p.discounts.edit / 100}% · verification{" "}
              {p.discounts.verification / 100}% discount. Discounts do not
              stack. Claim and Featured fees are unchanged.
            </p>
            {p.monthly > 0 &&
            chargeable &&
            user &&
            eligible.includes(p.family) ? (
              <ActionForm
                action={checkout}
                label="Prepare sandbox membership checkout"
              >
                <input
                  type="hidden"
                  name="kind"
                  value={p.family + "_subscription"}
                />
                <input type="hidden" name="subjectId" value={user} />
                <input type="hidden" name="planId" value={p.id} />
                <label className="field">
                  Billing period
                  <select name="interval">
                    <option value="month">
                      Monthly · {dollars(p.monthly)}
                    </option>
                    <option value="year">Annual · {dollars(p.annual)}</option>
                  </select>
                </label>
              </ActionForm>
            ) : p.monthly > 0 ? (
              <p className="text-sm my-4">
                {chargeable
                  ? "Existing approved " + p.family + " access is required."
                  : "Preview only — checkout awaits separate approval and verified test prices."}
              </p>
            ) : null}
          </article>
        ))}
      </div>
      <section className="placeholder-card mt-8">
        <h2 className="text-2xl">Request fees & shared benefits</h2>
        <div
          className="compare-scroll"
          role="region"
          aria-label="Plan request fees"
          tabIndex={0}
        >
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Request</th>
                {config.plans.map((p) => (
                  <th key={p.id} scope="col">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  "submission",
                  "edit",
                  "verification",
                  "claim",
                  "featured",
                ] as const
              ).map((k) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  {config.plans.map((p) => (
                    <td key={p.id}>
                      {dollars(feeQuote(config, k, [p.id]).amount)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="my-5">
          Public browsing, personal saves, 2–4 Tool comparisons, follows,
          reviews, approved content reading and {config.analyticsDays}-day
          recorded engagement reporting remain free within account/capability
          limits. Creator approval and per-Tool Vendor ownership are still
          required. No premium verification badge or guaranteed traffic.
        </p>
        <p>
          Upgrades from Free activate only after verified payment. Downgrades
          cancel at period end; existing content is preserved. Monthly/annual
          changes take effect at the next paid renewal, with no proration.
          Seven-day refund requests require independent review; no automatic
          refund.
        </p>
        <Link
          href="/account/membership"
          className="text-link inline-block mt-5"
        >
          Your usage & membership →
        </Link>
      </section>
    </>
  );
}
