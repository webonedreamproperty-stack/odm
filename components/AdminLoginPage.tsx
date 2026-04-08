import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "../lib/supabase";
import { fetchIsOdAdmin } from "../lib/db/members";
import { useEffect } from "react";

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!active) return;
      if (!userId) {
        setCheckingSession(false);
        return;
      }
      const isAdmin = await fetchIsOdAdmin(userId);
      if (!active) return;
      if (isAdmin) {
        navigate("/admin/dashboard", { replace: true });
        return;
      }
      setCheckingSession(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#f7f8fb_0%,#ffffff_48%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1b1813] border-t-transparent" />
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (submitting) return;
    event.preventDefault();
    setError("");
    setSubmitting(true);
    void (async () => {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError || !data.user) {
        setError(signInError?.message || "Invalid admin credentials.");
        setSubmitting(false);
        return;
      }

      const isAdmin = await fetchIsOdAdmin(data.user.id);
      if (!isAdmin) {
        await supabase.auth.signOut();
        setError("Account is not listed in od_admins.");
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      navigate("/admin/dashboard", { replace: true });
    })();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7f8fb_0%,#ffffff_48%)] px-4 py-10 text-[#111827]">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[#e6e9f2] bg-white/90 p-8 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.32)] backdrop-blur">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#2b4fc7]">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight">Admin Login</h1>
        <p className="mt-2 text-center text-sm text-[#5f6673]">Sign in to access the admin dashboard.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]" htmlFor="admin-identifier">
              Email
            </label>
            <Input
              id="admin-identifier"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder="admin@yourdomain.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]" htmlFor="admin-password">
              Password
            </label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;

