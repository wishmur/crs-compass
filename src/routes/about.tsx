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
