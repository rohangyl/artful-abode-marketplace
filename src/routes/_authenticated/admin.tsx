import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Status = Database["public"]["Enums"]["order_status"];
const STATUSES: Status[] = ["pending", "paid", "shipped", "delivered", "cancelled", "failed"];

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Art & Decor" },
      { name: "description", content: "Manage products and orders." },
      { property: "og:title", content: "Admin | Art & Decor" },
      { property: "og:description", content: "Manage products and orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <div className="py-24 text-center"><h1 className="text-4xl">Admins only</h1><p className="mt-2 text-muted-foreground">Your account doesn't have admin access.</p></div>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <h1 className="text-5xl">Admin</h1>
      <Tabs defaultValue="orders" className="mt-8">
        <TabsList><TabsTrigger value="orders">Orders</TabsTrigger><TabsTrigger value="products">Products</TabsTrigger><TabsTrigger value="messages">Messages</TabsTrigger></TabsList>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="products"><Products /></TabsContent>
        <TabsContent value="messages"><Messages /></TabsContent>
      </Tabs>
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const revenue = (data ?? []).filter((o) => ["paid", "shipped", "delivered"].includes(o.status)).reduce((s, o) => s + o.total_inr, 0);
  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
  };
  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={String(data?.length ?? 0)} />
        <Stat label="Paid revenue" value={formatINR(revenue)} />
        <Stat label="To ship" value={String((data ?? []).filter((o) => o.status === "paid").length)} />
      </div>
      <div className="mt-6 overflow-x-auto rounded-md bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Items</th><th className="p-3">Total</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {data?.map((o) => (
              <tr key={o.id} className="border-b align-top last:border-0">
                <td className="p-3">#{o.id.slice(0, 8)}<br /><span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")}</span></td>
                <td className="p-3">{o.shipping_name}<br /><span className="text-xs text-muted-foreground">{o.shipping_phone} · {o.shipping_city}, {o.shipping_state} {o.shipping_pincode}</span></td>
                <td className="p-3">{o.order_items.map((i) => <div key={i.id}>{i.product_name} × {i.quantity}</div>)}</td>
                <td className="p-3">{formatINR(o.total_inr)}</td>
                <td className="p-3">
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value as Status)} className="rounded border bg-background px-2 py-1 capitalize">
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && <p className="p-6 text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-card p-5 shadow-soft"><p className="eyebrow">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>;
}

const empty = { name: "", slug: "", description: "", category: "Decor", price_inr: 0, image_url: "", stock: 0, featured: false, active: true };

function Products() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Product> | null>(null);
  const { data } = useQuery({ queryKey: ["admin-products"], queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [] });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const row = {
      name: String(edit.name ?? "").trim(), description: String(edit.description ?? ""), category: String(edit.category ?? "Decor"),
      slug: (edit.slug || String(edit.name)).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      price_inr: Math.round(Number(edit.price_inr)), stock: Math.round(Number(edit.stock)), image_url: String(edit.image_url ?? ""),
      featured: !!edit.featured, active: edit.active !== false,
    };
    if (!row.name || row.price_inr <= 0) { toast.error("Name and a price above ₹0 are required."); return; }
    const { error } = edit.id ? await supabase.from("products").update(row).eq("id", edit.id) : await supabase.from("products").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); setEdit(null); refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  return (
    <div className="mt-6">
      <Button onClick={() => setEdit({ ...empty })}><Plus className="mr-1 h-4 w-4" />Add product</Button>
      <div className="mt-6 grid gap-3">
        {data?.map((p) => (
          <div key={p.id} className="flex items-center gap-4 rounded-md bg-card p-3 shadow-soft">
            <img src={p.image_url} alt="" className="h-16 w-14 rounded object-cover" />
            <div className="flex-1"><p className="font-medium">{p.name} {!p.active && <span className="text-xs text-muted-foreground">(hidden)</span>}</p><p className="text-sm text-muted-foreground">{p.category} · {formatINR(p.price_inr)} · {p.stock} in stock</p></div>
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEdit(p)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {edit && (
            <form onSubmit={save} className="space-y-3">
              <div><Label>Name</Label><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} maxLength={120} /></div>
              <div><Label>Category</Label><Input value={edit.category ?? ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} maxLength={60} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (₹)</Label><Input type="number" min={1} value={edit.price_inr ?? 0} onChange={(e) => setEdit({ ...edit, price_inr: Number(e.target.value) })} /></div>
                <div><Label>Stock</Label><Input type="number" min={0} value={edit.stock ?? 0} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Description</Label><Textarea rows={4} value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} maxLength={2000} /></div>
              <div><Label>Image URL</Label><Input placeholder="https://… or /images/…" value={edit.image_url ?? ""} onChange={(e) => setEdit({ ...edit, image_url: e.target.value })} maxLength={500} />{edit.image_url && <img src={edit.image_url} alt="" className="mt-2 h-24 rounded object-cover" />}</div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.featured} onCheckedChange={(v) => setEdit({ ...edit, featured: v })} />Featured</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={edit.active !== false} onCheckedChange={(v) => setEdit({ ...edit, active: v })} />Visible</label>
              </div>
              <Button type="submit" className="w-full">Save product</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Messages() {
  const { data } = useQuery({ queryKey: ["admin-msgs"], queryFn: async () => (await supabase.from("contact_messages").select("*").order("created_at", { ascending: false })).data ?? [] });
  return (
    <div className="mt-6 space-y-3">
      {data?.length === 0 && <p className="text-muted-foreground">No messages.</p>}
      {data?.map((m) => (
        <div key={m.id} className="rounded-md bg-card p-5 shadow-soft">
          <p className="font-medium">{m.name} <a href={`mailto:${m.email}`} className="text-sm text-primary">{m.email}</a></p>
          <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("en-IN")}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
        </div>
      ))}
    </div>
  );
}
