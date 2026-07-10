"use client";

import { useEffect, useMemo, useState } from "react";

export const BREAKPOINTS = {
  xs: { min: 0, max: 479, label: "Extra small" },
  sm: { min: 480, max: 767, label: "Small" },
  md: { min: 768, max: 1023, label: "Medium" },
  lg: { min: 1024, max: 1439, label: "Large" },
  xl: { min: 1440, max: Infinity, label: "Extra large" },
};

const QUERIES = {
  xs: "(max-width: 479px)",
  sm: "(min-width: 480px) and (max-width: 767px)",
  md: "(min-width: 768px) and (max-width: 1023px)",
  lg: "(min-width: 1024px) and (max-width: 1439px)",
  xl: "(min-width: 1440px)",
};

export function getBreakpoint(width) {
  if (width <= BREAKPOINTS.xs.max) return "xs";
  if (width <= BREAKPOINTS.sm.max) return "sm";
  if (width <= BREAKPOINTS.md.max) return "md";
  if (width <= BREAKPOINTS.lg.max) return "lg";
  return "xl";
}

export function useBreakpoint(defaultBreakpoint = "lg") {
  const [breakpoint, setBreakpoint] = useState(defaultBreakpoint);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const queries = Object.entries(QUERIES).map(([name, query]) => [
      name,
      window.matchMedia(query),
    ]);

    const updateBreakpoint = () => {
      const active = queries.find(([, matcher]) => matcher.matches);
      setBreakpoint(active ? active[0] : getBreakpoint(window.innerWidth));
    };

    updateBreakpoint();
    queries.forEach(([, matcher]) => {
      if (matcher.addEventListener) matcher.addEventListener("change", updateBreakpoint);
      else matcher.addListener(updateBreakpoint);
    });

    return () => {
      queries.forEach(([, matcher]) => {
        if (matcher.removeEventListener) matcher.removeEventListener("change", updateBreakpoint);
        else matcher.removeListener(updateBreakpoint);
      });
    };
  }, [defaultBreakpoint]);

  return breakpoint;
}

export function useScreenProfile(breakpoint) {
  return useMemo(() => {
    const compact = breakpoint === "xs" || breakpoint === "sm";
    const tablet = breakpoint === "md";
    const desktop = breakpoint === "lg" || breakpoint === "xl";

    return {
      name: breakpoint,
      label: BREAKPOINTS[breakpoint]?.label || "Large",
      compact,
      tablet,
      desktop,
      contentMaxWidth: breakpoint === "xl" ? 1440 : breakpoint === "lg" ? 1280 : 1024,
      pagePadding:
        breakpoint === "xs"
          ? "12px 10px"
          : breakpoint === "sm"
            ? "16px 14px"
            : breakpoint === "md"
              ? "22px 20px"
              : breakpoint === "lg"
                ? "28px 24px"
                : "36px 32px",
      menuColumns:
        breakpoint === "xs"
          ? "repeat(2, minmax(0, 1fr))"
          : breakpoint === "sm"
            ? "repeat(2, minmax(0, 1fr))"
            : breakpoint === "md"
              ? "repeat(3, minmax(0, 1fr))"
              : breakpoint === "lg"
                ? "repeat(4, minmax(0, 1fr))"
                : "repeat(5, minmax(0, 1fr))",
      catalogColumns:
        breakpoint === "xs"
          ? "repeat(2, minmax(0, 1fr))"
          : breakpoint === "sm"
            ? "repeat(3, minmax(0, 1fr))"
            : breakpoint === "md"
              ? "repeat(4, minmax(0, 1fr))"
              : breakpoint === "lg"
                ? "repeat(5, minmax(0, 1fr))"
                : "repeat(6, minmax(0, 1fr))",
      cardWidth:
        breakpoint === "xs"
          ? "calc(50vw - 18px)"
          : breakpoint === "sm"
            ? 176
            : breakpoint === "md"
              ? 196
              : breakpoint === "lg"
                ? 220
                : 244,
      cardImageHeight:
        breakpoint === "xs"
          ? 108
          : breakpoint === "sm"
            ? 126
            : breakpoint === "md"
              ? 140
              : breakpoint === "lg"
                ? 152
                : 164,
      gap: breakpoint === "xs" ? 10 : breakpoint === "sm" ? 12 : breakpoint === "md" ? 16 : 20,
    };
  }, [breakpoint]);
}
