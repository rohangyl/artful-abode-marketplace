import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CONTACT } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us | Art & Decor" },
      { name: "description", content: "Questions about an order, custom art or bulk décor? Call, email or message Art & Decor." },
      { property: "og:title", content: "Contact Us | Art & Decor" },
      { property: "og:description", content: "Get in touch about orders, custom art or bulk décor." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

function Contact() {
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check the form"); return; }
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setBusy(false);
    if (error) { toast.error("Could not send. Please try again."); return; }
    form.reset();
    toast.success("Thanks! We'll reply within a day.");
  };
  return (
    <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 md:grid-cols-2 md:px-8">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 text-5xl">We'd love to hear from you.</h1>
        <ul className="mt-10 space-y-5 text-sm">
          <li className="flex gap-3"><Phone className="h-5 w-5 text-primary" /><a href={`tel:${CONTACT.phone}`}>{CONTACT.phone}</a></li>
          <li className="flex gap-3"><Mail className="h-5 w-5 text-primary" /><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
          <li className="flex gap-3"><MapPin className="h-5 w-5 text-primary" />{CONTACT.address}</li>
          <li className="flex gap-3"><Clock className="h-5 w-5 text-primary" />{CONTACT.hours}</li>
        </ul>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-md bg-card p-8 shadow-soft">
        <div><Label htmlFor="name">Name</Label><Input id="name" name="name" maxLength={100} /></div>
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" maxLength={255} /></div>
        <div><Label htmlFor="message">Message</Label><Textarea id="message" name="message" rows={5} maxLength={2000} /></div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send message"}</Button>
      </form>
    </div>
  );
}
