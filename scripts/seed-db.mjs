/**
 * Puts the three seed listings into Supabase.
 *
 * Run once after creating the tables:
 *   npm run db:seed
 *
 * Listings only — no findings. Checking one in the app is what writes an
 * investigation, and watching that happen is the demo. Seeding the findings
 * too would skip the part worth showing.
 *
 * Safe to re-run: listings upsert on source_url.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = (() => {
  try {
    return Object.fromEntries(
      readFileSync(new URL("../.env.local", import.meta.url), "utf8")
        .split("\n")
        .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
        .map((line) => {
          const i = line.indexOf("=");
          return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
})();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

// Imported through a tiny shim so this stays a plain .mjs script: the seed file
// is TypeScript, so read the values rather than importing it.
const seedSource = readFileSync(new URL("../lib/seedListings.ts", import.meta.url), "utf8");
const rows = [];
for (const block of seedSource.split(/\n  \{\n/).slice(1)) {
  const pick = (field, re) => {
    const m = block.match(re);
    return m ? m[1] : null;
  };
  const photos = [...block.matchAll(/"(https:\/\/images\.craigslist\.org\/[^"]+)"/g)].map((m) => m[1]);
  const coords = block.match(/coords:\s*\[(-?[\d.]+),\s*(-?[\d.]+)\]/);

  rows.push({
    source_url: pick("sourceUrl", /sourceUrl:\s*\n?\s*"([^"]+)"/),
    title: pick("title", /title:\s*"([^"]+)"/),
    body_price: Number(pick("bodyPrice", /bodyPrice:\s*(\d+)/)),
    title_price: pick("titlePrice", /titlePrice:\s*(\d+)/)
      ? Number(pick("titlePrice", /titlePrice:\s*(\d+)/))
      : null,
    bedrooms: Number(pick("bedrooms", /bedrooms:\s*(\d+)/)),
    bathrooms: Number(pick("bathrooms", /bathrooms:\s*(\d+)/)),
    address: pick("address", /address:\s*"([^"]+)"/),
    address_status: /addressStatus:\s*"on-request"/.test(block) ? "on-request" : "published",
    lng: coords ? Number(coords[1]) : null,
    lat: coords ? Number(coords[2]) : null,
    photos,
    verified: false,
  });
}

const valid = rows.filter((r) => r.source_url && Number.isFinite(r.body_price));
if (valid.length === 0) {
  console.error("Parsed no listings out of lib/seedListings.ts");
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await client
  .from("listings")
  .upsert(valid, { onConflict: "source_url" })
  .select("id, title, address");

if (error) {
  console.error("Seed failed: " + error.message);
  if (error.message.includes("row-level security")) {
    console.error("The insert policy from the setup SQL is probably missing.");
  }
  process.exit(1);
}

console.log(`Seeded ${data.length} listings:`);
for (const row of data) console.log(`  ${row.title} — ${row.address ?? "no address"}`);
console.log("\nOpen the app and check one to see an investigation stored against it.");
