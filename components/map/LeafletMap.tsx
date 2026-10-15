"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { usableSize } from "@/lib/explore";

/** One clickable pin on the map. */
export type MapPin = { id: string; position: [number, number]; icon: L.Icon | L.DivIcon; title?: string; alt?: string; onClick?: () => void };

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * A map built directly on Leaflet (BSD licence). It replaces the react-leaflet wrapper, which does not work with React 19 and has an unusual licence.
 * It does the small number of things the site needs: show the map and the OpenStreetMap tiles, fit a starting area, draw pins that can be clicked or reached with the keyboard,
 * and hand the Leaflet map to its parent (`onMap`) so the parent can move the camera.
 *
 * It is safe under React's StrictMode (which builds, tears down and rebuilds every effect in development): the map is removed properly on teardown, so the same element can be used again.
 */
export default function LeafletMap({ className, bounds, scrollWheelZoom = true, pins, onMap }: {
  className?: string; bounds: [[number, number], [number, number]]; scrollWheelZoom?: boolean; pins: MapPin[]; onMap?: (map: L.Map | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const report = useRef(onMap); report.current = onMap; // the parent's callback may change on every render; the map must not be rebuilt for that

  // Build the map once. The starting area and the scroll-wheel setting are fixed at this point (as they were before); the parent moves the camera afterwards.
  useEffect(() => {
    const el = box.current; if (!el) return;
    const m = L.map(el, { scrollWheelZoom });
    const area = L.latLngBounds(bounds); const size = m.getSize();
    if (usableSize(size.x, size.y)) m.fitBounds(area); else m.setView(area.getCenter(), 10); // a hidden map has no size yet: the parent fits it as soon as it is shown
    L.tileLayer(TILES, { attribution: ATTRIBUTION }).addTo(m);
    setMap(m); report.current?.(m);
    return () => { report.current?.(null); setMap(null); m.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw the pins; redraw them when they change.
  useEffect(() => {
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    for (const p of pins) {
      const marker = L.marker(p.position, { icon: p.icon, title: p.title, alt: p.alt, keyboard: true });
      if (p.onClick) marker.on("click", p.onClick);
      marker.addTo(layer);
    }
    return () => { layer.remove(); };
  }, [map, pins]);

  return <div ref={box} className={className} />;
}
