"use client";
import { useState } from "react";
export function PlaybookSteps({
  initial,
}: {
  initial: { title: string; instruction: string }[];
}) {
  const [steps, setSteps] = useState(
    initial.length ? initial : [{ title: "", instruction: "" }],
  );
  const update = (
    index: number,
    field: "title" | "instruction",
    value: string,
  ) =>
    setSteps((old) =>
      old.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  const move = (index: number, delta: number) =>
    setSteps((old) => {
      const next = [...old];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  return (
    <fieldset className="my-5">
      <legend className="text-xl">Ordered workflow steps</legend>
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />
      {steps.map((step, index) => (
        <div className="account-row" key={index}>
          <label className="field">
            Step {index + 1} title
            <input
              value={step.title}
              onChange={(e) => update(index, "title", e.target.value)}
              required
              minLength={3}
              maxLength={150}
            />
          </label>
          <label className="field">
            Instructions
            <textarea
              value={step.instruction}
              onChange={(e) => update(index, "instruction", e.target.value)}
              required
              minLength={20}
              maxLength={3000}
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              className="text-link"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={"Move step " + (index + 1) + " up"}
            >
              Move up
            </button>
            <button
              type="button"
              className="text-link"
              disabled={index === steps.length - 1}
              onClick={() => move(index, 1)}
              aria-label={"Move step " + (index + 1) + " down"}
            >
              Move down
            </button>
            <button
              type="button"
              className="text-link"
              disabled={steps.length === 1}
              onClick={() =>
                setSteps((old) => old.filter((_, i) => i !== index))
              }
              aria-label={"Remove step " + (index + 1)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="button secondary mt-5"
        disabled={steps.length >= 40}
        onClick={() =>
          setSteps((old) => [...old, { title: "", instruction: "" }])
        }
      >
        Add step
      </button>
    </fieldset>
  );
}
