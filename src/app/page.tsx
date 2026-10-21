import Image from "next/image";
import { ProductCard } from "@/components/product-card";
import { getHomeCategories, getProducts } from "@/db/queries/catalog";
import {
  appointment,
  capsule,
  departments,
  featuredCollection,
  heroImages,
} from "@/lib/catalog";

export default async function Home() {
  const [products, categories] = await Promise.all([getProducts(), getHomeCategories()]);

  return (
    <main className="flex-1">
      {/* Campaign hero: one image on mobile, a diptych from md */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="absolute inset-0 -z-10 grid md:grid-cols-2">
          {heroImages.map((hero, i) => (
            <div
              key={hero.image}
              className={`relative overflow-hidden ${i > 0 ? "hidden md:block" : ""}`}
            >
              <Image
                src={hero.image}
                alt={hero.alt}
                fill
                loading="eager"
                fetchPriority={i === 0 ? "high" : "auto"}
                sizes="(width >= 48rem) 50vw, 100vw"
                className="animate-settle object-cover"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
        <div className="hero-content animate-rise">
          <p className="text-sm">{featuredCollection.season}</p>
          <h1 id="hero-title" className="type-display-xl">
            Duomo
          </h1>
          <p className="type-body max-w-md text-white/85">
            {featuredCollection.description}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <a href="#women" className="btn btn-overlay">
              Shop women
            </a>
            <a href="#men" className="btn btn-overlay">
              Shop men
            </a>
          </div>
        </div>
      </section>

      {/* Women / men */}
      <section className="editorial-split" aria-label="Departments">
        {departments.map((dept) => (
          <a
            key={dept.id}
            id={dept.id}
            href="#"
            className="group relative isolate block aspect-portrait overflow-hidden bg-surface md:aspect-auto md:h-[min(85svh,56rem)]"
          >
            <Image
              src={dept.image}
              alt={dept.alt}
              fill
              sizes="(width >= 48rem) 50vw, 100vw"
              className="-z-10 object-cover transition-transform duration-1000 ease-luxe group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/45 to-transparent to-50%" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-gutter pb-10 text-center text-white lg:pb-14">
              <h2 className="type-heading">{dept.name}</h2>
              <span className="type-label underline decoration-1 underline-offset-[0.6em]">
                Shop {dept.name.toLowerCase()}
              </span>
            </div>
          </a>
        ))}
      </section>

      {/* Featured collection */}
      <section id="new-in" className="section container-page" aria-labelledby="featured-title">
        <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-xl flex-col gap-3">
            <h2 id="featured-title" className="type-heading">
              {featuredCollection.name}
            </h2>
            <p className="type-body text-muted-foreground">
              {products.length} pieces from the {featuredCollection.season.toLowerCase()}{" "}
              collection, in store and online now.
            </p>
          </div>
          <a href="#" className="btn btn-ghost self-start md:self-auto">
            Shop the collection
          </a>
        </div>
        <div className="product-grid -mx-gutter lg:mx-0">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      {/* Capsule story */}
      <section className="editorial-split" aria-labelledby="capsule-title">
        <div className="relative aspect-portrait bg-surface md:aspect-auto md:h-[min(85svh,56rem)]">
          <Image
            src={capsule.image}
            alt={capsule.alt}
            fill
            sizes="(width >= 48rem) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="theme-inverse flex flex-col items-center justify-center gap-6 px-gutter py-16 text-center">
          <p className="text-sm text-muted-foreground">The capsule</p>
          <h2 id="capsule-title" className="type-display">
            {capsule.name}
          </h2>
          <p className="type-body max-w-sm text-muted-foreground">{capsule.description}</p>
          <a href="#" className="btn btn-secondary mt-2">
            Discover the capsule
          </a>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="section container-page" aria-labelledby="categories-title">
        <h2 id="categories-title" className="type-heading mb-8 md:mb-12">
          Shop by category
        </h2>
        <ul className="-mx-gutter grid grid-cols-2 gap-x-(--grid-gap-x) gap-y-8 lg:mx-0 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.slug}>
              <a href="#" className="group flex flex-col gap-3">
                <div className="media-frame aspect-portrait">
                  <Image
                    src={category.image}
                    alt={category.alt}
                    fill
                    sizes="(width >= 64rem) 25vw, 50vw"
                  />
                </div>
                <span className="type-title px-1 group-hover:underline group-hover:underline-offset-4 lg:px-0">
                  {category.name}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Appointment band */}
      <section
        id="appointment"
        className="hero h-[80svh] min-h-[28rem]"
        aria-labelledby="appointment-title"
      >
        <Image src={appointment.image} alt={appointment.alt} fill sizes="100vw" />
        <div className="absolute inset-0 -z-10 bg-black/50" />
        <div className="hero-content top-0 justify-center">
          <h2 id="appointment-title" className="type-display">
            Fitted by hand in Milan
          </h2>
          <p className="type-body max-w-md text-white/85">
            Book a private appointment at the Via Montenapoleone atelier for alterations,
            made-to-measure tailoring and gift wrapping.
          </p>
          <a href="#" className="btn btn-overlay mt-2">
            Book an appointment
          </a>
        </div>
      </section>
    </main>
  );
}
