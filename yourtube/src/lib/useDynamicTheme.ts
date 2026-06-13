import { useEffect, useState } from "react";
import { GeoLocation, isLightTheme } from "./theme";

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
        const res = await fetch("https://ipapi.co/json");
        const data = await res.json();
        if (!active) return;
        setLocation({
          region: data.region,
          country: data.country_name,
          countryCode: data.country_code,
        });
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
