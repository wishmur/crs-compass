import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EVENTS, capture } from "@/lib/analytics";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CRS Compass" },
      {
        name: "description",
        content:
          "How this Express Entry tracker works and where its data comes from.",
      },
    ],
  }),
  component: About,
});

interface Source {
  label: string;
  href: string;
}

const SOURCES: Source[] = [
  {
    label: "IRCC — rounds of invitations",
    href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html",
  },
  {
    label: "IRCC — CRS criteria",
    href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/criteria-comprehensive-ranking-system.html",
  },
  {
    label: "IRCC — category-based selection",
    href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html",
  },
  {
    label: "Source code on GitHub",
    href: "https://github.com/wishmur/crs-compass",
  },
];

function About() {
  useEffect(() => {
    capture(EVENTS.ABOUT_VIEWED);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8 pb-6">
      {/* Hero card — mirrors the Home hero's deep-green treatment so About
          reads as part of the same product, not a legal page. */}
      <section
        className="rounded-[calc(var(--radius)*1.5)] px-6 py-12 sm:px-10 sm:py-16"
        style={{ backgroundColor: "var(--brand)", color: "var(--paper)" }}
      >
        <p
          className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase"
          style={{ color: "var(--accent-soft)" }}
        >
          About
        </p>
        <h1
          className="display mt-3 max-w-[22ch] text-[2.5rem] leading-[1.05] font-semibold sm:text-[3rem]"
          style={{ color: "var(--paper)" }}
        >
          About CRS Compass
        </h1>
        <p
          className="display mt-6 max-w-[52ch] text-[1.125rem] leading-[1.5] sm:text-[1.25rem]"
          style={{ color: "rgba(246,241,232,0.92)" }}
        >
          My brother was trying to make sense of Canada&rsquo;s Express Entry system. I build
          products. This was, in retrospect, an extremely predictable outcome.
        </p>
      </section>

      {/* Two-column: What it does + Where the numbers come from */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <article className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--card)] p-6 sm:p-8">
          <p className="kicker">What it does</p>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink">
            Enter your CRS score, choose the rounds that apply to you, and see how your score
            compares with recent Express Entry cutoffs.
          </p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
            Want the rabbit hole? <em>History</em> has every IRCC round since 2015, filterable,
            charted, and sourced.
          </p>
        </article>

        <article className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--card)] p-6 sm:p-8">
          <p className="kicker">Where the numbers come from</p>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink">
            Everything here comes from IRCC&rsquo;s own data and is refreshed daily. If CRS
            Compass and the Government of Canada ever disagree, Canada wins.
          </p>

          <ul className="mt-5 -mx-2 divide-y divide-[var(--rule)]">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex items-center justify-between gap-4 rounded-md px-2 py-3 text-[0.9rem] text-ink transition-colors hover:bg-[var(--brand-soft)]"
                >
                  <span>{s.label}</span>
                  <span
                    aria-hidden
                    className="shrink-0 text-[var(--brand)] transition-transform group-hover:translate-x-0.5"
                  >
                    &rarr;
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {/* Full-width caveat — visible without alarming. Uses --brand-soft for
          subtle contrast; --accent-soft would have read as warning. */}
      <section
        className="mt-5 rounded-[var(--radius)] p-6 sm:p-8"
        style={{ backgroundColor: "var(--brand-soft)" }}
      >
        <p className="kicker">One important caveat</p>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink">
          CRS Compass gives you context, not immigration advice. Historical cutoffs don&rsquo;t
          predict future draws, and data can occasionally be delayed or incomplete.
        </p>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
          Before making any important decisions, verify against IRCC or speak with a licensed
          immigration professional.
        </p>
      </section>
    </div>
  );
}
