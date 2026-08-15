/**
 * Verifies the HUD Fair Market Rent path end to end: pin -> county -> rent.
 *
 * Run after adding HUD_API_TOKEN to .env.local:
 *   npm run check:hud
 *
 * It prints the raw HUD payload as well as the parsed figure, so if their
 * response shape differs from the documented one, the difference is visible
 * immediately rather than surfacing as a silent "not run" in the UI.
 */
import { readFileSync } from "node:fs";

const AUSTIN_PIN = { lat: 30.287196, lng: -97.726743 }; // 926 E Dean Keeton

function tokenFromEnvFile() {
  if (process.env.HUD_API_TOKEN) return process.env.HUD_API_TOKEN;
  try {
    const line = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split("\n")
      .find((l) => l.trim().startsWith("HUD_API_TOKEN="));
    const value = line?.split("=").slice(1).join("=").trim();
    return value || null;
  } catch {
    return null;
  }
}

const token = tokenFromEnvFile();
if (!token) {
  console.error("No HUD_API_TOKEN found in .env.local or the environment.");
  console.error("Register free at https://www.huduser.gov/hudapi/public/register");
  process.exit(1);
}

const censusParams = new URLSearchParams({
  x: String(AUSTIN_PIN.lng),
  y: String(AUSTIN_PIN.lat),
  benchmark: "Public_AR_Current",
  vintage: "Current_Current",
  layers: "Counties",
  format: "json",
});

const census = await fetch(
  `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?${censusParams}`,
).then((r) => r.json());

const county = census?.result?.geographies?.Counties?.[0];
if (!county?.GEOID) {
  console.error("Census geocoder did not return a county. Response:");
  console.error(JSON.stringify(census).slice(0, 500));
  process.exit(1);
}
console.log(`County:    ${county.NAME} (GEOID ${county.GEOID})`);

const entityId = `${county.GEOID}99999`;
console.log(`HUD entity: ${entityId}`);

const response = await fetch(`https://www.huduser.gov/hudapi/public/fmr/data/${entityId}`, {
  headers: { Authorization: `Bearer ${token}` },
});

console.log(`HUD HTTP:  ${response.status}`);
const body = await response.text();
if (!response.ok) {
  console.error("HUD rejected the request. Body:");
  console.error(body.slice(0, 800));
  process.exit(1);
}

const payload = JSON.parse(body);
console.log("\n--- raw data ---");
console.log(JSON.stringify(payload.data, null, 2).slice(0, 1200));

const basic = Array.isArray(payload?.data?.basicdata)
  ? payload.data.basicdata[0]
  : payload?.data?.basicdata;

console.log("\n--- parsed ---");
if (!basic) {
  console.error("No basicdata in the response. The parser in lib/checks/market.ts needs updating.");
  process.exit(1);
}
const keys = ["Efficiency", "One-Bedroom", "Two-Bedroom", "Three-Bedroom", "Four-Bedroom"];
for (const key of keys) {
  console.log(`  ${key.padEnd(15)} ${basic[key] ?? "(missing)"}`);
}

const oneBed = Number(basic["One-Bedroom"]);
if (Number.isNaN(oneBed)) {
  console.error("\nCould not read One-Bedroom as a number — field names have changed.");
  process.exit(1);
}
const asking = 1350; // listing 1
const delta = ((asking - oneBed) / oneBed) * 100;
console.log(
  `\nListing 1 asks $${asking}/mo against a $${oneBed} benchmark — ` +
    `${Math.abs(delta).toFixed(0)}% ${delta < 0 ? "below" : "above"}.`,
);
console.log("\nHUD path works. The rent check will run in the app.");
