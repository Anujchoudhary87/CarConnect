"use client";

import { useCallback, useState } from "react";

export interface DeviceLocation {
  lat: number;
  lng: number;
  /** Reverse-geocoded readable address, when the geocoder answered. */
  label: string;
  city: string;
  state: string;
}

const NO_GEOLOCATION =
  "Is browser/device me location support nahi hai. Search se pin chuno.";

/**
 * One implementation of "📍 Use My Current Location" so the dealer office
 * location and the per-vehicle override cannot drift apart.
 *
 * Asks the browser for the current position, then reverse-geocodes it through
 * the existing `/api/geocode/reverse` proxy (Nominatim is not called from the
 * browser, and the request keeps the app's existing rate limit/UA policy).
 * A failed reverse lookup is not fatal: the raw coordinates are still usable.
 */
export function useDeviceLocation() {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const locate = useCallback(async (): Promise<DeviceLocation | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError(NO_GEOLOCATION);
      return null;
    }

    setError("");
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true,
        }),
      );
      const { latitude, longitude } = pos.coords;
      const point: DeviceLocation = {
        lat: latitude,
        lng: longitude,
        label: "",
        city: "",
        state: "",
      };

      try {
        const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
        if (res.ok) {
          const data = await res.json();
          point.label = typeof data.label === "string" ? data.label : "";
          point.city = typeof data.city === "string" ? data.city : "";
          point.state = typeof data.state === "string" ? data.state : "";
        }
      } catch {
        // Keep the raw point; the dealer can still save it and type the address.
      }

      return point;
    } catch {
      setError("Location permission nahi mili. Browser me allow karo, ya search se pin chuno.");
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  return { locating, error, locate, setError };
}
