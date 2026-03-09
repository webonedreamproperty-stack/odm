import { ICON_REGISTRY } from "./iconRegistry";
import type { IssuedCard, StoredTemplate, Template, ThemeColors } from "../types";
import { extractHex, extractIntensity } from "./utils";

const iconKeyByRef = new Map(Object.entries(ICON_REGISTRY).map(([key, icon]) => [icon, key]));

export const toStoredTemplate = (template: Template): StoredTemplate => {
  const { icon, ...rest } = template;
  const iconKey = iconKeyByRef.get(icon) ?? "cookie";
  return { ...rest, isEnabled: rest.isEnabled ?? true, iconKey };
};

const normalizeHex = (value?: string, fallback?: string) => {
  if (!value) return fallback;
  const hex = extractHex(value);
  if (hex) return hex;
  if (value.includes("white")) return "#ffffff";
  if (value.includes("black")) return "#000000";
  return fallback ?? value;
};

const normalizeColors = (colors: ThemeColors) => {
  const textHex = normalizeHex(colors.text, "#111111");
  return {
    background: normalizeHex(colors.background, "#ffffff"),
    cardBackground: normalizeHex(colors.cardBackground, "#ffffff"),
    text: textHex,
    muted: normalizeHex(colors.muted, textHex),
    stampActive: normalizeHex(colors.stampActive, "#111111"),
    stampInactive: normalizeHex(colors.stampInactive, "#dddddd"),
    iconActive: normalizeHex(colors.iconActive, textHex),
    iconInactive: normalizeHex(colors.iconInactive, "#888888"),
    button: normalizeHex(colors.button, "#111111"),
    buttonText: normalizeHex(colors.buttonText, "#ffffff"),
    border: normalizeHex(colors.border, "#e5e7eb")
  };
};

export const fromStoredTemplate = (stored: StoredTemplate): Template => {
  const icon = ICON_REGISTRY[stored.iconKey] ?? ICON_REGISTRY.cookie;
  const backgroundOpacity = stored.backgroundOpacity ?? extractIntensity(stored.colors?.background);
  return {
    ...stored,
    isEnabled: stored.isEnabled ?? true,
    icon,
    backgroundOpacity: backgroundOpacity ?? 100,
    colors: normalizeColors(stored.colors)
  };
};

export const resolveCardTemplate = (card: IssuedCard, campaigns: Template[]): Template | undefined => {
  if (card.templateSnapshot) return fromStoredTemplate(card.templateSnapshot);
  const fromCampaign = campaigns.find((c) => c.id === card.campaignId);
  if (fromCampaign) return fromCampaign;
  return undefined;
};
