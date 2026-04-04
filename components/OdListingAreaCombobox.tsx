import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, LocateFixed } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import { getOdListingAreaLabels, normalizeOdListingAreaValue } from "../lib/odListingAreaLocations";
import { reverseGeocodeToAreaLine } from "../lib/reverseGeocodeArea";

const MAX_RESULTS = 150;

type OdListingAreaComboboxProps = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
};

export const OdListingAreaCombobox: React.FC<OdListingAreaComboboxProps> = ({
  id,
  value,
  onChange,
  disabled,
  className,
}) => {
  const labels = useMemo(() => getOdListingAreaLabels(), []);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  const [locateBusy, setLocateBusy] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    setQ(normalizeOdListingAreaValue(value));
  }, [value]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return labels.slice(0, MAX_RESULTS);
    return labels.filter((l) => l.toLowerCase().includes(needle)).slice(0, MAX_RESULTS);
  }, [labels, q]);

  const select = useCallback(
    (label: string) => {
      const normalized = normalizeOdListingAreaValue(label);
      onChange(normalized);
      setQ(normalized);
      setOpen(false);
    },
    [onChange]
  );

  const handleLocate = useCallback(async () => {
    setLocateError(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setLocateError("Location requires a secure context (HTTPS or localhost).");
      return;
    }
    if (!navigator.geolocation) {
      setLocateError("Location is not supported in this browser.");
      return;
    }
    if (navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: "geolocation" });
        if (perm.state === "denied") {
          setLocateError("Location permission is blocked in browser settings.");
          return;
        }
      } catch {
        // Some browsers may not support this query path; continue with getCurrentPosition.
      }
    }
    setLocateBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const line = await reverseGeocodeToAreaLine(pos.coords.latitude, pos.coords.longitude);
          if (line) {
            const normalized = normalizeOdListingAreaValue(line);
            onChange(normalized);
            setQ(normalized);
            setOpen(false);
          } else {
            setLocateError("Could not resolve this position to an area. Type it manually or try again.");
          }
        } catch {
          setLocateError("Address lookup failed. Try again or type your area.");
        } finally {
          setLocateBusy(false);
        }
      },
      (err) => {
        setLocateBusy(false);
        if (err.code === 1) {
          setLocateError("Location permission denied. Allow location for this site or type your area.");
        } else if (err.code === 2) {
          setLocateError("Location unavailable.");
        } else if (err.code === 3) {
          setLocateError("Location request timed out.");
        } else {
          setLocateError("Could not get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [onChange]);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            id={id}
            value={q}
            disabled={disabled}
            onChange={(e) => {
              setLocateError(null);
              setQ(e.target.value.toLowerCase());
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              onChange(normalizeOdListingAreaValue(q));
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setQ(normalizeOdListingAreaValue(value));
                setOpen(false);
              }
              if (e.key === "Enter") {
                e.preventDefault();
                onChange(normalizeOdListingAreaValue(q));
                setOpen(false);
              }
            }}
            autoComplete="off"
            placeholder="Search city or state…"
            className="pr-10"
            aria-autocomplete="list"
            aria-expanded={open}
            role="combobox"
          />
          <ChevronsUpDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-60"
            aria-hidden
          />
          {open && !disabled && (
            <div
              className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-background py-1 text-foreground shadow-md"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-muted-foreground">
                  No matches in the list — your text will still be saved (custom area).
                </p>
              ) : (
                <ul className="p-1">
                  {filtered.map((label) => {
                    const selected = normalizeOdListingAreaValue(value) === normalizeOdListingAreaValue(label);
                    return (
                      <li key={label}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={cn(
                            "flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            selected && "bg-accent/60"
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => select(label)}
                        >
                          {selected ? <Check className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden /> : (
                            <span className="w-3.5 shrink-0" aria-hidden />
                          )}
                          <span className="min-w-0 flex-1">{label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={disabled || locateBusy}
          aria-label="Use my location"
          title="Use my location"
          onClick={() => void handleLocate()}
        >
          {locateBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LocateFixed className="h-4 w-4" aria-hidden />}
        </Button>
      </div>
      {locateError ? <p className="text-xs text-destructive">{locateError}</p> : null}
    </div>
  );
};
