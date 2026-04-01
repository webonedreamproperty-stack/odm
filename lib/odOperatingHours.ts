import type { OdOperatingHoursState } from '../types';

/** Weekdays 8–6, weekend closed (common retail default). */
export const DEFAULT_OD_OPERATING_HOURS: OdOperatingHoursState = {
  weekdayOpen: '08:00',
  weekdayClose: '18:00',
  satClosed: true,
  sunClosed: true,
};

export function normalizeOdOperatingHours(raw: unknown): OdOperatingHoursState {
  const d = DEFAULT_OD_OPERATING_HOURS;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ...d };
  }
  const o = raw as Record<string, unknown>;
  return {
    weekdayOpen: typeof o.weekdayOpen === 'string' ? o.weekdayOpen : d.weekdayOpen,
    weekdayClose: typeof o.weekdayClose === 'string' ? o.weekdayClose : d.weekdayClose,
    satClosed: o.satClosed !== false,
    sunClosed: o.sunClosed !== false,
    satOpen: typeof o.satOpen === 'string' ? o.satOpen : undefined,
    satClose: typeof o.satClose === 'string' ? o.satClose : undefined,
    sunOpen: typeof o.sunOpen === 'string' ? o.sunOpen : undefined,
    sunClose: typeof o.sunClose === 'string' ? o.sunClose : undefined,
  };
}
