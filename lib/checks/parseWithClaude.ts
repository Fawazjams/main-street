import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ParsedListing } from "./types";

/**
 * Reads a listing that did not come from Craigslist.
 *
 * Craigslist has one stable markup shape, so `parseListing.ts` handles it with
 * regex and costs nothing. Everywhere else - PadMapper, Zumper, a university
 * housing board, a property manager's own site, or text a student pasted out of
 * a Facebook post - the shape is arbitrary, and that is the job a model is
 * genuinely better at than a parser we would have to write per site.
 *
 * The schema is pinned with structured outputs rather than asked for politely.
 * That is the direct lesson from the Autumn run: an agent handed an explicit
 * field list invented its own anyway. `output_config.format` makes the response
 * shape a constraint instead of a request.
 */

const ExtractedListing = z.object({
  title: z.string().nullable(),
  price: z.number().nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  sqft: z.number().nullable(),
  address: z.string().nullable(),
  applicationFee: z.string().nullable(),
  contactName: z.string().nullable(),
  contactOrg: z.string().nullable(),
  phones: z.array(z.string()),
  emails: z.array(z.string()),
  postedAt: z.string().nullable(),
  description: z.string().nullable(),
});

const SYSTEM = `You extract rental listing details from a page or from text a student pasted.

This feeds a tool that checks listings against public records, so a wrong value is worse than a missing one. An invented address sends someone to look up the wrong property.

Rules:
- Only report what the source actually states. Use null when something is absent.
- Never infer, estimate, complete, or correct a value. If the address is partial, return the partial text as written.
- price is the monthly rent as a plain number, no currency symbol or separators. If the source gives several prices, use the one for the specific unit advertised. If it gives a range, use the lowest.
- address is the street address only as written, not a neighbourhood, city, or "near campus" phrasing. Null unless a real street address appears.
- contactName is a person named as the contact. contactOrg is a company or agency. Null if the page only shows a generic form or relay.
- description is the poster's own body text, verbatim, not a summary and not page furniture like nav links or cookie notices.
- postedAt is ISO 8601 if a post date appears, else null.`;

export const claudeConfigured = () => !!process.env.ANTHROPIC_API_KEY;

/**
 * Haiku by default.
 *
 * The schema is already pinned by structured outputs, so the model is doing
 * transcription against a fixed shape rather than reasoning - the task class
 * small models are strongest at. Opus also runs adaptive thinking by default,
 * which bills reasoning tokens at Opus output rates for a job that needs none.
 *
 * Override with ANTHROPIC_MODEL when accuracy on a gnarly page matters more
 * than the roughly five-fold cost difference.
 */
const model = () => process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

/**
 * Re-reading the same listing costs nothing.
 *
 * In memory, so it dies with the server - this is the seed of the cache that
 * belongs in Supabase, where it also becomes the thing that makes a shared map
 * cheap: the second student to open a listing pays nothing to read it.
 */
const cache = new Map<string, ParsedListing>();
const CACHE_MAX = 200;

export async function parseWithClaude(
  source: { kind: "url"; url: string; text: string } | { kind: "text"; text: string },
): Promise<ParsedListing> {
  if (!claudeConfigured()) {
    throw new Error(
      "Reading listings from outside Craigslist needs ANTHROPIC_API_KEY in .env.local.",
    );
  }

  const key = createHash("sha256").update(source.text).digest("hex");
  const hit = cache.get(key);
  if (hit) {
    return { ...hit, url: source.kind === "url" ? source.url : hit.url };
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: model(),
    // The reply is one small JSON object. A high ceiling here would only cap a
    // runaway, and output tokens are the expensive half.
    max_tokens: 1200,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Extract the rental listing from the following.\n\n---\n${source.text}\n---`,
      },
    ],
    output_config: { format: zodOutputFormat(ExtractedListing) },
  });

  const usage = response.usage;
  console.log(
    `[parseWithClaude] ${model()} in=${usage.input_tokens} out=${usage.output_tokens}`,
  );

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Could not read a listing out of that page.");
  }

  const digits = (raw: string) => {
    const only = raw.replace(/\D/g, "");
    return only.length === 11 && only.startsWith("1") ? only.slice(1) : only;
  };

  const listing: ParsedListing = {
    url: source.kind === "url" ? source.url : "",
    title: parsed.title,
    price: parsed.price,
    bedrooms: parsed.bedrooms,
    bathrooms: parsed.bathrooms,
    sqft: parsed.sqft,
    applicationFee: parsed.applicationFee,
    // Only Craigslist publishes a draggable pin, so there is nothing to compare
    // an address against here. The pin-distance check skips rather than guesses.
    pin: null,
    mapAddress: parsed.address,
    body: parsed.description,
    postedAt: parsed.postedAt,
    // Photo URLs are not extracted: a model transcribing image links is exactly
    // where a plausible-looking wrong URL would slip through unnoticed.
    photos: [],
    bodyPhones: parsed.phones.map(digits).filter((d) => d.length === 10),
    bodyEmails: parsed.emails,
    contactName: parsed.contactName,
    contactOrg: parsed.contactOrg,
  };

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, listing);
  return listing;
}
