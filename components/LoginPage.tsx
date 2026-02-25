import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "./AuthProvider";

export const LoginPage: React.FC = () => {
  const { currentUser, login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = login(email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
    const role = result.user?.role;
    const redirectTo = fromPath ?? (role === "staff" ? "/issued-cards" : "/");
    navigate(redirectTo);
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Log in to manage campaigns, issue stamps, and track loyalty performance in real time."
      badge="Operator console"
      theme="login"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure login
            </div>
            <p className="mt-1 text-xs text-slate-600">Protected session and role-based access.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/90 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <Sparkles className="h-3.5 w-3.5" />
              Real-time dashboard
            </div>
            <p className="mt-1 text-xs text-slate-600">Campaign stats, cards, and customers synced live.</p>
          </div>
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
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Password</Label>
            <span className="text-xs text-muted-foreground">Owner and staff supported</span>
          </div>
          <Input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            className="h-12 border-border/70 bg-background/90"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button type="submit" className="h-12 w-full text-base font-semibold">
          <span>Continue to Dashboard</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="relative py-1">
          <div className="border-t border-border/70" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70 bg-background px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Quick access
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-12 w-full border-border/70 bg-background/80 text-base font-semibold"
          onClick={() => {
            loginDemo();
            navigate("/");
          }}
        >
          Try Demo Workspace
        </Button>

        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Staff shortcut</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Team members can use org portal links like{" "}
            <span className="font-mono text-foreground">/yourbrand/staff?id=ORG_ID</span>.
          </p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-semibold text-foreground underline">
            Create your workspace
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
