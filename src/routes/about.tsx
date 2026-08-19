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
        <p className="mt-4 text-base leading-relaxed text-ink">
          My brother was trying to make sense of Canada&rsquo;s Express Entry system. I build
          products. This was, in retrospect, an extremely predictable outcome.
        </p>

        <section className="mt-10">
          <h2 className="display text-xl font-semibold text-ink">What it does</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Enter your CRS score, choose the rounds that apply to you, and see how your score
            compares with recent Express Entry cutoffs.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Want the rabbit hole? <em>History</em> has every IRCC round since 2015, filterable,
            charted, and sourced.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="display text-xl font-semibold text-ink">Where the numbers come from</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Everything here comes from IRCC&rsquo;s own data and is refreshed daily. If CRS
            Compass and the Government of Canada ever disagree, Canada wins.
          </p>
          <ul className="mt-4 space-y-2">
            <li>
              <SecondaryLink
                href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html"
                target="_blank"
              >
                IRCC &mdash; rounds of invitations &rarr;
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
                IRCC &mdash; category-based selection &rarr;
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
          <h2 className="display text-xl font-semibold text-ink">One important caveat</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            CRS Compass gives you context, not immigration advice. Historical cutoffs don&rsquo;t
            predict future draws, and data can occasionally be delayed or incomplete.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Before making any important decisions, verify against IRCC or speak with a licensed
            immigration professional.
          </p>
        </section>
      </div>
    </div>
  );
}
