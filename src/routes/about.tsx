import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story | Art & Decor" },
      { name: "description", content: "We partner with artisans across India to bring handcrafted art and décor to modern homes." },
      { property: "og:title", content: "Our Story | Art & Decor" },
      { property: "og:description", content: "Handcrafted art and décor from artisans across India." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8">
      <img src="/images/p-madhubani.jpg" alt="Madhubani folk art" loading="lazy" className="aspect-[4/5] w-full rounded-md object-cover" />
      <div className="md:py-10">
        <p className="eyebrow">Our story</p>
        <h1 className="mt-3 text-5xl">Rooted in craft, made for modern homes.</h1>
        <p className="mt-6 leading-relaxed text-muted-foreground">We work directly with painters, metalsmiths, potters and weavers across India — from Madhubani artists in Bihar to brass makers in Moradabad. Every piece carries a story and a maker's hand.</p>
        <p className="mt-4 leading-relaxed text-muted-foreground">Fair pay, honest materials and careful packaging, delivered to your door anywhere in India.</p>
        <Button asChild className="mt-8"><Link to="/shop">Explore the collection</Link></Button>
      </div>
    </div>
  );
}
