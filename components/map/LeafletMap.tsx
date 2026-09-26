"use client";

import L from "leaflet";
import { useState } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const icon = L.divIcon({
  html: '<div style="background:#ea580c;border:3px solid #fff;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function MapClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LeafletMap({
  lat = null,
  lng = null,
  onDrag,
  interactive = true,
  height = 260,
}: {
  lat?: number | null;
  lng?: number | null;
  onDrag?: (loc: { lat: number; lng: number; label: string; city: string }) => void;
  interactive?: boolean;
  height?: number;
}) {
  const [position, setPosition] = useState<[number, number]>(() =>
    lat && lng ? [lat, lng] : [20.5937, 78.9629],
  );

  const [prevLat, setPrevLat] = useState(lat ?? null);
  const [prevLng, setPrevLng] = useState(lng ?? null);

  if (lat !== prevLat || lng !== prevLng) {
    setPrevLat(lat);
    setPrevLng(lng);
    if (lat && lng) setPosition([lat, lng]);
  }

  async function fireDrag(newLat: number, newLng: number) {
    if (!onDrag) return;
    setPosition([newLat, newLng]);
    let label = `${newLat.toFixed(5)}, ${newLng.toFixed(5)}`;
    let city = "";
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${newLat}&lng=${newLng}`);
      const data = await res.json();
      if (data.label) {
        label = data.label;
        city = data.city ?? "";
      }
    } catch {}
    onDrag({ lat: newLat, lng: newLng, label, city });
  }

  return (
    <div style={{ height: `${height}px` }} className="relative">
      <MapContainer
        center={position}
        zoom={lat && lng ? 12 : 5}
        scrollWheelZoom={interactive}
        dragging={interactive}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {interactive && (
          <MapClickCatcher onPick={(la, ln) => fireDrag(la, ln)} />
        )}
        <Marker
          icon={icon}
          position={position}
          draggable={interactive}
          eventHandlers={
            interactive
              ? {
                  dragend: (e) => {
                    const m = e.target as L.Marker;
                    const p = m.getLatLng();
                    fireDrag(p.lat, p.lng);
                  },
                }
              : undefined
          }
        />
      </MapContainer>
    </div>
  );
}