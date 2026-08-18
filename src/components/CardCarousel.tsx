import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Horizontal-scroll strip with hidden native scrollbar, chevron buttons that
// appear only when there's more to scroll in that direction (desktop only),
// and soft edge fades. Cards themselves are the caller's problem — pass them
// as children.
//
// Kept intentionally minimal: no dot indicators, no autoplay, no snap logic
// beyond what CSS already provides on the child scroll container.

interface CardCarouselProps {
  ariaLabel: string;
  children: ReactNode;
}

export function CardCarousel({ ariaLabel, children }: CardCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanLeft(scrollLeft > 4);
      setCanRight(scrollLeft + clientWidth < scrollWidth - 4);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, []);

  // Snap to the previous / next card boundary — not a fixed pixel step.
  // Fixes the "clicking next nudges a fraction of a card" feel.
  const step = (dir: "prev" | "next") => {
    const el = trackRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    if (cards.length === 0) return;

    // Card width is uniform (all snap-start children have the same wrapper
    // width), so per-step distance = first child's outerWidth + gap.
    const cardWidth = cards[0]!.offsetWidth;
    const gap =
      cards.length > 1 ? cards[1]!.offsetLeft - cards[0]!.offsetLeft - cardWidth : 0;
    const strideRaw = cardWidth + gap;
    const stride = strideRaw > 0 ? strideRaw : cardWidth;

    const currentIndex = Math.round(el.scrollLeft / stride);
    const nextIndex =
      dir === "next"
        ? Math.min(cards.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
    el.scrollTo({ left: nextIndex * stride, behavior: "smooth" });
  };

  return (
    <div className="relative -mx-5 px-5">
      {/* Left fade */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[var(--paper)] to-transparent transition-opacity ${
          canLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Right fade */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[var(--paper)] to-transparent transition-opacity ${
          canRight ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Scroll track: scrollbar hidden across engines */}
      <div
        ref={trackRef}
        role="group"
        aria-label={ariaLabel}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {/* Chevrons — desktop only, only when there's more to scroll.
          Sized and elevated enough to read as intentional controls, not tiny hints. */}
      {canLeft && (
        <button
          type="button"
          onClick={() => step("prev")}
          aria-label="Previous card"
          className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--card)] text-[var(--brand)] shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] md:inline-flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => step("next")}
          aria-label="Next card"
          className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--card)] text-[var(--brand)] shadow-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] md:inline-flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
