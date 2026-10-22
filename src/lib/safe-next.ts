// Post-auth redirects come from the `?next=` query string, which anyone can
// craft. Only same-origin paths are allowed: "//evil.example" and
// "/\evil.example" are protocol-relative to browsers, and browsers strip tabs
// and newlines, so "/\t/evil.example" becomes "//evil.example".
const SAME_ORIGIN_PATH = /^\/(?![/\\])[^\\\s]*$/;

export function safeNext(value: unknown, fallback = "/account") {
  return typeof value === "string" && SAME_ORIGIN_PATH.test(value) ? value : fallback;
}
