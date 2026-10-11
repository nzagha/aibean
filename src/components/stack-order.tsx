"use client";
import { useState } from "react";
export function StackOrder({
  members,
}: {
  members: { id: string; name: string }[];
}) {
  const [items, setItems] = useState(members);
  const move = (index: number, delta: number) =>
    setItems((old) => {
      const next = [...old];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  return (
    <>
      <input
        type="hidden"
        name="orderedToolIds"
        value={items.map((t) => t.id).join("\n")}
      />
      <ol className="my-5 space-y-4">
        {items.map((t, i) => (
          <li key={t.id} className="flex flex-wrap gap-4 items-center">
            <span>
              {i + 1}. {t.name}
            </span>
            <button
              type="button"
              className="text-link"
              disabled={i === 0}
              aria-label={"Move " + t.name + " earlier"}
              onClick={() => move(i, -1)}
            >
              Move up
            </button>
            <button
              type="button"
              className="text-link"
              disabled={i === items.length - 1}
              aria-label={"Move " + t.name + " later"}
              onClick={() => move(i, 1)}
            >
              Move down
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}
