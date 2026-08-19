import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EVENTS, capture } from "@/lib/analytics";
import { SecondaryLink } from "@/components/CTA";

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

function About() {
  useEffect(() => {
    capture(EVENTS.ABOUT_VIEWED);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 pb-10 sm:pt-14">
      <div className="mx-auto max-w-4xl">
        <h1 className="display text-3xl font-semibold tracking-tight sm:text-4xl">
          About CRS Compass
        </h1>

        <section
          className="mt-8 rounded-[var(--radius)] p-5 sm:p-6"
          style={{ backgroundColor: "var(--brand-soft)" }}
        >
          <p className="text-base leading-relaxed text-ink">
            A sibling built this for another sibling navigating Canada&rsquo;s Express Entry pool
            &mdash; after one too many conversations that ended with &ldquo;so where do I actually
            stand?&rdquo; Now the answer is a page.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="display text-xl font-semibold text-ink">How this page works</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Enter your CRS score on the home page, tell it which round types actually apply to
            you, and it shows how many recent Express Entry rounds your score was at or above the
            cutoff for. The <em>History</em> page has the full dataset &mdash; every round IRCC
            has published since 2015 &mdash; filterable and charted.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="display text-xl font-semibold text-ink">Where the data comes from</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Every number on this site comes from IRCC&rsquo;s own JSON feed, pulled once a day.
            If anything here disagrees with the official page, trust the official page.
          </p>
          <ul className="mt-4 space-y-2">
            <li>
              <SecondaryLink
                href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html"
                target="_blank"
              >
                IRCC &mdash; official rounds of invitations &rarr;
              </SecondaryLink>
            </li>
            <li>
              <SecondaryLink
                href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/criteria-comprehensive-ranking-system.html"
                target="_blank"
              >
                IRCC &mdash; CRS criteria &rarr;
              </SecondaryLink>
            </li>
            <li>
              <SecondaryLink
                href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html"
                target="_blank"
              >
                IRCC &mdash; category-based selection criteria &rarr;
              </SecondaryLink>
            </li>
            <li>
              <SecondaryLink href="https://github.com/wishmur/crs-compass" target="_blank">
                Source code on GitHub &rarr;
              </SecondaryLink>
            </li>
          </ul>
        </section>

        <section id="methodology" className="mt-10 scroll-mt-24">
          <h2 className="display text-xl font-semibold text-ink">Methodology</h2>
          <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-ink">A &ldquo;relevant draw&rdquo;</strong> is a round
              matching the eligibility you&rsquo;ve selected on Home. General rounds are always
              included. When no program or category is selected, PNP is excluded by default (its
              cutoffs assume the 600-point nomination bonus and would be misleading).
            </li>
            <li>
              <strong className="text-ink">Cutoffs are historical results, not predictions.</strong>{" "}
              The cutoff of the next round is decided after IRCC announces how many people to
              invite in that round. Nobody can forecast it; this site does not try.
            </li>
            <li>
              <strong className="text-ink">Exact-cutoff matches trigger a tie-break.</strong> When
              your score exactly equals a round&rsquo;s cutoff, IRCC uses a profile-submission
              timestamp to decide who gets invited. Those rounds are marked <em>Matched</em> and
              show the published tie-break timestamp. This site does not ask for your submission
              timestamp.
            </li>
            <li>
              <strong className="text-ink">PNP is kept separate.</strong> Every candidate in a PNP
              round carries the 600-point nomination bonus, so PNP cutoffs are not comparable to
              CEC or category-based ones. PNP rounds are only included in your personal view when
              you explicitly say you hold a nomination.
            </li>
            <li>
              <strong className="text-ink">Source: IRCC.</strong> Every number comes from
              IRCC&rsquo;s own JSON feed, pulled once a day. If a number here ever disagrees with
              the official page, trust the official page.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="display text-xl font-semibold text-ink">Not immigration advice</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This is an information tool. Data may be delayed or incomplete. Verify with the
            official Canadian government resources &mdash; or a licensed immigration consultant
            &mdash; before making decisions.
          </p>
        </section>
      </div>
    </div>
  );
}
