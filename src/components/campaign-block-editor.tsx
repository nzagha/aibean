"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import {
  editCampaignBlocks,
  takeCampaignOffline,
} from "@/app/creator-enhancement-actions";
import type { CampaignBlock } from "@/lib/creator-enhancements/contracts";
type Option = { kind: CampaignBlock["kind"]; id: string; title: string };
export function CampaignBlockEditor({
  id,
  revision,
  initial,
  options,
  admin,
  status,
}: {
  id: string;
  revision: string;
  initial: CampaignBlock[];
  options: Option[];
  admin: boolean;
  status: string;
}) {
  const [blocks, setBlocks] = useState(initial),
    [selection, setSelection] = useState("text"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState("");
  const move = (index: number, delta: number) =>
    setBlocks((prev) => {
      const next = [...prev];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  const add = () => {
    const option = options.find((o) => o.kind + ":" + o.id === selection);
    if (!title.trim() || blocks.length >= 40) return;
    setBlocks((prev) => [
      ...prev,
      {
        kind: option?.kind || "text",
        targetId: option?.id || null,
        title,
        description,
      },
    ]);
    setTitle("");
    setDescription("");
  };
  return (
    <>
      <ActionForm
        action={editCampaignBlocks}
        label="Save ordered campaign draft"
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="revision" value={revision} />
        <input type="hidden" name="admin" value={String(admin)} />
        <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
        <ol>
          {blocks.map((b, i) => (
            <li className="account-row" key={i}>
              <p>
                {i + 1}. {b.title} · {b.kind}
              </p>
              <p className="text-sm my-3">{b.description}</p>
              <div className="flex gap-3 flex-wrap">
                <button
                  className="text-link"
                  type="button"
                  disabled={!i}
                  onClick={() => move(i, -1)}
                  aria-label={"Move " + b.title + " up"}
                >
                  Move up
                </button>
                <button
                  className="text-link"
                  type="button"
                  disabled={i === blocks.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label={"Move " + b.title + " down"}
                >
                  Move down
                </button>
                <button
                  className="text-link"
                  type="button"
                  onClick={() =>
                    setBlocks((prev) => prev.filter((_, n) => n !== i))
                  }
                  aria-label={"Remove " + b.title}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
        <label className="field">
          Canonical content
          <select
            value={selection}
            onChange={(e) => setSelection(e.target.value)}
          >
            <option value="text">Description only</option>
            {options
              .filter((o) => !(o.kind === "resources" && o.id === id))
              .map((o) => (
                <option key={o.kind + o.id} value={o.kind + ":" + o.id}>
                  {o.kind}: {o.title}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          Block title
          <input
            value={title}
            maxLength={150}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          Description / image alternative text
          <textarea
            value={description}
            maxLength={3000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button
          className="button secondary my-4"
          type="button"
          onClick={add}
          disabled={title.trim().length < 2 || blocks.length >= 40}
        >
          Add block
        </button>
        <p className="text-sm" role="status">
          {blocks.length}/40 blocks. Referenced content must remain public and
          eligible. Images use existing approved private files.
        </p>
        {admin && (
          <label className="field">
            Editorial reason
            <textarea name="reason" required minLength={5} maxLength={1000} />
          </label>
        )}
      </ActionForm>
      {!admin && status === "published" && (
        <ActionForm
          action={takeCampaignOffline}
          label="Unpublish campaign"
          confirmation="Unpublish this campaign and preserve its content as a draft?"
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="revision" value={revision} />
        </ActionForm>
      )}
    </>
  );
}
