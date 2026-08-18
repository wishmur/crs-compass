import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EVENTS, capture } from "@/lib/analytics";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CRS Signal — what it is and isn't" },
      {
        name: "description",
        content:
          "How Express Entry rounds work, why cutoffs differ across round types, the PNP trap, and why nobody can predict the next cutoff.",
      },
      { property: "og:title", content: "About CRS Signal" },
      {
        property: "og:description",
        content:
          "Plain-language explanation of Express Entry rounds, cutoff context, and the limits of this data.",
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
    <article className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">About CRS Signal</h1>

      <h2 className="mt-8 text-lg font-semibold">What Express Entry is</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Express Entry is how Canada manages applications for three federal permanent residence
        programs: the Canadian Experience Class, the Federal Skilled Worker Program and the Federal
        Skilled Trades Program. If you qualify for one of them, you submit a profile and join a
        single national pool.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Everyone in the pool gets a Comprehensive Ranking System (CRS) score based on age,
        education, language ability, work experience and a few other factors. Periodically, IRCC
        runs a round of invitations: it decides how many people to invite and from which group,
        then invites the highest-ranked candidates in that group.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        The &ldquo;cutoff&rdquo; you see reported is not a target set in advance. It is the score of
        the last candidate invited — an outcome, not a rule.
      </p>

      <h2 className="mt-8 text-lg font-semibold">
        Why cutoffs mean different things in different rounds
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        A cutoff only makes sense next to the round it came from. A general round draws from
        everyone. A program-specific round draws only from candidates in that program. A
        category-based round draws only from candidates who meet IRCC&apos;s criteria for that
        category — French language ability, healthcare occupations, trades and so on.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        <strong>The PNP trap:</strong> candidates with a provincial nomination receive an automatic
        600-point bonus. Every candidate in a PNP round carries it, so PNP cutoffs sit in the
        700–800 range. If you do not hold a nomination, a PNP cutoff tells you nothing about your
        chances. That is why this site keeps PNP visually separate and never includes it in your
        personal results unless you say you hold a nomination.
      </p>

      <h2 className="mt-8 text-lg font-semibold">There is no cutoff &ldquo;for Ontario&rdquo;</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        There is no such thing as a cutoff for Ontario — or any other province — in federal Express
        Entry. The pool is national. Provinces only enter the picture through their separate
        Provincial Nominee Programs, which are out of scope for this site.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Nobody can predict the next cutoff</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Including us. The cutoff is determined <em>after</em> IRCC decides how many people to invite
        and from which group. Anyone selling you a forecast is selling you a guess dressed up as
        data.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Disclaimer</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This site is not immigration advice. Data comes from IRCC and may be delayed or incomplete.
        Always verify with the official Canadian government resources before making decisions.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Credits and sources</h2>
      <ul className="mt-2 space-y-1 text-sm">
        <li>
          <a
            className="text-primary underline underline-offset-4 hover:no-underline"
            href="https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html"
            target="_blank"
            rel="noreferrer noopener"
          >
            IRCC — official rounds of invitations
          </a>
        </li>
        <li>
          <a
            className="text-primary underline underline-offset-4 hover:no-underline"
            href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations/category-based-selection.html"
            target="_blank"
            rel="noreferrer noopener"
          >
            IRCC — category-based selection criteria
          </a>
        </li>
        <li>
          <a
            className="text-primary underline underline-offset-4 hover:no-underline"
            href="https://github.com/wishmur/crs-signal"
            target="_blank"
            rel="noreferrer noopener"
          >
            Source code on GitHub
          </a>
        </li>
      </ul>
    </article>
  );
}
