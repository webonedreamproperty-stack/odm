import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, LocateFixed, MapPinned } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";
import { getOdListingAreaLabels, normalizeOdListingAreaValue } from "../lib/odListingAreaLocations";
import { reverseGeocodeToAreaLine } from "../lib/reverseGeocodeArea";
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from "./ui/map";

const MAX_RESULTS = 150;

/** Peninsular Malaysia — default map center when no pin yet */
const DEFAULT_MAP_CENTER = { lat: 3.139, lng: 101.6869 };

type OdListingAreaComboboxProps = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  /** Saved listing coordinates (profiles.od_listing_lat / od_listing_lng). */
  listingLat?: number | null;
  listingLng?: number | null;
  onCoordinatesChange?: (lat: number | null, lng: number | null) => void;
  disabled?: boolean;
  className?: string;
};

export const OdListingAreaCombobox: React.FC<OdListingAreaComboboxProps> = ({
  id,
  value,
  onChange,
  listingLat,
  listingLng,
  onCoordinatesChange,
  disabled,
  className,
}) => {
  const labels = useMemo(() => getOdListingAreaLabels(), []);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(value);
  const [locateBusy, setLocateBusy] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapSession, setMapSession] = useState(0);
  const [mapPin, setMapPin] = useState(DEFAULT_MAP_CENTER);
  const [mapApplyBusy, setMapApplyBusy] = useState(false);

  useEffect(() => {
    setQ(normalizeOdListingAreaValue(value));
  }, [value]);

  const openMapPicker = useCallback(() => {
    setLocateError(null);
    if (
      listingLat != null &&
      listingLng != null &&
      Number.isFinite(listingLat) &&
      Number.isFinite(listingLng)
    ) {
      setMapPin({ lat: listingLat, lng: listingLng });
    } else {
      setMapPin(DEFAULT_MAP_CENTER);
    }
    setMapSession((s) => s + 1);
    setMapOpen(true);
  }, [listingLat, listingLng]);

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
        // continue
      }
    }
    setLocateBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const line = await reverseGeocodeToAreaLine(lat, lng);
          if (line) {
            const normalized = normalizeOdListingAreaValue(line);
            onChange(normalized);
            setQ(normalized);
            setOpen(false);
            onCoordinatesChange?.(lat, lng);
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
  }, [onChange, onCoordinatesChange]);

  const handleMapApply = useCallback(async () => {
    setMapApplyBusy(true);
    setLocateError(null);
    try {
      const line = await reverseGeocodeToAreaLine(mapPin.lat, mapPin.lng);
      const areaLine = line
        ? normalizeOdListingAreaValue(line)
        : `${mapPin.lat.toFixed(5)}, ${mapPin.lng.toFixed(5)}`;
      onChange(areaLine);
      setQ(areaLine);
      onCoordinatesChange?.(mapPin.lat, mapPin.lng);
      setMapOpen(false);
    } catch {
      onChange(`${mapPin.lat.toFixed(5)}, ${mapPin.lng.toFixed(5)}`);
      setQ(normalizeOdListingAreaValue(`${mapPin.lat.toFixed(5)}, ${mapPin.lng.toFixed(5)}`));
      onCoordinatesChange?.(mapPin.lat, mapPin.lng);
      setMapOpen(false);
    } finally {
      setMapApplyBusy(false);
    }
  }, [mapPin.lat, mapPin.lng, onChange, onCoordinatesChange]);

  const hasSavedCoords =
    listingLat != null &&
    listingLng != null &&
    Number.isFinite(listingLat) &&
    Number.isFinite(listingLng);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-[min(100%,12rem)]">
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
        <div className="flex shrink-0 gap-2">
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
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={disabled}
            aria-label="Pick on map"
            title="Pick exact location on map"
            onClick={openMapPicker}
          >
            <MapPinned className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
      {hasSavedCoords ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            Pin: {listingLat!.toFixed(6)}, {listingLng!.toFixed(6)}
          </span>
          {onCoordinatesChange ? (
            <button
              type="button"
              className="text-destructive underline-offset-2 hover:text-destructive hover:underline"
              onClick={() => onCoordinatesChange(null, null)}
            >
              Clear coordinates
            </button>
          ) : null}
        </div>
      ) : null}
      {locateError ? <p className="text-xs text-destructive">{locateError}</p> : null}

      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="max-w-lg gap-4">
          <DialogHeader>
            <DialogTitle>Pin your shop on the map</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Drag the pin to your entrance or exact spot. Use zoom and &ldquo;locate&rdquo; if needed, then apply — we
            fill the area line from the coordinates (you can still edit the text after).
          </p>
          {mapOpen ? (
            <div className="relative h-[min(340px,50vh)] w-full min-h-[260px] overflow-hidden rounded-lg border border-border">
              <Map
                key={mapSession}
                theme="light"
                center={[mapPin.lng, mapPin.lat]}
                zoom={16}
                className="absolute inset-0 h-full w-full"
                attributionControl={{ compact: true }}
              >
                <MapControls
                  position="bottom-right"
                  showZoom
                  showLocate
                  onLocate={(c) => setMapPin({ lat: c.latitude, lng: c.longitude })}
                />
                <MapMarker
                  draggable
                  longitude={mapPin.lng}
                  latitude={mapPin.lat}
                  onDragEnd={(ll) => setMapPin({ lat: ll.lat, lng: ll.lng })}
                >
                  <MarkerContent>
                    <div className="relative cursor-grab active:cursor-grabbing">
                      <div className="size-6 rounded-full border-[3px] border-white bg-primary shadow-lg ring-1 ring-black/20" />
                    </div>
                  </MarkerContent>
                  <MarkerPopup>
                    <div className="rounded-md bg-background px-2 py-1.5 text-xs shadow-md ring-1 ring-border">
                      <p className="font-mono text-[11px] tabular-nums text-foreground">
                        {mapPin.lat.toFixed(6)}, {mapPin.lng.toFixed(6)}
                      </p>
                    </div>
                  </MarkerPopup>
                </MapMarker>
              </Map>
            </div>
          ) : null}
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {mapPin.lat.toFixed(6)}, {mapPin.lng.toFixed(6)}
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setMapOpen(false)} disabled={mapApplyBusy}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleMapApply()} disabled={mapApplyBusy}>
              {mapApplyBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Applying…
                </>
              ) : (
                "Use this location"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
