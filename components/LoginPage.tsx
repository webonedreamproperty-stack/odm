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
      title="Welcome back to your Stampee"
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
            placeholder="********"
            className="mt-2"
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
        <Button type="submit" className="h-12 w-full text-base">
          Log in
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full text-base"
          onClick={() => {
            loginDemo();
            navigate("/");
          }}
        >
          Try Demo Account
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-semibold text-foreground underline">
            Claim your Stampee
          </Link>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          Staff member? Use your org portal link like{" "}
          <span className="font-mono text-foreground">/yourbrand/staff?id=ORG_ID</span>.
        </div>
      </form>
    </AuthLayout>
  );
};
