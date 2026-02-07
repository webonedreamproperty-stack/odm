import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
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
      title="Welcome back to your Stampverse"
      subtitle="Log in to keep your loyalty universe humming."
      badge="Member access"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
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
            placeholder="••••••••"
            className="mt-2"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <div className="rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm border border-rose-200">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full rounded-full h-12 text-base">
          Log in
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full h-12 text-base"
          onClick={() => {
            loginDemo();
            navigate("/");
          }}
        >
          Try Demo Account
        </Button>
        <div className="text-sm text-center text-slate-600">
          New here?{" "}
          <Link to="/signup" className="font-semibold text-slate-900 underline">
            Claim your Stampverse
          </Link>
        </div>
        <div className="text-xs text-center text-slate-500">
          Staff member? Use your org portal link like{" "}
          <span className="font-mono text-slate-700">/yourbrand/staff?id=ORG_ID</span>.
        </div>
      </form>
    </AuthLayout>
  );
};
