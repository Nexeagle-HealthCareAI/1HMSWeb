import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  data: string[];                          // Suggestion source
  placeholder?: string;
  onChange?: (tokens: string[], csv: string) => void;  // emits tokens + CSV
  maxSuggestions?: number;                 // default 8
  allowCustom?: boolean;                   // default true
  className?: string;
  label?: string;
  value?: string;                          // Controlled value
  onValueChange?: (value: string) => void; // For controlled mode
};

function normalize(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function splitCSV(s: string) {
  return s
    .split(",")
    .map(t => normalize(t))
    .filter(Boolean);
}

function useOutsideClose(ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

function Highlights({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length) return <>{text}</>;
  const parts: Array<{ str: string; match: boolean }> = [];

  // simple multi-token highlighter
  let i = 0;
  const lower = text.toLowerCase();
  while (i < text.length) {
    let matched = false;
    let matchLen = 0;
    for (const t of tokens) {
      if (!t) continue;
      if (lower.slice(i).startsWith(t.toLowerCase())) {
        matched = true;
        matchLen = Math.max(matchLen, t.length);
      }
    }
    if (matched) {
      parts.push({ str: text.slice(i, i + matchLen), match: true });
      i += matchLen;
    } else {
      parts.push({ str: text[i], match: false });
      i += 1;
    }
  }

  return (
    <>
      {parts.map((p, idx) =>
        p.match ? (
          <mark key={idx} className="rounded bg-yellow-200 px-0.5">{p.str}</mark>
        ) : (
          <span key={idx}>{p.str}</span>
        )
      )}
    </>
  );
}

export default function AdvancedSuggestionInput({
  data,
  placeholder = "Type words… (comma to add)",
  onChange,
  maxSuggestions = 8,
  allowCustom = true,
  className = "",
  label,
  value = "",
  onValueChange
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [tokens, setTokens] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Initialize tokens from value if provided
  useEffect(() => {
    if (value && value !== tokens.join(", ")) {
      const newTokens = splitCSV(value);
      setTokens(newTokens);
    }
  }, [value]);

  const suggestions = useMemo(() => {
    const taken = new Set(tokens.map(normalize));
    const inputNormalized = normalize(input);
    
    // If no input, show all available options (excluding already taken ones)
    if (!input.trim()) {
      return data
        .filter(item => !taken.has(normalize(item)))
        .slice(0, maxSuggestions);
    }
    
    // Filter based only on current input, not existing tokens
    const filtered = data
      .filter(item => {
        const n = normalize(item);
        // Only match against current input, not existing tokens
        return n.includes(inputNormalized);
      })
      .filter(item => !taken.has(normalize(item)))
      .slice(0, maxSuggestions);

    // If no suggestions and user is typing, optionally offer a "create"
    if (
      allowCustom &&
      inputNormalized &&
      !filtered.find(x => normalize(x) === inputNormalized)
    ) {
      return [...filtered, `Create: "${input.trim()}"`];
    }
    return filtered;
  }, [data, tokens, input, maxSuggestions, allowCustom]);

  useOutsideClose(rootRef, () => setOpen(false));

  function emit(next: string[]) {
    const unique = Array.from(new Set(next.map(normalize)));
    setTokens(unique);
    const csv = unique.join(", ");
    onChange?.(unique, csv);
    onValueChange?.(csv);
  }

  function addToken(raw: string) {
    const parts = splitCSV(raw);
    if (!parts.length) return;
    emit([...tokens, ...parts]);
    setInput("");
    setActive(0);
  }

  function removeToken(idx: number) {
    const next = tokens.slice();
    next.splice(idx, 1);
    emit(next);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function chooseSuggestion(index: number) {
    const choice = suggestions[index];
    if (!choice) return;
    if (choice.startsWith('Create: "')) {
      addToken(input);
    } else {
      addToken(choice);
    }
    setOpen(false);
  }

  // handle typing
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const val = (e.target as HTMLInputElement).value;

    if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions.length && suggestions[active]) {
        chooseSuggestion(active);
      } else if (allowCustom && normalize(val)) {
        addToken(val);
      }
    } else if (e.key === "," || e.key === "Tab") {
      if (normalize(val)) {
        e.preventDefault();
        addToken(val);
      }
    } else if (e.key === "Backspace" && !val && tokens.length) {
      e.preventDefault();
      removeToken(tokens.length - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive(a => Math.min(a + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (text.includes(",")) {
      e.preventDefault();
      addToken(text);
    }
  }

  return (
    <div className={`w-full ${className}`} ref={rootRef}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div
        className="flex min-h-[44px] flex-wrap items-center gap-1 rounded-xl border border-gray-300 px-2 py-1 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-colors"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-owns="mw-suggest-list"
      >
        {tokens.map((t, i) => (
          <span
            key={t + i}
            className="flex items-center gap-1 rounded-lg bg-brand-100 px-2 py-1 text-sm text-brand-800"
          >
            {t}
            <button
              type="button"
              onClick={() => removeToken(i)}
              className="rounded p-0.5 text-brand-600 hover:bg-brand-200 transition-colors"
              aria-label={`Remove ${t}`}
            >
              ✕
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          className="flex-1 min-w-[10ch] border-0 outline-none py-1 bg-transparent"
          placeholder={tokens.length === 0 ? placeholder : "Add more..."}
          value={input}
          onChange={(e) => {
            const v = e.target.value;
            setInput(v);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => {
            setOpen(true);
            if (input.trim().length > 0) {
              setActive(0);
            }
          }}
          onPaste={onPaste}
          aria-autocomplete="list"
          aria-controls="mw-suggest-list"
          aria-activedescendant={open ? `mw-opt-${active}` : undefined}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id="mw-suggest-list"
          role="listbox"
          className="mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-white shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-200"
        >
          {suggestions.map((s, i) => {
            const isCreate = s.startsWith('Create: "');
            const display = isCreate ? s : s;
            return (
              <li
                key={display + i}
                id={`mw-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                  i === active ? "bg-brand-100 text-brand-900" : "hover:bg-gray-50"
                }`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  chooseSuggestion(i);
                }}
              >
                {isCreate ? (
                  <span className="text-gray-700 flex items-center gap-2">
                    <span className="text-brand-500">+</span>
                    {display}
                  </span>
                ) : (
                  <span className="text-gray-800">
                    <Highlights text={s} tokens={[input]} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Helper line */}
      <p className="mt-2 text-xs text-gray-500">
        Type to filter. Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> or <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">,</kbd> to add. 
        {tokens.length > 0 && " Suggestions must match all typed words."}
      </p>
    </div>
  );
}
