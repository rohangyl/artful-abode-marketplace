import { Link } from "@tanstack/react-router";
import { CONTACT } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-forest text-forest-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <p className="font-display text-3xl">Art & Decor</p>
          <p className="mt-3 max-w-sm text-sm opacity-80">Handcrafted art and décor from Indian artisans, delivered across India.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="eyebrow !text-forest-foreground/70">Explore</p>
          <Link to="/shop" className="block opacity-80 hover:opacity-100">Shop all</Link>
          <Link to="/about" className="block opacity-80 hover:opacity-100">Our story</Link>
          <Link to="/contact" className="block opacity-80 hover:opacity-100">Contact</Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="eyebrow !text-forest-foreground/70">Reach us</p>
          <a href={`tel:${CONTACT.phone}`} className="block opacity-80">{CONTACT.phone}</a>
          <a href={`mailto:${CONTACT.email}`} className="block opacity-80">{CONTACT.email}</a>
          <p className="opacity-80">{CONTACT.address}</p>
        </div>
      </div>
      <div className="border-t border-forest-foreground/15 py-6 text-center text-xs opacity-70">© {new Date().getFullYear()} Art & Decor. Secure payments by Razorpay.</div>
    </footer>
  );
}
