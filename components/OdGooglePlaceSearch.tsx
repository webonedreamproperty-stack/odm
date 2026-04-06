import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { normalizeOdListingAreaValue } from "../lib/odListingAreaLocations";
import {
  GooglePlacesSearchError,
  searchGooglePlacesText,
  type GooglePlaceSearchResult,
} from "../lib/googlePlacesSearch";

type OdGooglePlaceSearchProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  listingLat?: number | null;
  listingLng?: number | null;
  onCoordinatesChange?: (lat: number | null, lng: number | null) => void;
  onMapsUrlChange?: (url: string) => void;
  /** Google Place ID (Places API New) when user picks a search result. */
  onGooglePlaceIdChange?: (placeId: string | null) => void;
  disabled?: boolean;
  className?: string;
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";

export const OdGooglePlaceSearch: React.FC<OdGooglePlaceSearchProps> = ({
  id,
  value,
  onChange,
  listingLat,
  listingLng,
  onCoordinatesChange,
  onMapsUrlChange,
  onGooglePlaceIdChange,
  disabled,
  className,
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GooglePlaceSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleSearch = useCallback(async () => {
    if (disabled || busy) return;
    if (!GOOGLE_MAPS_API_KEY) {
      setError("Missing VITE_GOOGLE_MAPS_API_KEY.");
      setOpen(false);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError("Type at least 2 characters to search.");
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const items = await searchGooglePlacesText(q, GOOGLE_MAPS_API_KEY, "MY");
      setResults(items);
      setOpen(true);
      if (items.length === 0) {
        setError("No matches found. Try a more specific place name.");
      }
    } catch (e) {
      setResults([]);
      setOpen(false);
      if (e instanceof GooglePlacesSearchError) {
        setError(e.message);
      } else {
        setError("Could not search places right now.");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, disabled, query]);

  const pinText = useMemo(() => {
    if (
      listingLat != null &&
      listingLng != null &&
      Number.isFinite(listingLat) &&
      Number.isFinite(listingLng)
    ) {
      return `${listingLat.toFixed(6)}, ${listingLng.toFixed(6)}`;
    }
    return null;
  }, [listingLat, listingLng]);

  const handleSelect = (item: GooglePlaceSearchResult) => {
    onChange(normalizeOdListingAreaValue(item.name));
    onGooglePlaceIdChange?.(item.id || null);
    if (item.latitude != null && item.longitude != null) {
      onCoordinatesChange?.(item.latitude, item.longitude);
    }
    if (item.googleMapsUri) {
      onMapsUrlChange?.(item.googleMapsUri);
    }
    setQuery(item.name);
    setOpen(false);
    setError(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(normalizeOdListingAreaValue(e.target.value));
            setOpen(false);
            setError(null);
          }}
          onFocus={() => setError(null)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
            onChange(normalizeOdListingAreaValue(query));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSearch();
            }
          }}
          disabled={disabled}
          autoComplete="off"
          placeholder="Search your business or neighbourhood…"
          className="pl-9"
        />
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => void handleSearch()}
          disabled={disabled || busy}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {open && !disabled ? (
        <div className="rounded-md border border-input bg-background shadow-sm">
          <ul className="max-h-72 overflow-auto p-1">
            {results.map((r) => (
              <li key={r.id}>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-sm px-2 py-2 text-left"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(r)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    {r.formattedAddress ? (
                      <p className="truncate text-xs text-muted-foreground">{r.formattedAddress}</p>
                    ) : null}
                  </div>
                </Button>
              </li>
            ))}
            {!busy && results.length === 0 ? (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                Type your query, then click Search.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {pinText ? <p className="text-xs text-muted-foreground">Selected coordinates: <span className="font-mono">{pinText}</span></p> : null}
      {error ? <p className="text-xs text-muted-foreground">{error}</p> : null}
    </div>
  );
};
