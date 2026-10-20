import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "Our Story" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="font-display text-2xl tracking-tight">Art <span className="text-primary">&</span> Decor</Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-muted-foreground transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>{n.label}</Link>
          ))}
          {isAdmin && <Link to="/admin" className="text-primary">Admin</Link>}
        </nav>
        <div className="flex items-center gap-1">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="My account"><Link to="/account"><User className="h-5 w-5" /></Link></Button>
              <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
          )}
          <Button asChild variant="ghost" size="icon" aria-label="Cart" className="relative">
            <Link to="/cart">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{count}</span>}
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-4 border-t px-4 py-4 md:hidden">
          {nav.map((n) => <Link key={n.to} to={n.to} onClick={() => setOpen(false)}>{n.label}</Link>)}
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="text-primary">Admin</Link>}
          {user && <button className="text-left" onClick={signOut}>Sign out</button>}
        </nav>
      )}
    </header>
  );
}
