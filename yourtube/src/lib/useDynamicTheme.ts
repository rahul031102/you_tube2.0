import { useEffect, useState } from "react";
import { GeoLocation, isLightTheme } from "./theme";
import { fetchRegion } from "./geolocation";

const applyTheme = (light: boolean) => {
  const root = document.documentElement;
  root.classList.toggle("dark", !light);
};

export const useDynamicTheme = () => {
  const [location, setLocation] = useState<GeoLocation>({});

  useEffect(() => {
    let active = true;
    const fetchLocation = async () => {
      try {
        const data = await fetchRegion();
        if (!active) return;
        setLocation(data || {});
      } catch {
        // On failure we keep an empty location, which resolves to the
        // default dark theme.
        if (active) setLocation({});
      }
    };
    fetchLocation();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const evaluate = () => applyTheme(isLightTheme(location));
    evaluate();
    // Re-check every minute so the time-based switch happens live.
    const interval = setInterval(evaluate, 60 * 1000);
    return () => clearInterval(interval);
  }, [location]);
};
