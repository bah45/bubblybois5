"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, login, signup, oauthLogin, handleAuthCallback, AuthError } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    handleAuthCallback()
      .then((result) => {
        if (result?.user) router.replace("/dashboard");
      })
      .catch(() => {});

    getUser().then((user) => {
      if (user) router.replace("/dashboard");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        router.replace("/dashboard");
      } else {
        const user = await signup(email, password);
        if (user.confirmedAt) {
          router.replace("/dashboard");
        } else {
          setInfo("Account created. Check your email to confirm before signing in.");
        }
      }
    } catch (err) {
      if (err instanceof AuthError) setError(err.message);
      else setError("Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    try {
      oauthLogin("google");
    } catch (err) {
      if (err instanceof AuthError) setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
        <div className="mb-6 text-center">
          <div className="text-xs uppercase tracking-widest text-muted">Bubbly Bois</div>
          <h1 className="text-lg font-semibold">Predictive Maintenance Node</h1>
        </div>

        <Button variant="outline" className="w-full mb-4" onClick={handleGoogle} type="button">
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-4 text-xs text-muted">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          {info && <p className="text-xs text-success">{info}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          className="mt-4 w-full text-center text-xs text-muted hover:text-foreground"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
