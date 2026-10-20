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
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => data && setP(Object.fromEntries(keys.map(([k]) => [k, (data[k] as string) ?? ""]))));
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update(Object.fromEntries(keys.map(([k]) => [k, (p[k] ?? "").slice(0, 300)]))).eq("id", user!.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries(); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
      <p className="eyebrow">{user?.email}</p>
      <h1 className="mt-2 text-5xl">My account</h1>
      <div className="mt-10 grid gap-12 md:grid-cols-[1fr_360px]">
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
        <form onSubmit={save} className="h-fit space-y-3 rounded-md bg-card p-6 shadow-soft">
          <h2 className="text-2xl">Saved address</h2>
          {keys.map(([k, l]) => (
            <div key={k}><Label htmlFor={k}>{l}</Label><Input id={k} value={p[k] ?? ""} onChange={(e) => setP({ ...p, [k]: e.target.value })} maxLength={300} /></div>
          ))}
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </div>
    </div>
  );
}
