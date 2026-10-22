import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My Account | Art & Decor" },
      { name: "description", content: "Your orders and saved address." },
      { property: "og:title", content: "My Account | Art & Decor" },
      { property: "og:description", content: "Your orders and saved address." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

const keys = [["full_name", "Full name"], ["phone", "Mobile"], ["address", "Address"], ["city", "City"], ["state", "State"], ["pincode", "PIN code"]] as const;

function Account() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [passwordBusy, setPasswordBusy] = useState(false);
  const orders = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [p, setP] = useState<Record<string, string>>({});
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const metadataName = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  const displayName =
    p.full_name?.trim() ||
    (typeof metadataName === "string" ? metadataName.trim() : "") ||
    user?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => data && setP(Object.fromEntries(keys.map(([k]) => [k, (data[k] as string) ?? ""]))));
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ full_name: (p["full_name"] ?? "").slice(0, 100) || null, phone: (p["phone"] ?? "").slice(0, 20) || null, address: (p["address"] ?? "").slice(0, 300) || null, city: (p["city"] ?? "").slice(0, 80) || null, state: (p["state"] ?? "").slice(0, 80) || null, pincode: (p["pincode"] ?? "").slice(0, 6) || null }).eq("id", user!.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries(); }
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwords.next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    if (!user?.email) {
      toast.error("Could not verify your account email. Please sign in again.");
      return;
    }

    setPasswordBusy(true);
    try {
      const { data, error: verificationError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.current,
      });
      if (verificationError) throw new Error("Current password is incorrect.");
      if (data.user.id !== user.id) {
        throw new Error("Could not verify the current account. Please sign in again.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: passwords.next });
      if (updateError) throw updateError;

      setPasswords({ current: "", next: "", confirm: "" });
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password.");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
      <p className="eyebrow">{user?.email}</p>
      <h1 className="mt-2 text-5xl">Hello, {displayName}</h1>
      <Tabs defaultValue="orders" className="mt-10">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="address">Saved address</TabsTrigger>
          <TabsTrigger value="password">Change password</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="mt-8">
          <section>
            <h2 className="text-3xl">Orders</h2>
            {orders.isLoading && <p className="mt-4 text-muted-foreground">Loading…</p>}
            {orders.data?.length === 0 && <p className="mt-4 text-muted-foreground">No orders yet.</p>}
            <ul className="mt-6 space-y-4">
              {orders.data?.map((o) => (
                <li key={o.id} className="rounded-md bg-card p-5 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString("en-IN")}</p>
                    <Badge variant={o.status === "paid" || o.status === "delivered" ? "default" : "secondary"} className="capitalize">{o.status}</Badge>
                  </div>
                  <ul className="mt-3 text-sm">{o.order_items.map((i) => <li key={i.id}>{i.product_name} × {i.quantity}</li>)}</ul>
                  <p className="mt-2 font-medium">{formatINR(o.total_inr)}</p>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>
        <TabsContent value="address" className="mt-8">
          <form onSubmit={save} className="max-w-xl space-y-3 rounded-md bg-card p-6 shadow-soft">
            <h2 className="text-2xl">Saved address</h2>
            {keys.map(([k, l]) => (
              <div key={k}><Label htmlFor={k}>{l}</Label><Input id={k} value={p[k] ?? ""} onChange={(e) => setP({ ...p, [k]: e.target.value })} maxLength={300} /></div>
            ))}
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </TabsContent>
        <TabsContent value="password" className="mt-8">
          <form onSubmit={changePassword} className="max-w-xl space-y-3 rounded-md bg-card p-6 shadow-soft">
            <h2 className="text-2xl">Change password</h2>
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" autoComplete="current-password" required value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
            </div>
            <p className="text-sm text-muted-foreground">Enter your current password to verify your identity. Google-only accounts can set a password using Forgot password on the sign-in page.</p>
            <Button type="submit" className="w-full" disabled={passwordBusy}>{passwordBusy ? "Updating…" : "Update password"}</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
