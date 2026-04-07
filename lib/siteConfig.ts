const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, "");

const configuredAppUrl = import.meta.env.VITE_APP_URL?.trim();
const configuredSupportEmail = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
const demoWorkspaceFlag = import.meta.env.VITE_ENABLE_DEMO_WORKSPACE?.trim().toLowerCase();

export const APP_ORIGIN = normalizeOrigin(configuredAppUrl || "https://odmember.co");
export const SUPPORT_EMAIL = configuredSupportEmail || "hello@odmember.co";
export const SALES_EMAIL = "hello@odmember.co";
export const DEMO_WORKSPACE_ENABLED = import.meta.env.DEV
  ? demoWorkspaceFlag !== "false"
  : demoWorkspaceFlag === "true";

export const buildAppUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_ORIGIN}${normalizedPath}`;
};
