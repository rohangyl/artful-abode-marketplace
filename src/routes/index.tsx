import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Truck, ShieldCheck, Hand } from "lucide-react";
import { productsQuery } from "@/lib/products.functions";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Art & Decor — Handcrafted Indian Art & Home Décor Online" },
      { name: "description", content: "Discover paintings, Madhubani folk art, brass and carved wood décor made by Indian artisans. Free shipping above ₹2,999." },
      { property: "og:title", content: "Art & Decor — Handcrafted Indian Art & Home Décor" },
      { property: "og:description", content: "Paintings, folk art, brass and carved wood décor from Indian artisans." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery()),
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(productsQuery());
  const featured = data.filter((p) => p.featured).slice(0, 4);
  return (
    <>
      <section className="relative">
        <img src="/images/hero.jpg" alt="Sunlit living room styled with Indian art and décor" width={1600} height={1008} className="h-[78vh] min-h-[520px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <p className="eyebrow !text-primary-foreground/80">Handcrafted in India</p>
          <h1 className="mt-3 max-w-3xl text-5xl leading-[1.05] text-primary-foreground md:text-7xl">Art that makes a house feel like <em>home</em>.</h1>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg"><Link to="/shop">Shop the collection</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link to="/about">Our story</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Curated</p>
            <h2 className="mt-2 text-4xl md:text-5xl">Featured pieces</h2>
          </div>
          <Link to="/shop" className="text-sm underline underline-offset-4">View all</Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-3 md:px-8">
          {[
            { icon: Hand, t: "Made by artisans", d: "Every piece is handmade by craftspeople across India." },
            { icon: Truck, t: "Pan-India delivery", d: "Free shipping on orders above ₹2,999." },
            { icon: ShieldCheck, t: "Secure checkout", d: "UPI, cards and netbanking via Razorpay." },
          ].map(({ icon: I, t, d }) => (
            <div key={t} className="flex gap-4">
              <I className="h-6 w-6 shrink-0 text-primary" />
              <div><p className="font-display text-2xl">{t}</p><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
