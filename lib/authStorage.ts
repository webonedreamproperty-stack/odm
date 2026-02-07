import { User } from "../types";
import { loadFromStorage, removeFromStorage, saveToStorage } from "./storage";

const USERS_KEY = "cookees.auth.users.v1";
const SESSION_KEY = "cookees.auth.session.v1";

export const loadUsers = (): User[] => {
  return loadFromStorage<User[]>(USERS_KEY) ?? [];
};

export const saveUsers = (users: User[]) => {
  saveToStorage(USERS_KEY, users);
};

export const loadSession = (): { userId: string } | null => {
  return loadFromStorage<{ userId: string }>(SESSION_KEY);
};

export const saveSession = (session: { userId: string }) => {
  saveToStorage(SESSION_KEY, session);
};

export const clearSession = () => {
  removeFromStorage(SESSION_KEY);
};

export const findUserBySlug = (slug: string): User | undefined => {
  return loadUsers().find((user) => (user.role ?? "owner") === "owner" && user.slug === slug);
};
