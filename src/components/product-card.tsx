import Image from "next/image";
import Link from "next/link";
import { formatPrice, getStockState, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  const [image] = product.images;
  const soldOut = getStockState(product.stock).status === "sold-out";

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col gap-3">
      <div className="media-frame">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(width >= 64rem) 25vw, (width >= 48rem) 33vw, 50vw"
        />
        {soldOut ? (
          <span className="type-label absolute top-3 left-3 text-muted-foreground">
            Sold out
          </span>
        ) : (
          product.badge && (
            <span className="type-label absolute top-3 left-3 text-accent">
              {product.badge}
            </span>
          )
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-1 lg:px-0">
        <h3 className="type-body group-hover:underline group-hover:underline-offset-4">
          {product.name}
        </h3>
        <p className="type-price text-muted-foreground">
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}
