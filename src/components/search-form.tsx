import Form from "next/form";
import { SearchIcon } from "@/components/icons";
import { SEARCH_MAX_LENGTH } from "@/db/queries/catalog";

/** GET form to /search: client-side navigation, and works without JavaScript. */
export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form action="/search" role="search" className="flex w-full max-w-xl">
      <label htmlFor="search-query" className="sr-only">
        Search products
      </label>
      <input
        id="search-query"
        type="search"
        name="q"
        defaultValue={defaultValue}
        maxLength={SEARCH_MAX_LENGTH}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Search coats, bags, shoes…"
        className="field min-w-0"
      />
      <button type="submit" className="btn btn-primary shrink-0 px-5" aria-label="Search">
        <SearchIcon />
      </button>
    </Form>
  );
}
