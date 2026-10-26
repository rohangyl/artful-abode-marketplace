import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  const [phoneMode, setPhoneMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate({ to: "/account" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phoneMode) {
      const normalizedPhone = phone.replace(/[\s()-]/g, "");
      const e164Phone = /^\d{10}$/.test(normalizedPhone)
        ? `+91${normalizedPhone}`
        : normalizedPhone;
      if (!/^\+[1-9]\d{7,14}$/.test(e164Phone)) {
        toast.error("Enter a valid phone number with country code, for example +919876543210.");
        return;
      }

      setBusy(true);
      try {
        if (!otpSent) {
          const { error } = await supabase.auth.signInWithOtp({
            phone: e164Phone,
            options: { channel: "sms", shouldCreateUser: true },
          });
          if (error) throw error;
          setPhone(e164Phone);
          setOtpSent(true);
          toast.success("If SMS delivery is configured, your verification code is on its way.");
        } else {
          const { error } = await supabase.auth.verifyOtp({
            phone: e164Phone,
            token: otp.trim(),
            type: "sms",
          });
          if (error) throw error;
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Phone verification failed.");
      } finally {
        setBusy(false);
      }
      return;
    }

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
        toast.success("If a new account was created, check your email for the confirmation link.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Password reset link sent.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      if (mode === "in" && message.toLowerCase().includes("invalid login credentials")) {
        toast.error("Could not sign in. If you first used Google with this email, continue with Google or use Forgot password to set a password.");
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed.");
      setBusy(false);
    }
  };

  const resendPhoneOtp = async () => {
    const normalizedPhone = phone.replace(/[\s()-]/g, "");
    const e164Phone = /^\d{10}$/.test(normalizedPhone)
      ? `+91${normalizedPhone}`
      : normalizedPhone;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: e164Phone,
        options: { channel: "sms", shouldCreateUser: true },
      });
      if (error) throw error;
      toast.success("If SMS delivery is configured, a new code is on its way.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async (form: HTMLFormElement | null) => {
    const email = form ? String(new FormData(form).get("email") ?? "").trim() : "";
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("A new confirmation link has been sent. Use the newest email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend confirmation email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center text-5xl">
        {mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Reset password"}
      </h1>
      <form onSubmit={submit} className="mt-10 space-y-4 rounded-md bg-card p-8 shadow-soft">
        {phoneMode ? (
          <>
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                readOnly={otpSent}
              />
            </div>
            {otpSent && (
              <div>
                <Label htmlFor="phone-otp">SMS verification code</Label>
                <Input
                  id="phone-otp"
                  name="phone-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : otpSent ? "Verify code" : "Send SMS code"}
            </Button>
            {otpSent && (
              <div className="flex justify-between text-sm">
                <button type="button" className="text-muted-foreground hover:text-foreground" disabled={busy} onClick={resendPhoneOtp}>Resend code</button>
                <button type="button" className="text-muted-foreground hover:text-foreground" disabled={busy} onClick={() => { setOtpSent(false); setOtp(""); }}>Change phone number</button>
              </div>
            )}
          </>
        ) : (
          <>
            {mode === "up" && <div><Label htmlFor="name">Full name</Label><Input id="name" name="name" required maxLength={100} /></div>}
            <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required maxLength={255} /></div>
            {mode !== "forgot" && <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required minLength={mode === "up" ? 8 : 1} /></div>}
            {mode === "up" && (
              <p className="text-sm text-muted-foreground">
                Already used Google with this email? Continue with Google, or switch to sign in and choose Forgot password to set a password for the same account.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}</Button>
            {mode !== "forgot" && (
              <>
                <div className="relative py-2 text-center text-xs text-muted-foreground"><span className="bg-card px-2">or</span></div>
                <Button type="button" variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
              </>
            )}
          </>
        )}
        {mode !== "forgot" && (
          <button
            type="button"
            className="w-full text-sm text-muted-foreground hover:text-foreground"
            disabled={busy}
            onClick={() => { setPhoneMode(!phoneMode); setOtpSent(false); setOtp(""); }}
          >
            {phoneMode ? "Use email and password instead" : "Continue with mobile OTP"}
          </button>
        )}
        {mode === "in" && (
          <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" disabled={busy} onClick={(e) => resendConfirmation(e.currentTarget.form)}>
            Resend confirmation email
          </button>
        )}
        <div className="flex justify-between pt-2 text-sm text-muted-foreground">
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="hover:text-foreground">{mode === "in" ? "New here? Create account" : "Have an account? Sign in"}</button>
          {mode === "in" && <button type="button" onClick={() => setMode("forgot")} className="hover:text-foreground">Forgot password?</button>}
        </div>
      </form>
    </div>
  );
}
