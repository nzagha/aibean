import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { readAdminTool } from "@/lib/admin/queries";
import { verificationStates } from "@/lib/catalog/types";
import { ActionForm } from "@/components/action-form";
import { AdminToolFields } from "@/components/admin-tool-fields";
import { ReasonField } from "@/components/admin-shared";
import {
  editToolDraft,
  changeToolStatus,
  reviewTrust,
  saveRanking,
} from "../../actions";
import { weights } from "@/lib/ranking";
export default async function ToolEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const tool = await readAdminTool(db(), admin.id, id);
  if (!tool) notFound();
  const keys = (
    <>
      <input type="hidden" name="toolId" value={tool.id} />
      <input type="hidden" name="revision" value={tool.revision} />
    </>
  );
  return (
    <>
      <div className="flex flex-wrap gap-5 mb-6">
        <Link
          className="text-link"
          href={"/admin/tools/" + encodeURIComponent(id) + "/preview"}
        >
          Private preview →
        </Link>
        <Link
          className="text-link"
          href={"/admin/audit?entity=" + encodeURIComponent(id)}
        >
          Tool audit history →
        </Link>
      </div>
      <section className="placeholder-card mt-8">
        <h2 className="text-2xl">Organic ranking</h2>
        <p className="my-4 text-muted">
          Version 0.1. Payments, claims, subscriptions and sponsored placements
          are excluded. Context is the general discovery fit; industry-specific
          relevance remains in the Tool editor.
        </p>
        {tool.data.organicRanking && (
          <>
            <p className="font-semibold">
              Current score: {tool.data.organicRanking.score}
            </p>
            <ul className="my-4">
              {tool.data.organicRanking.explanation.map((item) => (
                <li key={item.factor}>
                  {item.factor}: {item.contribution.toFixed(2)}
                </li>
              ))}
            </ul>
          </>
        )}
        <ActionForm action={saveRanking} label="Save ranking decision">
          {keys}
          <div className="grid gap-x-5 sm:grid-cols-2">
            {[...Object.keys(weights), "risk", "adjustment"].map((factor) => (
              <label key={factor} className="field">
                {factor}
                {factor in weights
                  ? ` (${weights[factor as keyof typeof weights] * 100}%)`
                  : ""}
                <input
                  type="number"
                  name={factor}
                  step="0.1"
                  min={factor === "adjustment" ? -20 : 0}
                  max={factor === "adjustment" ? 20 : 100}
                  required
                  defaultValue={
                    tool.data.organicRanking?.factors[
                      factor as keyof import("@/lib/ranking").RankingInputs
                    ] ?? 0
                  }
                />
              </label>
            ))}
          </div>
          <details className="my-5">
            <summary className="cursor-pointer">
              Configure versioned factor weights
            </summary>
            <p className="my-3 text-sm">
              Weights must total 1. Changes create a new recorded formula
              version for this Tool.
            </p>
            <div className="grid gap-x-5 sm:grid-cols-2">
              {Object.entries(weights).map(([factor, defaultWeight]) => (
                <label className="field" key={factor}>
                  {factor} weight
                  <input
                    type="number"
                    name={"weight_" + factor}
                    min={0}
                    max={1}
                    step="0.01"
                    required
                    defaultValue={
                      tool.data.organicRanking?.weights[factor] ?? defaultWeight
                    }
                  />
                </label>
              ))}
            </div>
          </details>
          <ReasonField />
        </ActionForm>
      </section>
      <section className="placeholder-card">
        <h2 className="text-2xl">Edit {tool.name}</h2>
        <p className="my-4 text-muted">
          Current status: {tool.status}. Updates are transactional and require
          an unchanged revision.
        </p>
        <ActionForm action={editToolDraft} label="Save Tool content">
          {keys}
          <AdminToolFields tool={tool.data} />
          <ReasonField />
        </ActionForm>
      </section>
      <div className="grid gap-8 lg:grid-cols-2 mt-8">
        <section className="placeholder-card">
          <h2 className="text-2xl">Publication</h2>
          <ActionForm
            action={changeToolStatus}
            label="Update publication"
            confirmation="Confirm this Tool publication status change?"
          >
            {keys}
            <label className="field">
              Next status
              <select name="status" defaultValue={tool.status}>
                {["draft", "published", "archived"]
                  .filter(
                    (s) => tool.status !== "archived" || s !== "published",
                  )
                  .map((s) => (
                    <option key={s}>{s}</option>
                  ))}
              </select>
            </label>
            <p className="text-sm text-muted">
              Archived Tools must return to draft before publication.
              Publication validates the complete listing.
            </p>
            <ReasonField />
          </ActionForm>
        </section>
        <section className="placeholder-card">
          <h2 className="text-2xl">Verification & freshness</h2>
          <ActionForm action={reviewTrust} label="Save trust decision">
            {keys}
            <label className="field">
              Verification state
              <select name="verification" defaultValue={tool.data.verification}>
                {verificationStates.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Check date
              <input
                type="date"
                name="checkedOn"
                defaultValue={tool.data.lastVerified?.slice(0, 10) || ""}
              />
            </label>
            <label className="field">
              Supporting evidence URL
              <input type="url" name="evidence" maxLength={2000} />
            </label>
            <label className="flex gap-3 my-5 items-start">
              <input
                type="checkbox"
                name="verified"
                defaultChecked={tool.data.verified}
              />
              Award the separate aiBean Verified badge
            </label>
            <label className="field">
              Verification checklist completed
              <textarea name="checklist" maxLength={2000} />
              <span className="text-xs text-muted">
                Required with human review when awarding aiBean Verified; record
                at least 30 characters of completed checks. Payment and
                ownership do not award this badge.
              </span>
            </label>
            <ReasonField />
          </ActionForm>
        </section>
      </div>
    </>
  );
}
