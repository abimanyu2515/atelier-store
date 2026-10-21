const columns = [
  {
    title: "Client services",
    links: ["Contact us", "Shipping", "Returns", "Size guide", "FAQ"],
  },
  {
    title: "The company",
    links: ["About Atelier", "Craftsmanship", "Sustainability", "Careers"],
  },
  {
    title: "Legal",
    links: ["Privacy policy", "Terms of sale", "Cookie settings", "Accessibility"],
  },
];

export function SiteFooter() {
  return (
    <footer className="theme-inverse">
      <div className="container-page grid gap-10 pt-16 pb-10 md:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:pt-24">
        <form className="flex max-w-sm flex-col gap-4 md:col-span-3 lg:col-span-1" action="#">
          <h2 className="type-title">Sign up for updates</h2>
          <p className="type-body text-muted-foreground">
            New collections, private sales and invitations to atelier events, sent
            twice a month.
          </p>
          <label htmlFor="footer-email" className="sr-only">
            Email address
          </label>
          <div className="flex">
            <input
              id="footer-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="Email address"
              className="field border-border"
            />
            <button type="submit" className="btn btn-secondary shrink-0 border-l-0">
              Sign up
            </button>
          </div>
        </form>

        {columns.map((column) => (
          <div key={column.title} className="flex flex-col gap-4">
            <h2 className="type-label text-muted-foreground">{column.title}</h2>
            <ul className="flex flex-col gap-2.5">
              {column.links.map((link) => (
                <li key={link}>
                  <a href="#" className="link-reveal">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container-page flex flex-col gap-2 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>© 2026 Atelier S.r.l. All rights reserved.</p>
        <p>Shipping to United States, in USD</p>
      </div>

      {/* Full-width wordmark; SVG textLength makes it fit any viewport exactly */}
      <div className="container-page pb-gutter" aria-hidden="true">
        <svg viewBox="0 0 1000 160" className="block w-full fill-current">
          <text
            x="0"
            y="138"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            className="font-sans"
            style={{ fontSize: 190, fontWeight: 500, letterSpacing: "-0.02em" }}
          >
            ATELIER
          </text>
        </svg>
      </div>
    </footer>
  );
}
