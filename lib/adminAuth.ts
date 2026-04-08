const ADMIN_SESSION_KEY = "od_admin_session";

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";
const DEFAULT_ADMIN_EMAIL = "admin@odmember.co";

export const getAdminUsername = () => import.meta.env.VITE_ADMIN_USERNAME ?? DEFAULT_ADMIN_USERNAME;
export const getAdminPassword = () => import.meta.env.VITE_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
export const getAdminEmail = () => import.meta.env.VITE_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;

export const isAdminAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_SESSION_KEY) === "1";
};

export const setAdminAuthenticated = (isAuthenticated: boolean): void => {
  if (typeof window === "undefined") return;
  if (isAuthenticated) {
    window.localStorage.setItem(ADMIN_SESSION_KEY, "1");
    return;
  }
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
};

