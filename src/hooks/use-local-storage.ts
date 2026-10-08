"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";

// Hydration always starts with the server fallback. Storage failures leave the
// interactions usable in memory and never claim that progress was saved.
export function useLocalStorage<T>(
  key: string,
  initial: T,
  parse: (value: unknown) => T,
) {
  const [value, setValue] = useState(initial);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [restored, setRestored] = useState(false);
  const current = useRef(initial);
  const initialRef = useRef(initial);
  const parseRef = useRef(parse);
  useEffect(() => {
    parseRef.current = parse;
  }, [parse]);
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(key);
        const next = raw
          ? parseRef.current(JSON.parse(raw))
          : initialRef.current;
        current.current = next;
        setValue(next);
        setRestored(Boolean(raw));
        setAvailable(true);
      } catch {
        current.current = initialRef.current;
        setValue(initialRef.current);
        setRestored(false);
        setAvailable(false);
      }
      setReady(true);
    }
    read();
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) read();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  const update = useCallback(
    (next: SetStateAction<T>) => {
      const nextValue = parseRef.current(
        typeof next === "function"
          ? (next as (previous: T) => T)(current.current)
          : next,
      );
      current.current = nextValue;
      setValue(nextValue);
      try {
        localStorage.setItem(key, JSON.stringify(nextValue));
        setAvailable(true);
      } catch {
        setAvailable(false);
      }
    },
    [key],
  );
  return { value, setValue: update, ready, available, restored };
}
