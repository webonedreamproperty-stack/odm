import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { User } from "../types";
import { clearSession, loadSession, loadUsers, saveSession, saveUsers } from "../lib/authStorage";
import { isSlugValid, normalizeSlug } from "../lib/slug";

type AuthResult = { ok: true; user?: User } | { ok: false; error: string };

interface AuthContextValue {
  currentUser: User | null;
  currentOwner: User | null;
  isOwner: boolean;
  isStaff: boolean;
  isVerified: boolean;
  staffAccounts: User[];
  login: (email: string, password: string) => AuthResult;
  loginStaff: (email: string, pin: string, orgId: string) => AuthResult;
  signup: (payload: {
    businessName: string;
    email: string;
    password: string;
    slug: string;
  }) => AuthResult;
  loginDemo: () => void;
  createStaff: (payload: {
    name: string;
    email: string;
    pin: string;
  }) => AuthResult;
  updateStaffPin: (staffId: string, pin: string) => AuthResult;
  setStaffAccess: (staffId: string, access: "active" | "disabled") => void;
  logout: () => void;
  verifyAccount: () => void;
  isSlugAvailable: (slug: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const normalizeUser = (user: User): User => {
  const role = user.role ?? "owner";
  return {
    ...user,
    role,
    access: user.access ?? "active",
    status: user.status ?? "verified",
    slug: role === "owner" ? user.slug ?? "" : user.slug,
  };
};

const normalizeUsers = (users: User[]) => users.map((user) => normalizeUser(user));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => normalizeUsers(loadUsers()));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const session = loadSession();
    if (!session) return null;
    const existing = normalizeUsers(loadUsers()).find((user) => user.id === session.userId);
    return existing ?? null;
  });

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      saveSession({ userId: currentUser.id });
    } else {
      clearSession();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const refreshed = users.find((user) => user.id === currentUser.id);
    if (refreshed && refreshed !== currentUser) {
      setCurrentUser(refreshed);
    }
  }, [users, currentUser]);

  const currentOwner = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role === "owner") return currentUser;
    return users.find((user) => user.id === currentUser.ownerId) ?? null;
  }, [currentUser, users]);

  const staffAccounts = useMemo(() => {
    if (!currentOwner) return [];
    return users.filter((user) => user.role === "staff" && user.ownerId === currentOwner.id);
  }, [users, currentOwner]);

  const login = (email: string, password: string): AuthResult => {
    const normalizedEmail = email.trim().toLowerCase();
    const match = users.find(
      (user) => user.email.toLowerCase() === normalizedEmail && user.password === password
    );
    if (!match) {
      return { ok: false, error: "Email or password is incorrect." };
    }
    if (match.access === "disabled") {
      return { ok: false, error: "This account is disabled. Ask the owner to re-enable it." };
    }
    setCurrentUser(match);
    return { ok: true, user: match };
  };

  const loginStaff = (email: string, pin: string, orgId: string): AuthResult => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOrg = orgId.trim();
    const staff = users.find(
      (user) =>
        user.role === "staff" &&
        user.email.toLowerCase() === normalizedEmail &&
        user.password === pin
    );
    if (!staff) {
      return { ok: false, error: "Email or PIN is incorrect." };
    }
    if (staff.access === "disabled") {
      return { ok: false, error: "This account is disabled. Ask the owner to re-enable it." };
    }
    const owner = users.find((user) => user.id === staff.ownerId);
    if (!owner || owner.id !== normalizedOrg) {
      return { ok: false, error: "Org ID doesn't match this staff account." };
    }
    setCurrentUser(staff);
    return { ok: true, user: staff };
  };

  const signup = (payload: {
    businessName: string;
    email: string;
    password: string;
    slug: string;
  }): AuthResult => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedSlug = normalizeSlug(payload.slug);

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, error: "That email is already in use." };
    }
    if (!normalizedSlug) {
      return { ok: false, error: "Slug is required." };
    }
    if (!isSlugValid(normalizedSlug)) {
      return { ok: false, error: "Slug must be 3-30 characters and use letters, numbers, or hyphens." };
    }
    if (users.some((user) => user.slug === normalizedSlug)) {
      return { ok: false, error: "That slug is already taken." };
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      businessName: payload.businessName.trim(),
      email: normalizedEmail,
      password: payload.password,
      slug: normalizedSlug,
      role: "owner",
      access: "active",
      status: "unverified",
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    return { ok: true, user: newUser };
  };

  const loginDemo = () => {
    const demoEmail = "demo@stampverse.com";
    const demoUser = users.find((user) => user.email === demoEmail);
    if (demoUser) {
      setCurrentUser(demoUser);
      return;
    }

    const demoAccount: User = {
      id: crypto.randomUUID(),
      businessName: "Demo Donut Co.",
      email: demoEmail,
      password: "demo1234",
      slug: "demo-donut",
      role: "owner",
      access: "active",
      status: "verified",
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, demoAccount]);
    setCurrentUser(demoAccount);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const verifyAccount = () => {
    if (!currentOwner) return;
    setUsers((prev) =>
      prev.map((user) =>
        user.id === currentOwner.id ? { ...user, status: "verified" } : user
      )
    );
  };

  const createStaff = (payload: { name: string; email: string; pin: string }): AuthResult => {
    if (!currentOwner || currentUser?.role !== "owner") {
      return { ok: false, error: "Only owners can manage staff." };
    }
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, error: "That email is already in use." };
    }
    if (!/^\d{4,6}$/.test(payload.pin)) {
      return { ok: false, error: "PIN should be 4-6 digits." };
    }

    const newStaff: User = {
      id: crypto.randomUUID(),
      businessName: payload.name.trim(),
      email: normalizedEmail,
      password: payload.pin,
      role: "staff",
      ownerId: currentOwner.id,
      access: "active",
      status: "verified",
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newStaff]);
    return { ok: true };
  };

  const updateStaffPin = (staffId: string, pin: string): AuthResult => {
    if (!currentOwner || currentUser?.role !== "owner") {
      return { ok: false, error: "Only owners can manage staff." };
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return { ok: false, error: "PIN should be 4-6 digits." };
    }
    setUsers((prev) =>
      prev.map((user) =>
        user.id === staffId && user.ownerId === currentOwner.id
          ? { ...user, password: pin }
          : user
      )
    );
    return { ok: true };
  };

  const setStaffAccess = (staffId: string, access: "active" | "disabled") => {
    if (!currentOwner || currentUser?.role !== "owner") return;
    setUsers((prev) =>
      prev.map((user) =>
        user.id === staffId && user.ownerId === currentOwner.id ? { ...user, access } : user
      )
    );
  };

  const isSlugAvailable = (slug: string) => {
    const normalized = normalizeSlug(slug);
    if (!normalized || !isSlugValid(normalized)) return false;
    return !users.some((user) => (user.role ?? "owner") === "owner" && user.slug === normalized);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      currentOwner,
      isOwner: currentUser?.role === "owner",
      isStaff: currentUser?.role === "staff",
      isVerified: currentOwner?.status === "verified",
      staffAccounts,
      login,
      loginStaff,
      signup,
      loginDemo,
      createStaff,
      updateStaffPin,
      setStaffAccess,
      logout,
      verifyAccount,
      isSlugAvailable,
    }),
    [currentUser, currentOwner, staffAccounts, users]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
