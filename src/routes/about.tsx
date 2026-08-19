import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EVENTS, capture } from "@/lib/analytics";
import { SecondaryLink } from "@/components/CTA";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CRS Compass — sources and how the data works" },
      {
        name: "description",
        content:
          "Common questions about Canadian Express Entry, with links to the official IRCC sources. Plus why this tracker exists.",
      },
      { property: "og:title", content: "About CRS Compass" },
      {
        property: "og:description",
        content:
          "Canadian Express Entry answered by IRCC, not by us. Plus a note on why a sibling built this.",
      },
    ],
  }),
  component: About,
});

interface FAQ {
  q: string;
  short: string;
  links: { label: string; href: string }[];
}

const FAQS: FAQ[] = [
  {
    q: "What is Express Entry, in one sentence?",
    short:
      "Canada's ranked pool for skilled workers applying for permanent residence — you submit a profile, get a score, and wait to be invited.",
    links: [
      {
        label: "IRCC — how Express Entry works",
        href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
      },
    ],
  },
  {
    q: "What is CRS?",
    short:
      "The Comprehensive Ranking System — a 0–1200 score IRCC uses to rank candidates. Points come from age, education, language, work experience and a few bonuses.",
    links: [
      {
        label: "IRCC — full CRS criteria",
        href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/criteria-comprehensive-ranking-system.html",
      },
      {
        label: "IRCC — official CRS calculator",
        href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/criteria-comprehensive-ranking-system/tool.html",
      },
    ],
  },
  {
    q: "How does IRCC decide who gets invited?",
    short:
      "Periodically IRCC picks a number of candidates from the pool and invites the top-ranked ones in a specific round. The cutoff is whatever the last-invited person scored — it is an outcome, not a target.",
    links: [
      {
        label: "IRCC — rounds of invitations",
        href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html",
      },
    ],
  },
  {
    q: "Why are PNP cutoffs so much higher than everything else?",
    short:
      "Because every candidate in a PNP round has already received a 600-point nomination bonus. It is not that PNP candidates are extraordinary — they are all carrying the same +600. Never compare PNP cutoffs to CEC or category-based ones without understanding this.",
    links: [
      {
        label: "IRCC — Provincial Nominee Program",
        href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html",
      },
    ],
  },
  {
    q: "How do I improve my CRS score?",
    short:
      "Better language results, additional work experience, higher education, and a few structural factors. IRCC has a page on exactly this.",
    links: [
      {
        label: "IRCC — improve your ranking",
        href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/criteria-comprehensive-ranking-system/improve-score.html",
      },
    ],
  },
  {
    q: "Can anyone predict the next cutoff?",
    short:
      "No. Not us, not anyone. The cutoff is set after IRCC decides how many people to invite in a round. Anyone claiming to predict it is guessing.",
    links: [],
  },
  {
    q: "Where do the category-based eligibility criteria come from?",
    short:
      "IRCC publishes specific criteria for each category (French language, Healthcare, STEM, etc.). This site does not check whether you actually qualify — the chips are what you tell us.",
    links: [
      {
        label: "IRCC — category-based selection",
        href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html",
      },
    ],
  },
  {
    q: "Is there a cutoff “for Ontario” or any other province?",
    short:
      "No. Federal Express Entry is a single national pool. Provincial programs are separate and out of scope here.",
    links: [],
  },
  {
    q: "Where does the data on this site come from?",
    short:
      "Directly from IRCC's own JSON feed, pulled once a day. If a number here ever disagrees with the official page, trust the official page.",
    links: [
      {
        label: "IRCC — official rounds of invitations",
        href: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html",
      },
      {
        label: "Source code on GitHub",
        href: "https://github.com/wishmur/crs-compass",
      },
    ],
  },
];

function About() {
  useEffect(() => {
    capture(EVENTS.ABOUT_VIEWED);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 pb-6 sm:pt-14">
      <div className="mx-auto max-w-3xl">
        <p className="kicker">About</p>
        <h1 className="display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          About CRS Compass
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Common questions about Canadian Express Entry, with links to the official IRCC pages
          that actually answer them.
        </p>

        {/* Why was this made? */}
        <section
          className="mt-8 rounded-[var(--radius)] p-5 sm:p-6"
          style={{ backgroundColor: "var(--brand-soft)" }}
        >
          <p className="kicker">Why was this made?</p>
          <p className="mt-3 text-base leading-relaxed text-ink">
            A sibling built this for another sibling navigating Canada&rsquo;s Express Entry pool
            &mdash; after one too many conversations that ended with &ldquo;so where do I
            actually stand?&rdquo; Now the answer is a page.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <p className="kicker">Common questions</p>
          <h2 className="display mt-2 text-2xl font-semibold text-ink">
            Answered by IRCC, not by us.
          </h2>

          <div className="mt-6 divide-y divide-[var(--rule)]">
            {FAQS.map((f) => (
              <article key={f.q} className="py-5">
                <h3 className="display text-lg font-semibold text-ink">{f.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.short}</p>
                {f.links.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {f.links.map((l) => (
                      <li key={l.href}>
                        <SecondaryLink href={l.href} target="_blank">
                          {l.label} &rarr;
                        </SecondaryLink>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mt-12">
          <p className="kicker">One more thing</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This is an information tool built by a person, not immigration advice. Data may be
            delayed or incomplete. Always verify with the official Canadian government resources
            &mdash; or a licensed immigration consultant &mdash; before making decisions that
            depend on it.
          </p>
        </section>
      </div>
    </div>
  );
}
