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

  const scrollBy = (dx: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: "smooth" });
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

      {/* Chevrons — desktop only, only when there's more to scroll */}
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-320)}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full border border-[var(--rule)] bg-[var(--card)] p-2 text-[var(--brand)] shadow-sm transition-opacity hover:opacity-90 md:inline-flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => scrollBy(320)}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full border border-[var(--rule)] bg-[var(--card)] p-2 text-[var(--brand)] shadow-sm transition-opacity hover:opacity-90 md:inline-flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
