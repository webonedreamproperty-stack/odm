import React from "react";
import { MapPin, Store } from "lucide-react";
import { Map, MapControls, MapMarker, MarkerContent } from "../ui/map";

/** Decorative pins showing OD presence across Peninsular Malaysia (illustrative). */
const PREVIEW_PINS: { lng: number; lat: number; label: string }[] = [
  { lng: 101.6869, lat: 3.139, label: "Kuala Lumpur" },
  { lng: 100.3327, lat: 5.4164, label: "Penang" },
  { lng: 103.7634, lat: 1.4927, label: "Johor Bahru" },
];

/**
 * Mapcn-style Map (MapLibre + shadcn controls) inside a Google-Material-inspired card frame.
 */
const OdLandingMapPreview: React.FC = () => {
  return (
    <div
      className="overflow-hidden rounded-[28px] bg-white"
      style={{
        boxShadow:
          "0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)",
      }}
    >
      <div className="border-b border-[#dadce0] bg-white px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]">
            <MapPin className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-medium leading-tight tracking-tight text-[#202124]">
              Partner network
            </p>
            <p className="mt-0.5 text-sm leading-snug text-[#5f6368]">
              Discover participating shops across Malaysia — verify your OD status in store.
            </p>
          </div>
        </div>
      </div>
      <div className="relative h-[min(320px,42vw)] min-h-[240px] w-full bg-[#f8f9fa]">
        <Map
          className="absolute inset-0 h-full w-full"
          theme="light"
          styles={{
            light: "https://tiles.openfreemap.org/styles/bright",
            dark: "https://tiles.openfreemap.org/styles/bright",
          }}
          center={[102.2, 3.8]}
          zoom={5.9}
          minZoom={4}
          maxZoom={12}
          scrollZoom={true}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
        >
          <MapControls position="bottom-right" showZoom showCompass={false} showLocate={false} />
          {PREVIEW_PINS.map((pin) => (
            <MapMarker key={pin.label} longitude={pin.lng} latitude={pin.lat}>
              <MarkerContent>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#059669] text-white shadow-md ring-2 ring-white"
                  title={pin.label}
                >
                  <Store className="h-4 w-4" aria-hidden />
                </div>
              </MarkerContent>
            </MapMarker>
          ))}
        </Map>
      </div>
      <p className="border-t border-[#dadce0] px-4 py-2 text-center text-[11px] text-[#80868b]">
        Map is illustrative. Exact locations appear in the member app after you join.
      </p>
    </div>
  );
};

export default OdLandingMapPreview;
