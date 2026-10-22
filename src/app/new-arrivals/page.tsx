import type { Metadata } from "next";
import { ProductListing } from "@/components/product-listing";
import { getNewArrivals } from "@/db/queries/catalog";

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The latest ready-to-wear, leather goods, shoes and jewelry from Atelier.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals();

  return (
    <main className="section container-page flex-1">
      <ProductListing
        title="New arrivals"
        description="The latest pieces from the atelier, in store and online now."
        products={products}
        emptyAction={{ href: "/#categories", label: "Shop by category" }}
      />
    </main>
  );
}
