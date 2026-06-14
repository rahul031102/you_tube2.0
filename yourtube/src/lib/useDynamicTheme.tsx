import { useEffect } from "react";
import { fetchRegion, isSouthIndia, isBetween10and12IST } from "./geolocation";

export function useDynamicTheme() {
  useEffect(() => {
    let cancelled = false;
    async function run() {
      // If user already chose a theme manually, do not override
      try {
        const manual = localStorage.getItem("theme_manual");
        if (manual === "true") return;
      } catch (e) {}

      const region = await fetchRegion();
      if (cancelled) return;
      const inSouth = isSouthIndia(region || undefined);
      const inTime = isBetween10and12IST(new Date());
      const shouldLight = inSouth && inTime;
      const el = document.documentElement;
      if (shouldLight) {
        el.classList.remove("dark");
        el.classList.add("light");
      } else {
        el.classList.remove("light");
        el.classList.add("dark");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);
}
