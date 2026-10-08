import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normaliseOrigin } from "./site";

// Context: a redeploy failed immediately after NEXT_PUBLIC_SITE_URL was set in
// the Vercel dashboard. That value is read at BUILD time (layout.tsx uses it as
// `new URL(SITE_URL)` for metadataBase), so a malformed paste threw and took the
// whole build down — after the variable had been set "correctly".
//
// These pin the shapes a dashboard field actually receives, because the fix is
// to normalise rather than to fail a deploy over a formatting character.
//
// Real behaviour, not source grepping: every case calls the same function the
// module uses at load.
describe("normaliseOrigin — what a dashboard field actually receives", () => {
  it("keeps a clean origin unchanged", () => {
    assert.equal(normaliseOrigin("https://jeb-online.vercel.app"), "https://jeb-online.vercel.app");
  });

  it("drops a trailing slash (the instruction said not to add one; people do)", () => {
    assert.equal(normaliseOrigin("https://jeb-online.vercel.app/"), "https://jeb-online.vercel.app");
  });

  it("survives surrounding whitespace and newlines from a copy-paste", () => {
    assert.equal(normaliseOrigin("  https://jeb-online.vercel.app \n"), "https://jeb-online.vercel.app");
    assert.equal(normaliseOrigin("\thttps://jeb-online.vercel.app\r\n"), "https://jeb-online.vercel.app");
  });

  it("unwraps a markdown-styled paste, which is how link text arrives", () => {
    assert.equal(
      normaliseOrigin("[https://jeb-online.vercel.app](https://jeb-online.vercel.app)"),
      "https://jeb-online.vercel.app"
    );
  });

  it("adds the scheme when only a host was pasted", () => {
    assert.equal(normaliseOrigin("jeb-online.vercel.app"), "https://jeb-online.vercel.app");
  });

  it("discards a path, query or hash — a canonical origin has none", () => {
    assert.equal(normaliseOrigin("https://example.com/shop"), "https://example.com");
    assert.equal(normaliseOrigin("https://example.com/?utm=1"), "https://example.com");
    assert.equal(normaliseOrigin("https://example.com/#top"), "https://example.com");
  });

  it("lowercases the host and drops a default port", () => {
    assert.equal(normaliseOrigin("https://JEB-Online.Vercel.App"), "https://jeb-online.vercel.app");
    assert.equal(normaliseOrigin("https://example.com:443"), "https://example.com");
  });

  it("falls back to the default for empty, whitespace or junk", () => {
    assert.equal(normaliseOrigin(undefined), "http://localhost:3000");
    assert.equal(normaliseOrigin(""), "http://localhost:3000");
    assert.equal(normaliseOrigin("   "), "http://localhost:3000");
    assert.equal(normaliseOrigin("not a url at all"), "http://localhost:3000");
    assert.equal(normaliseOrigin("http://"), "http://localhost:3000");
  });

  it("never throws — the property that matters most, since it runs at build time", () => {
    for (const value of [
      undefined,
      "",
      "  ",
      "/",
      "://",
      "https://",
      "[a](b)",
      "%%%",
      "https://exa mple.com",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "x".repeat(5000),
    ]) {
      assert.doesNotThrow(() => normaliseOrigin(value), `threw on ${JSON.stringify(value)}`);
      const result = normaliseOrigin(value);
      assert.ok(
        result.startsWith("http://") || result.startsWith("https://"),
        `returned a non-http value for ${JSON.stringify(value)}: ${result}`
      );
      // Whatever comes back must be usable as `new URL(...)`.
      assert.doesNotThrow(() => new URL(result));
    }
  });
});
