"use client";
import { m } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { codeProblem } from "@/lib/game";
import { haptic } from "@/lib/toast";

interface Props {
  length: number;
  submitLabel: string;
  onSubmit: (code: string) => void;
  /** Called when the player tries something invalid (e.g. a repeated digit via keyboard). */
  onInvalid?: (why: "repeat" | "length") => void;
  disabled?: boolean;
  /** Show digits as dots with an eye toggle (used for secrets). */
  masked?: boolean;
  /** Shake + red flash on the slots (set by parent after a 0-0 result). */
  shakeKey?: number;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;
/** Key height shrinks on short screens so the pad + Shoot stay on-screen. */
const KEY_H = "h-14 [@media(max-height:700px)]:h-12";

export default function CodeInput({ length, submitLabel, onSubmit, onInvalid, disabled, masked, shakeKey }: Props) {
  const [value, setValue] = useState("");
  const [peek, setPeek] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const add = useCallback(
    (d: string) => {
      if (disabled) return;
      setValue((v) => {
        if (v.length >= length) return v;
        if (v.includes(d)) {
          onInvalid?.("repeat");
          haptic(40);
          return v;
        }
        return v + d;
      });
    },
    [disabled, length, onInvalid],
  );
  const back = useCallback(() => setValue((v) => v.slice(0, -1)), []);
  const clear = useCallback(() => setValue(""), []);
  const submit = useCallback(() => {
    if (disabled) return;
    if (codeProblem(value, length)) return onInvalid?.("length");
    onSubmit(value);
    setValue("");
  }, [disabled, value, length, onSubmit, onInvalid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (/^\d$/.test(e.key)) add(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Escape" || e.key === "Delete") clear();
      else if (e.key === "Enter") {
        // don't hijack Enter on links/buttons elsewhere on the page (Home, Mute...)
        if (t && !root.current?.contains(t) && t.closest("a,button,[role=button]")) return;
        submit();
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [add, back, clear, submit]);

  const shown = masked && !peek;

  return (
    <div ref={root} role="group" aria-label="Enter your code" className="w-full max-w-sm mx-auto select-none">
      <p className="sr-only" aria-live="polite">
        {value.length} of {length} digits entered{!shown && value ? `: ${value.split("").join(" ")}` : ""}
      </p>
      <div key={shakeKey} className={`flex items-center justify-center gap-1.5 mb-3 ${shakeKey ? "shake" : ""}`} aria-hidden>
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={`font-num flex-1 min-w-0 max-w-14 aspect-[4/5] rounded-2xl border-4 flex items-center justify-center text-3xl font-black bg-ink ${
              i === value.length ? "border-gold" : "border-white/20"
            }`}
          >
            {value[i] ? (
              <m.span key={value[i]} className="inline-block" initial={{ scale: 0.2, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 600, damping: 16 }}>
                {shown ? "●" : value[i]}
              </m.span>
            ) : i === value.length ? (
              <span className="cursor-blink text-gold/80">|</span>
            ) : (
              ""
            )}
          </div>
        ))}
        {masked && (
          <button type="button" className="shrink-0 w-11 h-11 text-2xl rounded-xl bg-panel2 border-2 border-black" onClick={() => setPeek((p) => !p)} aria-label={peek ? "Hide code" : "Show code"} aria-pressed={peek}>
            {peek ? "🙈" : "👁️"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => {
          if (k === "clear")
            return (
              <button key={k} className={`btn btn-dark ${KEY_H} text-lg`} onClick={clear} disabled={disabled}>
                Clear
              </button>
            );
          if (k === "back")
            return (
              <button key={k} className={`btn btn-dark ${KEY_H} text-2xl`} onClick={back} disabled={disabled} aria-label="Backspace">
                ⌫
              </button>
            );
          const used = value.includes(k);
          return (
            <button
              key={k}
              className={`btn ${KEY_H} text-3xl font-num ${used ? "btn-dark opacity-30" : "btn-green"}`}
              onClick={() => add(k)}
              disabled={disabled || used}
            >
              {k}
            </button>
          );
        })}
      </div>

      <button
        className={`btn btn-gold w-full h-14 [@media(max-height:700px)]:h-12 mt-2.5 text-2xl font-display ${value.length === length ? "pulse-ready" : ""}`}
        onClick={submit}
        disabled={disabled || value.length !== length}
      >
        {submitLabel}
      </button>
    </div>
  );
}
