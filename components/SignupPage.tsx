import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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
      title="Claim your Stampee"
      subtitle="Reserve your space, craft your loyalty universe, and share your signature link."
      badge="New universe"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <Label>Business name</Label>
          <Input
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Cosmic Cookie Co."
            className="mt-2"
            required
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@brand.com"
            className="mt-2"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            className="mt-2"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="space-y-3 rounded-lg border border-border/80 bg-muted/35 p-4">
          <div className="flex items-center justify-between">
            <Label>Claim your slug</Label>
            {normalizedSlug && (
              <Badge
                variant={slugStatusVariant}
                className="uppercase tracking-wider"
              >
                {slugStatusLabel}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border/80 bg-background px-3 py-2 shadow-subtle">
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
        </div>

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full text-base"
          disabled={!slugAvailable}
        >
          Claim Stampee
        </Button>

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
