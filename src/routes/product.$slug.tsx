import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState, type TouchEvent } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { productQuery } from "@/lib/products.functions";
import { formatINR, priceForSize } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.fetchQuery(productQuery(params.slug));
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} | Art & Decor` },
          { name: "description", content: loaderData.description.slice(0, 155) },
          { property: "og:title", content: `${loaderData.name} | Art & Decor` },
          { property: "og:description", content: loaderData.description.slice(0, 155) },
          { property: "og:type", content: "product" },
        ]
      : [{ title: "Product unavailable | Art & Decor" }, { name: "robots", content: "noindex" }],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(productQuery(slug));
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [sizeInput, setSizeInput] = useState("40");
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const touchStartX = useRef<number | null>(null);
  if (!p) return null;
  const out = p.stock <= 0;
  const parsedSize = sizeInput.trim() === "" ? NaN : Number(sizeInput);
  const validSize = Number.isFinite(parsedSize) && parsedSize >= 1 && parsedSize <= 999;
  const selectedSize = validSize ? parsedSize : 40;
  const currentPrice = priceForSize(p.price_inr, selectedSize);
  const sizeAddon = currentPrice - p.price_inr;
  const images = [p.image_url, ...(p.image_urls ?? [])].filter(Boolean);
  const changeImage = (direction: -1 | 1) => {
    setActiveImage((current) => Math.min(images.length - 1, Math.max(0, current + direction)));
  };
  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    const endX = event.changedTouches[0]?.clientX;
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 40) return;
    changeImage(endX < startX ? 1 : -1);
  };
  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 md:grid-cols-2 md:px-8">
      <div>
        <div
          className="group relative aspect-[4/5] overflow-hidden rounded-md bg-muted"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            className="h-full w-full cursor-zoom-in"
            onClick={() => {
              setZoom(1);
              setViewerOpen(true);
            }}
            aria-label={`Open enlarged image ${activeImage + 1} of ${images.length}`}
          >
            <img
              src={images[activeImage]}
              alt={`${p.name}, image ${activeImage + 1}`}
              width={912}
              height={1104}
              className="h-full w-full object-cover"
            />
          </button>
          {images.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full opacity-90 shadow"
                onClick={() => changeImage(-1)}
                disabled={activeImage === 0}
                aria-label="Previous product photo"
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full opacity-90 shadow"
                onClick={() => changeImage(1)}
                disabled={activeImage === images.length - 1}
                aria-label="Next product photo"
              >
                <ChevronRight />
              </Button>
              <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white">
                {activeImage + 1} / {images.length}
              </span>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2" aria-label="Product photos">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`Show product photo ${index + 1}`}
                aria-current={activeImage === index}
                className={`h-20 w-16 shrink-0 overflow-hidden rounded border-2 ${activeImage === index ? "border-primary" : "border-transparent"}`}
              >
                <img src={image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent
          className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col items-center justify-center gap-0 overflow-hidden rounded-none border-0 bg-black p-0 text-white sm:rounded-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") changeImage(-1);
            if (event.key === "ArrowRight") changeImage(1);
          }}
        >
          <DialogTitle className="sr-only">{p.name} photos</DialogTitle>
          <img
            src={images[activeImage]}
            alt={`${p.name}, image ${activeImage + 1}`}
            className="max-h-full max-w-full select-none object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          />
          {images.length > 1 && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full"
                onClick={() => changeImage(-1)}
                disabled={activeImage === 0}
                aria-label="Previous product photo"
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full"
                onClick={() => changeImage(1)}
                disabled={activeImage === images.length - 1}
                aria-label="Next product photo"
              >
                <ChevronRight />
              </Button>
            </>
          )}
          <div className="absolute bottom-6 flex items-center gap-4 rounded-full bg-black/70 px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:text-foreground"
              onClick={() => setZoom((current) => Math.max(1, current - 0.5))}
              disabled={zoom === 1}
              aria-label="Zoom out"
            >
              <ZoomOut />
            </Button>
            <span className="min-w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:text-foreground"
              onClick={() => setZoom((current) => Math.min(3, current + 0.5))}
              disabled={zoom === 3}
              aria-label="Zoom in"
            >
              <ZoomIn />
            </Button>
            {images.length > 1 && (
              <span className="text-sm">
                {activeImage + 1} / {images.length}
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <div className="md:py-8">
        <Link to="/shop" className="eyebrow hover:text-foreground">
          ← {p.category}
        </Link>
        <h1 className="mt-3 text-5xl">{p.name}</h1>
        <p className="mt-4 text-2xl" aria-live="polite">
          {formatINR(currentPrice)}
        </p>
        {sizeAddon > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Includes {formatINR(sizeAddon)} size add-on above the 40-inch base price.
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>
        <p className="mt-8 leading-relaxed text-muted-foreground">{p.description}</p>
        <div className="mt-6 space-y-3">
          <Label>Size</Label>
          <RadioGroup
            value={isCustomSize ? "custom" : "40"}
            onValueChange={(value) => {
              const custom = value === "custom";
              setIsCustomSize(custom);
              if (custom) {
                setSizeInput("");
              } else {
                setSizeInput("40");
              }
            }}
            disabled={out}
            className="gap-3"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem id="product-size-40" value="40" />
              <Label htmlFor="product-size-40" className="font-normal">
                40 inches
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="product-size-custom" value="custom" />
              <Label htmlFor="product-size-custom" className="font-normal">
                Custom size
              </Label>
            </div>
          </RadioGroup>
          {isCustomSize && (
            <div className="max-w-48 space-y-2">
              <Label htmlFor="product-size-custom-inches">Enter size (inches)</Label>
              <Input
                id="product-size-custom-inches"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 45"
                value={sizeInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setSizeInput(value);
                }}
                disabled={out}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            40 inches is the base price. Each inch above 40 adds 1/40 of the base price; sizes below
            40 keep the base price.
          </p>
        </div>
        <div className="mt-10 flex items-center gap-4">
          <div className="flex items-center rounded-md border">
            <button
              className="p-3"
              aria-label="Decrease"
              onClick={() => setQty(Math.max(1, qty - 1))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center">{qty}</span>
            <button
              className="p-3"
              aria-label="Increase"
              disabled={out || qty >= p.stock}
              onClick={() => setQty(Math.min(p.stock, qty + 1))}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <Button
            size="lg"
            className="flex-1"
            disabled={out || (isCustomSize && !validSize)}
            onClick={() => {
              add(
                {
                  productId: p.id,
                  slug: p.slug,
                  name: p.name,
                  price: p.price_inr,
                  image: p.image_url,
                  sizeInches: isCustomSize ? parsedSize : 40,
                  isCustomSize,
                },
                qty,
              );
              toast.success("Added to cart");
            }}
          >
            {out ? "Sold out" : "Add to cart"}
          </Button>
        </div>
        {out ? (
          <p className="mt-3 text-sm font-medium text-destructive" role="status">
            Out of stock
          </p>
        ) : (
          <p className="mt-3 text-sm text-primary">
            {p.stock < 5 ? `Only ${p.stock} left` : `${p.stock} in stock`}
          </p>
        )}
      </div>
    </div>
  );
}
