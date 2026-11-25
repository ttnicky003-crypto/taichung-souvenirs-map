"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Circle } from "leaflet";
import { CATEGORY_META } from "@/lib/categories";
import { mapsDirections } from "@/lib/geo";
import type { Shop } from "@/lib/types";

export type MapHandle = {
  focus: (shop: Shop) => void;
  invalidate: () => void;
};

type UserPoint = { lat: number; lng: number; accuracy: number };

function esc(value: string) {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}

function spread(shop: Shop, shops: Shop[]): [number, number] {
  const cluster = shops
    .filter((other) => {
      const dLat = Math.abs(other.lat - shop.lat);
      const dLng = Math.abs(other.lng - shop.lng);
      return dLat < 0.00025 && dLng < 0.00025;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  if (cluster.length < 2) return [shop.lat, shop.lng];
  const index = Math.max(0, cluster.findIndex((item) => item.id === shop.id));
  const angle = (Math.PI * 2 * index) / cluster.length;
  const meters = 16;
  const dLat = (meters / 111320) * Math.cos(angle);
  const dLng = (meters / (111320 * Math.cos((shop.lat * Math.PI) / 180))) * Math.sin(angle);
  return [shop.lat + dLat, shop.lng + dLng];
}

const MapView = forwardRef<
  MapHandle,
  {
    shops: Shop[];
    pins: Map<string, number>;
    selectedId: string | null;
    user: UserPoint | null;
    layoutKey: string;
    onSelect: (id: string) => void;
  }
>(function MapView({ shops, pins, selectedId, user, layoutKey, onSelect }, ref) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const userMarker = useRef<Marker | null>(null);
  const userCircle = useRef<Circle | null>(null);
  const shopsRef = useRef(shops);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  shopsRef.current = shops;
  onSelectRef.current = onSelect;

  useImperativeHandle(ref, () => ({
    focus(shop: Shop) {
      const map = mapRef.current;
      const marker = markersRef.current.get(shop.id);
      if (!map) return;
      map.flyTo([shop.lat, shop.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
      marker?.openPopup();
    },
    invalidate() {
      mapRef.current?.invalidateSize();
    },
  }));

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !nodeRef.current || mapRef.current) return;
      map = L.map(nodeRef.current, { center: [24.155, 120.66], zoom: 12, zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      mapRef.current = map;
      setReady(true);
      window.setTimeout(() => map?.invalidateSize(), 80);
    })();
    const markers = markersRef.current;
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      for (const marker of markersRef.current.values()) marker.remove();
      markersRef.current.clear();
      const current = shopsRef.current;
      for (const shop of current) {
        const [lat, lng] = spread(shop, current);
        const color = CATEGORY_META[shop.category].color;
        const number = pins.get(shop.id) ?? "";
        const icon = L.divIcon({
          className: "",
          html: `<div class="pin${shop.id === selectedId ? " on" : ""}" id="pin-${shop.id}" style="background:${color}">${number}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });
        const rating =
          shop.rating != null
            ? `<div class="pop-meta"><span class="star">★ ${shop.rating}</span>${
                typeof shop.reviews === "number" ? `<span>${shop.reviews.toLocaleString("zh-TW")} 則</span>` : ""
              }</div>`
            : "";
        const status = shop.status ? `<div class="pop-note">${esc(shop.status)}</div>` : "";
        const html = `<div class="pop">
          <span class="pop-cat" style="background:${color}">${esc(CATEGORY_META[shop.category].label)}</span>
          <div class="pop-name">${esc(shop.name)}</div>
          <div class="pop-note">${esc(shop.note || shop.product || "")}</div>
          ${status}
          ${rating}
          <div class="pop-addr">${esc(shop.address)}</div>
          <div class="pop-actions">
            <button type="button" onclick="window.__openShop && window.__openShop('${shop.id}')">看詳情</button>
            <a href="${esc(mapsDirections(shop.lat, shop.lng))}" target="_blank" rel="noreferrer">導航</a>
          </div>
        </div>`;
        const marker = L.marker([lat, lng], { icon, zIndexOffset: shop.id === selectedId ? 500 : 0 })
          .addTo(map)
          .bindPopup(html, { maxWidth: 280, closeButton: false });
        marker.on("click", () => onSelectRef.current(shop.id));
        markersRef.current.set(shop.id, marker);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shops, pins, selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      userMarker.current?.remove();
      userCircle.current?.remove();
      userMarker.current = null;
      userCircle.current = null;
      if (!user) return;
      const icon = L.divIcon({
        className: "",
        html: '<div class="me-dot"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarker.current = L.marker([user.lat, user.lng], { icon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<div class="pop-name">你的位置</div>', { closeButton: false });
      userCircle.current = L.circle([user.lat, user.lng], {
        radius: user.accuracy,
        color: "rgba(26,115,232,.45)",
        fillColor: "rgba(26,115,232,.12)",
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
      map.flyTo([user.lat, user.lng], 14, { duration: 0.6 });
      userMarker.current.openPopup();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, ready]);

  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => window.clearTimeout(timer);
  }, [layoutKey]);

  return <div ref={nodeRef} className="h-full w-full" />;
});

export default MapView;

declare global {
  interface Window {
    __openShop?: (id: string) => void;
  }
}
