import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AtSign, Building2, CheckCircle2, KeyRound, Link2 } from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { useAuth } from "./AuthProvider";
import { getSlugHint, isSlugValid, normalizeSlug } from "../lib/slug";

export const SignupPage: React.FC = () => {
  const { currentUser, signup, isSlugAvailable } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState("");

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (!slugTouched) {
      setSlugInput(normalizeSlug(businessName));
    }
  }, [businessName, slugTouched]);

  const normalizedSlug = useMemo(() => normalizeSlug(slugInput), [slugInput]);
  const slugValid = isSlugValid(normalizedSlug);
  const slugAvailable = slugValid && isSlugAvailable(normalizedSlug);
  const slugHint = getSlugHint(normalizedSlug);
  const slugStatusLabel = !normalizedSlug ? "" : !slugValid ? "Invalid" : slugAvailable ? "Available" : "Taken";
  const slugStatusVariant = slugAvailable ? "secondary" : "destructive";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = signup({
      businessName,
      email,
      password,
      slug: normalizedSlug,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/");
  };

  return (
    <AuthLayout
      title="Create Your SaaS Workspace"
      subtitle="Set up your brand, claim your public link, and launch a loyalty program your customers actually use."
      badge="New workspace"
      theme="signup"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-2.5 rounded-2xl border border-border/70 bg-muted/25 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Launch checklist</p>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Brand profile and owner account
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Public loyalty link for customers
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Dashboard access in under 3 minutes
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Business name</Label>
          <Input
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Cosmic Cookie Co."
            className="h-12 border-border/70 bg-background/90"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Work email</Label>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@brand.com"
            className="h-12 border-border/70 bg-background/90"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Password</Label>
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="h-12 border-border/70 bg-background/90"
            type="password"
            autoComplete="new-password"
            required
          />
          <p className="text-xs text-muted-foreground">Use a strong password for your owner account and data access.</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Claim your URL slug</Label>
            {normalizedSlug && (
              <Badge
                variant={slugStatusVariant}
                className="uppercase tracking-wider"
              >
                {slugStatusLabel}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/90 px-3 py-3 shadow-subtle">
            <Link2 className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold text-muted-foreground">stampee.com/</span>
            <input
              value={normalizedSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlugInput(event.target.value);
              }}
              className="flex-1 bg-transparent font-mono text-sm text-foreground outline-none"
              placeholder="yourbrand"
              required
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {slugHint} Use lowercase letters, numbers, and hyphens.
          </div>
          {normalizedSlug && (
            <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold">Public URL:</span>{" "}
              <span className="font-mono">stampee.com/{normalizedSlug}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full text-base font-semibold"
          disabled={!slugAvailable}
        >
          Create Workspace
        </Button>

        <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/25 p-3 text-xs text-slate-700 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            Business profile
          </div>
          <div className="flex items-center gap-2">
            <AtSign className="h-3.5 w-3.5 text-slate-500" />
            Email login
          </div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-slate-500" />
            Secure access
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-foreground underline">
            Log in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
