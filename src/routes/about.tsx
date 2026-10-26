import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story | Art & Decor" },
      {
        name: "description",
        content:
          "Discover Art & Decor's handcrafted Diwali diyas, bandhanwars and festive decorative pieces, made to bring warmth to your celebrations.",
      },
      { property: "og:title", content: "Our Story | Art & Decor" },
      {
        property: "og:description",
        content:
          "Handmade festive decor for the moments and traditions that make a home feel special.",
      },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8">
      <img
        src="/images/p-madhubani.jpg"
        alt="Madhubani folk art"
        loading="lazy"
        className="aspect-[4/5] w-full rounded-md object-cover"
      />
      <div className="md:py-10">
        <p className="eyebrow">A little light, a lot of meaning</p>
        <h1 className="mt-3 text-5xl">Made by hand for the moments that bring us together.</h1>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          At Art & Decor, we believe the smallest details can make a celebration feel like your own.
          A diya glowing at dusk, a bandhanwar welcoming loved ones at the door, and thoughtful
          decorative touches around the home—each helps create the warmth and joy we remember long
          after the festivities are over.
        </p>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Our collection brings together handmade Diwali diyas, bandhanwars and decorative pieces
          chosen for homes that cherish tradition while making it their own. Every piece is made
          with care, so it can find a place in your rituals, your celebrations and the everyday
          moments in between.
        </p>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          We want choosing festive decor to feel personal and easy: meaningful pieces, clear
          details, and a little inspiration for making your home feel welcoming. Whether you are
          preparing for Diwali or adding a celebratory touch to an ordinary day, we are happy to be
          part of it.
        </p>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Thank you for welcoming Art & Decor into your home. May every diya bring a little more
          light, and every celebration leave you with a story worth keeping.
        </p>
        <Button asChild className="mt-8">
          <Link to="/shop">Explore the collection</Link>
        </Button>
      </div>
    </div>
  );
}
