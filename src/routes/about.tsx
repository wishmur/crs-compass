import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { EVENTS, capture } from "@/lib/analytics";
import creatorsAsset from "@/assets/creators.png.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About CRS Compass" },
      {
        name: "description",
        content: "How this Express Entry tracker works and where its data comes from.",
      },
    ],
  }),
  component: About,
});

interface Source {
  label: string;
  href: string;
}

interface PipelineStep {
  number: string;
  title: string;
  description: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { number: "01", title: "IRCC", description: "Official draw data and CRS rules." },
  { number: "02", title: "Refresh", description: "A scheduled process checks for new draw data." },
  {
    number: "03",
    title: "Process",
    description: "Data is cleaned, structured, validated, and stored.",
  },
  {
    number: "04",
    title: "CRS Compass",
    description: "The processed data powers score comparisons, history, and planning.",
  },
];

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
        className="flex flex-col rounded-[calc(var(--radius)*1.5)] px-6 py-12 sm:px-10 sm:py-16 md:flex-row md:items-center md:gap-10"
        style={{ backgroundColor: "var(--brand)", color: "var(--paper)" }}
      >
        <div className="md:w-[60%]">
          <p
            className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase"
            style={{ color: "var(--accent-soft)" }}
          >
            Why was CRS Compass built
          </p>
          <p
            className="display mt-6 max-w-[52ch] text-[1.125rem] leading-[1.5] sm:text-[1.25rem]"
            style={{ color: "rgba(246,241,232,0.92)" }}
          >
            My brother was trying to make sense of Canada&rsquo;s Express Entry system. I build
            products. This was, in retrospect, an extremely predictable outcome.
          </p>
        </div>

        <div className="relative mt-8 min-h-[220px] overflow-hidden rounded-[var(--radius)] md:mt-0 md:w-[40%] md:min-h-[260px] md:max-h-[280px]">
          <img
            src={creatorsAsset.url}
            alt="Two people watching clouds roll over a mountain ridge"
            className="absolute inset-0 h-full w-full object-cover object-center"
            style={{
              opacity: 0.92,
              maskImage:
                "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            }}
          />
        </div>
      </section>

      {/* Two-column: What it does + How does this make money */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        <article className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--card)] p-6 sm:p-8">
          <p className="kicker">What it does</p>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink">
            CRS Compass helps you understand where your Express Entry score stands and what could
            actually move it.
          </p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
            Enter your current score, tell it what applies to you, then test changes like improving
            your French to see how your score and position would change.
          </p>
        </article>

        <article className="rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--card)] p-6 sm:p-8">
          <p className="kicker">How it makes $$$</p>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-ink">It doesn&rsquo;t.</p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
            No ads, subscriptions, affiliate links, or paid services.
          </p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
            Built because someone needed it, and because a small hosting bill feels like a pretty
            good trade if the thing is useful to a lot of people.
          </p>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">
            If the engineering also helps me land a better job in this shitty market, I&rsquo;ll
            call that the business model.
          </p>
        </article>
      </div>

      {/* How it works — a lightweight visual of the pipeline, not documentation. */}
      <section className="mt-5 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--card)] p-6 sm:p-8">
        <p className="kicker">How it works</p>
        <p className="mt-4 max-w-[60ch] text-[0.95rem] leading-relaxed text-ink">
          IRCC publishes the rules and draw data. CRS Compass checks for updates, cleans and
          validates the data, then uses it to power the score comparisons and planning tools you see
          here.
        </p>
        <p className="mt-3 max-w-[60ch] text-[0.95rem] leading-relaxed text-ink">
          If CRS Compass and Canada ever disagree, Canada wins.
        </p>

        <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:gap-8">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.number} className="sm:flex-1">
              <div className="flex items-center gap-2">
                <p className="figure text-[1.5rem]" style={{ color: "var(--brand)" }}>
                  {step.number}
                </p>
                {i < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight
                    aria-hidden
                    className="hidden h-4 w-4 shrink-0 text-[var(--rule)] sm:block"
                  />
                )}
              </div>
              <p className="mt-2 text-[0.95rem] font-medium text-ink">{step.title}</p>
              <p className="mt-1 max-w-[22ch] text-[0.95rem] leading-relaxed text-ink">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 border-t border-[var(--rule)] pt-5 text-xs leading-relaxed text-muted-foreground">
          Draw data refreshes daily. CRS scoring rules are versioned and reviewed separately before
          they affect calculations.
        </p>

        <ul className="mt-6 -mx-2 divide-y divide-[var(--rule)]">
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
      </section>

      {/* Full-width caveat — visible without alarming. Uses --brand-soft for
          subtle contrast; --accent-soft would have read as warning. */}
      <section
        className="mt-5 rounded-[var(--radius)] p-6 sm:p-8"
        style={{ backgroundColor: "var(--brand-soft)" }}
      >
        <p className="kicker">One important caveat</p>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink">
          CRS Compass gives you context, not immigration advice. Historical cutoffs don&rsquo;t
          predict future draws, data can occasionally be delayed or incomplete, and important
          decisions should always be verified against IRCC or a licensed immigration professional.
        </p>
      </section>
    </div>
  );
}
