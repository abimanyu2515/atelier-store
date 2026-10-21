// Catalog types, formatting helpers and editorial content. Products and
// categories live in the database; see src/db/queries/catalog.ts.

export type ProductImage = {
  src: string;
  alt: string;
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  price: number;
  color: string;
  description: string;
  details: string[];
  /** Units available across all sizes; 0 means sold out. */
  stock: number;
  sizes?: { system: "EU" | "IT"; values: readonly string[] };
  /** First image is the listing image; the rest are detail shots. */
  images: ProductImage[];
  badge?: string;
};

export type Category = {
  slug: string;
  name: string;
  image: string;
  alt: string;
};

export type Collection = {
  slug: string;
  name: string;
  season: string;
  description: string;
};

/** Unsplash CDN URL, pre-sized so the image optimizer never pulls the original. */
export function unsplash(id: string, width = 1600) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;
}

const priceFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number) {
  return priceFormat.format(price);
}

export type StockState =
  | { status: "in-stock"; label: string }
  | { status: "low-stock"; label: string }
  | { status: "sold-out"; label: string };

const LOW_STOCK_THRESHOLD = 3;

export function getStockState(stock: number): StockState {
  if (stock <= 0) return { status: "sold-out", label: "Sold out" };
  if (stock <= LOW_STOCK_THRESHOLD) {
    return { status: "low-stock", label: `Only ${stock} left` };
  }
  return { status: "in-stock", label: "In stock" };
}

export const navigation = [
  { label: "New in", href: "/#new-in" },
  { label: "Women", href: "/#women" },
  { label: "Men", href: "/#men" },
  { label: "Bags", href: "/#categories" },
  { label: "Shoes", href: "/#categories" },
  { label: "Jewelry", href: "/#categories" },
  { label: "Gifts", href: "/#new-in" },
];

export const heroImages = [
  {
    image: unsplash("1539109136881-3be0616acf4b", 2000),
    alt: "Woman in a pale blue wool coat on the piazza in front of Milan Cathedral",
  },
  {
    image: unsplash("1617019114583-affb34d1b3cd", 2000),
    alt: "Woman in an oversized white shirt dress and dark sunglasses against sandstone walls",
  },
];

export const featuredCollection: Collection = {
  slug: "duomo",
  name: "The Duomo edit",
  season: "Autumn–Winter 2026",
  description:
    "Soft tailoring, hand-finished leather and sculpted shoes, photographed in Milan.",
};

export const departments = [
  {
    id: "women",
    name: "Women",
    image: unsplash("1595777457583-95e059d581b8", 1400),
    alt: "Woman in a flowing red gown on a stone terrace",
  },
  {
    id: "men",
    name: "Men",
    image: unsplash("1617137968427-85924c800a22", 1400),
    alt: "Man in a navy suit and tan shoes walking past a glass facade",
  },
];

export const capsule = {
  name: "Oxblood",
  description:
    "A capsule of coats, gloves and knitwear in one deep red, cut in double-faced wool and lined in silk.",
  image: unsplash("1483985988355-763728e1935b", 1400),
  alt: "Woman in an oxblood wool coat, leather gloves and sunglasses carrying shopping bags",
};

export const appointment = {
  image: unsplash("1445205170230-053b83016050", 2000),
  alt: "Rail of camel and ivory coats inside a warmly lit boutique",
};
