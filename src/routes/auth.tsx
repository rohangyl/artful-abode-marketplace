import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Art & Decor" },
      { name: "description", content: "Sign in or create your Art & Decor account." },
      { property: "og:title", content: "Sign in | Art & Decor" },
      { property: "og:description", content: "Sign in or create your Art & Decor account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate({ to: "/account" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password") ?? "");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "up") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: String(f.get("name")).trim().slice(0, 100) } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset link sent.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed.");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center text-5xl">{mode === "in" ? "Welcome back" : mode === "up" ? "Create account" : "Reset password"}</h1>
      <form onSubmit={submit} className="mt-10 space-y-4 rounded-md bg-card p-8 shadow-soft">
        {mode === "up" && <div><Label htmlFor="name">Full name</Label><Input id="name" name="name" required maxLength={100} /></div>}
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required maxLength={255} /></div>
        {mode !== "forgot" && <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required minLength={mode === "up" ? 8 : 1} /></div>}
        <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}</Button>
        {mode !== "forgot" && (
          <>
            <div className="relative py-2 text-center text-xs text-muted-foreground"><span className="bg-card px-2">or</span></div>
            <Button type="button" variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
          </>
        )}
        <div className="flex justify-between pt-2 text-sm text-muted-foreground">
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="hover:text-foreground">{mode === "in" ? "New here? Create account" : "Have an account? Sign in"}</button>
          {mode === "in" && <button type="button" onClick={() => setMode("forgot")} className="hover:text-foreground">Forgot password?</button>}
        </div>
      </form>
    </div>
  );
}
