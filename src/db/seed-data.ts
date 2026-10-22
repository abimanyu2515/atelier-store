// Sample catalog loaded by `npm run db:seed`. Imports stay relative so the
// seed script can run outside Next.

import { unsplash, type Product } from "../lib/catalog";

export type SeedCategory = {
  slug: string;
  name: string;
  /** Categories without an image are not shown on the home page. */
  image?: string;
  alt?: string;
};

/** The category is linked by name; its slug comes from the database. */
export type SeedProduct = Omit<Product, "categorySlug">;

/** A zoomed crop of an Unsplash photo around a focal point (0–1) at `zoom`x. */
function unsplashDetail(id: string, x: number, y: number, zoom: number) {
  return `${unsplash(id, 1200)}&crop=focalpoint&fp-x=${x}&fp-y=${y}&fp-z=${zoom}&h=1500`;
}

const shoeSizes = { system: "EU", values: ["36", "37", "38", "39", "40", "41"] } as const;
const clothingSizes = { system: "IT", values: ["38", "40", "42", "44", "46"] } as const;

export const products: SeedProduct[] = [
  {
    slug: "laguna-top-handle-bag",
    name: "Laguna top handle bag",
    category: "Bags",
    price: 2450,
    color: "Teal",
    stock: 2,
    badge: "New",
    description:
      "A structured top handle bag in pebbled calfskin, closed with a gold push-lock and finished with a detachable shoulder strap.",
    details: [
      "Pebbled calfskin, suede lining",
      "Gold-tone hardware",
      "Detachable, adjustable shoulder strap",
      "One interior zip pocket",
      "W 24 × H 18 × D 10 cm",
      "Made in Italy",
    ],
    images: [
      {
        src: unsplash("1594223274512-ad4803739b7c", 1200),
        alt: "Teal leather top handle bag with a gold push-lock, resting on a stool",
      },
      {
        src: unsplashDetail("1594223274512-ad4803739b7c", 0.5, 0.7, 2.5),
        alt: "Close-up of the gold push-lock on pebbled leather",
      },
      {
        src: unsplashDetail("1594223274512-ad4803739b7c", 0.65, 0.35, 2.2),
        alt: "Close-up of the rounded top handle and gold ring",
      },
    ],
  },
  {
    slug: "lucia-round-sunglasses",
    name: "Lucia round sunglasses",
    category: "Eyewear",
    price: 520,
    color: "Rose gold, green lens",
    stock: 14,
    description:
      "Round sunglasses with a fine metal frame and adjustable nose pads, fitted with green mineral lenses.",
    details: [
      "Rose-gold metal frame",
      "Green mineral glass lenses, 100% UV protection",
      "Adjustable nose pads",
      "Leather case included",
      "Made in Italy",
    ],
    images: [
      {
        src: unsplash("1511499767150-a48a237f0083", 1200),
        alt: "Round sunglasses with thin rose-gold frames and green lenses",
      },
      {
        src: unsplashDetail("1511499767150-a48a237f0083", 0.35, 0.6, 2.5),
        alt: "Close-up of a green lens and the bridge",
      },
      {
        src: unsplashDetail("1511499767150-a48a237f0083", 0.62, 0.55, 3),
        alt: "Close-up of the rose-gold hinge and temple",
      },
    ],
  },
  {
    slug: "brera-pointed-pump",
    name: "Brera pointed pump",
    category: "Shoes",
    price: 890,
    color: "Ivory",
    stock: 0,
    badge: "New",
    description:
      "A pointed pump in grained leather on a slim 85 mm heel, with a padded leather insole.",
    details: [
      "Grained calfskin upper",
      "Leather lining and sole",
      "85 mm heel",
      "Padded insole",
      "Made in Italy",
    ],
    sizes: shoeSizes,
    images: [
      {
        src: unsplash("1535043934128-cf0b28d52f95", 1200),
        alt: "Pair of ivory pointed-toe pumps",
      },
      {
        src: unsplashDetail("1535043934128-cf0b28d52f95", 0.3, 0.55, 2),
        alt: "Close-up of the pointed toe and grained leather",
      },
      {
        src: unsplashDetail("1535043934128-cf0b28d52f95", 0.75, 0.45, 2.5),
        alt: "Close-up of the slim heel",
      },
    ],
  },
  {
    slug: "navigli-suede-brogue",
    name: "Navigli suede brogue",
    category: "Shoes",
    price: 940,
    color: "Sage green",
    stock: 6,
    description:
      "A wingtip brogue in brushed suede with hand-punched perforations and a stacked leather heel.",
    details: [
      "Brushed suede upper",
      "Hand-punched brogue detailing",
      "Leather lining, stacked leather heel",
      "Blake-stitched leather sole",
      "Made in Italy",
    ],
    sizes: shoeSizes,
    images: [
      {
        src: unsplash("1560343090-f0409e92791a", 1200),
        alt: "Green suede brogue with a tan sole",
      },
      {
        src: unsplashDetail("1560343090-f0409e92791a", 0.75, 0.62, 2.2),
        alt: "Close-up of the brogue perforations on the toe",
      },
      {
        src: unsplashDetail("1560343090-f0409e92791a", 0.35, 0.7, 2),
        alt: "Close-up of the stacked leather heel",
      },
    ],
  },
  {
    slug: "ruggine-bomber-jacket",
    name: "Ruggine bomber jacket",
    category: "Ready-to-wear",
    price: 2100,
    color: "Rust",
    stock: 3,
    description:
      "A lightweight bomber in washed silk twill with ribbed trims and a two-way zip.",
    details: [
      "100% silk twill, cupro lining",
      "Ribbed collar, cuffs and hem",
      "Two-way zip, side welt pockets",
      "Relaxed fit",
      "Made in Italy",
    ],
    sizes: clothingSizes,
    images: [
      {
        src: unsplash("1591047139829-d91aecb6caea", 1200),
        alt: "Rust-colored bomber jacket on a hanger",
      },
      {
        src: unsplashDetail("1591047139829-d91aecb6caea", 0.45, 0.3, 2.5),
        alt: "Close-up of the ribbed collar and zip",
      },
      {
        src: unsplashDetail("1591047139829-d91aecb6caea", 0.45, 0.7, 2),
        alt: "Close-up of the ribbed hem and side pocket",
      },
    ],
  },
  {
    slug: "fringed-knit-poncho",
    name: "Fringed knit poncho",
    category: "Ready-to-wear",
    price: 1380,
    color: "Cream",
    stock: 9,
    description:
      "A V-neck poncho hand-knitted in an open cotton stitch and finished with a long fringed hem.",
    details: [
      "Cotton and linen blend",
      "Hand-knitted open stitch",
      "Fringed hem",
      "One size fits IT 38–46",
      "Made in Italy",
    ],
    images: [
      {
        src: unsplash("1434389677669-e08b4cac3105", 1200),
        alt: "Cream hand-knit poncho with a fringed hem on a wooden hanger",
      },
      {
        src: unsplashDetail("1434389677669-e08b4cac3105", 0.5, 0.45, 2.5),
        alt: "Close-up of the open knit stitch",
      },
      {
        src: unsplashDetail("1434389677669-e08b4cac3105", 0.5, 0.85, 2.5),
        alt: "Close-up of the fringed hem",
      },
    ],
  },
  {
    slug: "cipria-tapered-trouser",
    name: "Cipria tapered trouser",
    category: "Ready-to-wear",
    price: 980,
    color: "Powder pink",
    stock: 11,
    description:
      "A high-rise trouser in fluid crepe with an elasticated waist, patch pockets and cuffed ankles.",
    details: [
      "Viscose crepe",
      "Elasticated waistband",
      "Front patch pockets",
      "Tapered leg with cuffed ankles",
      "Made in Italy",
    ],
    sizes: clothingSizes,
    images: [
      {
        src: unsplash("1594633312681-425c7b97ccd1", 1200),
        alt: "Powder-pink tapered trousers with cuffed ankles",
      },
      {
        src: unsplashDetail("1594633312681-425c7b97ccd1", 0.45, 0.2, 2.5),
        alt: "Close-up of the elasticated waist and patch pockets",
      },
      {
        src: unsplashDetail("1594633312681-425c7b97ccd1", 0.45, 0.8, 2.5),
        alt: "Close-up of the cuffed ankle",
      },
    ],
  },
  {
    slug: "giardino-stiletto",
    name: "Giardino stiletto",
    category: "Shoes",
    price: 1050,
    color: "Blue floral",
    stock: 1,
    description:
      "A stiletto pump covered in floral-printed satin on a 105 mm heel.",
    details: [
      "Printed silk satin upper",
      "Leather lining and sole",
      "105 mm heel",
      "Made in Italy",
    ],
    sizes: shoeSizes,
    images: [
      {
        src: unsplash("1543163521-1bf539c55dd2", 1200),
        alt: "Floral-print stiletto heels on a pale blue background",
      },
      {
        src: unsplashDetail("1543163521-1bf539c55dd2", 0.6, 0.25, 2.2),
        alt: "Close-up of the stiletto heel and floral print",
      },
      {
        src: unsplashDetail("1543163521-1bf539c55dd2", 0.4, 0.7, 2.2),
        alt: "Close-up of the printed satin toe",
      },
    ],
  },
];

export const categories: SeedCategory[] = [
  {
    slug: "ready-to-wear",
    name: "Ready-to-wear",
    image: unsplash("1551488831-00ddcb6c6bd3", 900),
    alt: "Leather, knit and denim jackets on a clothing rail",
  },
  {
    slug: "bags",
    name: "Bags",
    image: unsplash("1590874103328-eac38a683ce7", 900),
    alt: "Woven wicker handbag with a tan leather handle",
  },
  {
    slug: "shoes",
    name: "Shoes",
    image: unsplash("1614252235316-8c857d38b5f4", 900),
    alt: "Close-up of a polished brown leather lace-up shoe",
  },
  {
    slug: "jewelry",
    name: "Jewelry",
    image: unsplash("1617038220319-276d3cfab638", 900),
    alt: "Gold hoop earrings resting on a white stone",
  },
  {
    slug: "eyewear",
    name: "Eyewear",
  },
];
