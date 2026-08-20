"use client";

import { FmrLadder } from "@/components/checks/FmrLadder";
import { PinMap } from "@/components/checks/PinMap";
import type { Finding, FindingState } from "@/lib/checks/types";

/**
 * The findings, rendered as claim against record.
 *
 * Shared between the checker and a listing's detail panel, because a student
 * arriving at a listing from the map should see exactly what the student who
 * checked it saw — not a summary of it.
 */

const STATE_LABEL: Record<FindingState, string> = {
  found: "Checked",
  "not-found": "No record",
  skipped: "Not run",
  error: "Failed",
};

// One neutral treatment for every state. Colouring "found" green would turn a
// lookup that merely succeeded into a reassurance.
const CHIP =
  "shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-600";

const SECTION_LABEL =
  "text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400";

export function FindingList({ findings }: { findings: Finding[] }) {
  return (
    <div className="space-y-8">
      {findings.map((finding) => (
        <section key={finding.id}>
          <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-2">
            <h4 className={SECTION_LABEL}>{finding.label}</h4>
            <span className={CHIP}>{STATE_LABEL[finding.state]}</span>
          </div>

          {finding.claim && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className={SECTION_LABEL}>The post says</p>
                <p className="mt-1 text-sm text-neutral-900">{finding.claim}</p>
              </div>
              <div>
                <p className={SECTION_LABEL}>{finding.foundLabel ?? "Records say"}</p>
                <p className="mt-1 text-sm text-neutral-900">{finding.found ?? "—"}</p>
              </div>
            </div>
          )}

          {finding.data?.kind === "fmr-ladder" && (
            <FmrLadder
              bars={finding.data.bars}
              listingPrice={finding.data.listingPrice}
              area={finding.data.area}
              year={finding.data.year}
            />
          )}
          {finding.data?.kind === "pin-map" && (
            <PinMap
              pin={finding.data.pin}
              geocoded={finding.data.geocoded}
              miles={finding.data.miles}
              address={finding.data.address}
            />
          )}

          {finding.note && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-800">
              {finding.note}
            </p>
          )}
          {finding.reason && (
            <p className="mt-3 text-sm text-neutral-500">{finding.reason}</p>
          )}

          {finding.why && (
            <details className="group mt-3">
              <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400 hover:text-neutral-700">
                <span className="inline-block transition-transform group-open:rotate-90">›</span>{" "}
                Why this matters
              </summary>
              <p className="mt-2 border-l-2 border-neutral-200 pl-3 text-sm leading-relaxed text-neutral-600">
                {finding.why}
              </p>
            </details>
          )}

          {finding.source && (
            <p className="mt-3 text-[11px] text-neutral-400">
              Source:{" "}
              {finding.source.url ? (
                <a
                  href={finding.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-neutral-700"
                >
                  {finding.source.label}
                </a>
              ) : (
                finding.source.label
              )}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
