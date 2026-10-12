"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { editPresentation } from "@/app/creator-enhancement-actions";
import type { Presentation } from "@/lib/creator-enhancements/contracts";
export function CreatorPresentationForm({
  revision,
  initial,
  images,
}: {
  revision: string;
  initial: Presentation;
  images: { id: string; title: string }[];
}) {
  const [p, setP] = useState(initial);
  const set = <K extends keyof Presentation>(k: K, v: Presentation[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));
  return (
    <ActionForm
      action={editPresentation}
      label="Save presentation as private draft"
    >
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="presentation" value={JSON.stringify(p)} />
      <label className="field">
        Headline
        <input
          value={p.headline}
          maxLength={160}
          onChange={(e) => set("headline", e.target.value)}
        />
      </label>
      {(["avatar", "cover"] as const).map((slot) => (
        <fieldset className="my-5" key={slot}>
          <legend className="font-semibold capitalize">{slot} image</legend>
          <label className="field">
            Approved image
            <select
              value={
                p[(slot + "FileId") as "avatarFileId" | "coverFileId"] || ""
              }
              onChange={(e) =>
                set(
                  (slot + "FileId") as "avatarFileId" | "coverFileId",
                  e.target.value || null,
                )
              }
            >
              <option value="">No image</option>
              {images.map((i) => (
                <option value={i.id} key={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Alternative text
            <input
              value={p[(slot + "Alt") as "avatarAlt" | "coverAlt"]}
              maxLength={200}
              onChange={(e) =>
                set((slot + "Alt") as "avatarAlt" | "coverAlt", e.target.value)
              }
            />
          </label>
        </fieldset>
      ))}
      <h3 className="text-xl my-5">Biography sections</h3>
      {p.biography.map((b, i) => (
        <fieldset className="account-row" key={i}>
          <legend>Section {i + 1}</legend>
          <label className="field">
            Section title
            <input
              required
              minLength={2}
              maxLength={80}
              value={b.title}
              onChange={(e) =>
                set(
                  "biography",
                  p.biography.map((s, n) =>
                    n === i ? { ...s, title: e.target.value } : s,
                  ),
                )
              }
            />
          </label>
          <label className="field">
            Biography
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={b.body}
              onChange={(e) =>
                set(
                  "biography",
                  p.biography.map((s, n) =>
                    n === i ? { ...s, body: e.target.value } : s,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="text-link"
            onClick={() =>
              set(
                "biography",
                p.biography.filter((_, n) => n !== i),
              )
            }
          >
            Remove section {i + 1}
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="button secondary my-5"
        disabled={p.biography.length >= 6}
        onClick={() =>
          set("biography", [...p.biography, { title: "", body: "" }])
        }
      >
        Add biography section
      </button>
      <h3 className="text-xl my-5">Social links</h3>
      {p.socials.map((s, i) => (
        <fieldset className="account-row" key={i}>
          <legend>Social link {i + 1}</legend>
          <label className="field">
            Network
            <select
              value={s.network}
              onChange={(e) =>
                set(
                  "socials",
                  p.socials.map((t, n) =>
                    n === i
                      ? { ...t, network: e.target.value as typeof s.network }
                      : t,
                  ),
                )
              }
            >
              {[
                "linkedin",
                "youtube",
                "github",
                "instagram",
                "x",
                "bluesky",
              ].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Public HTTPS URL
            <input
              required
              type="url"
              maxLength={2000}
              value={s.url}
              onChange={(e) =>
                set(
                  "socials",
                  p.socials.map((t, n) =>
                    n === i ? { ...t, url: e.target.value } : t,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            className="text-link"
            onClick={() =>
              set(
                "socials",
                p.socials.filter((_, n) => n !== i),
              )
            }
          >
            Remove social link {i + 1}
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="button secondary my-5"
        disabled={p.socials.length >= 6}
        onClick={() =>
          set("socials", [
            ...p.socials,
            {
              network:
                (
                  [
                    "linkedin",
                    "youtube",
                    "github",
                    "instagram",
                    "x",
                    "bluesky",
                  ] as const
                ).find((n) => !p.socials.some((s) => s.network === n)) ||
                "linkedin",
              url: "",
            },
          ])
        }
      >
        Add social link
      </button>
    </ActionForm>
  );
}
