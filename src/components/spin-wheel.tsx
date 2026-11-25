"use client";

import { useMemo, useState } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { formatDistance, haversineKm } from "@/lib/geo";
import type { Shop } from "@/lib/types";
import { Button } from "./ui/button";

const RADII = [1, 3, 5, 10];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function shortName(name: string) {
  return name.replace(/\s+/g, "").slice(0, 4);
}

export function SpinWheel({
  shops,
  user,
  onShow,
  onNavigate,
}: {
  shops: Shop[];
  user: { lat: number; lng: number } | null;
  onShow: (shop: Shop) => void;
  onNavigate: (shop: Shop) => void;
}) {
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [radius, setRadius] = useState(3);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [slices, setSlices] = useState<Shop[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  const pool = useMemo(() => {
    if (!nearbyOnly || !user) return shops;
    return shops.filter((shop) => haversineKm(user.lat, user.lng, shop.lat, shop.lng) <= radius);
  }, [shops, nearbyOnly, user, radius]);

  const winner = slices.find((shop) => shop.id === winnerId) ?? null;

  function spin() {
    if (spinning || pool.length === 0) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const others = shuffle(pool.filter((shop) => shop.id !== picked.id)).slice(0, 7);
    const nextSlices = shuffle([...others, picked]);
    const index = nextSlices.findIndex((shop) => shop.id === picked.id);
    const sliceAngle = 360 / nextSlices.length;
    const center = (index + 0.5) * sliceAngle;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const turns = reduce ? 0 : 5;
    const delta = (360 - center - (rotation % 360) + 360) % 360;
    setSlices(nextSlices);
    setWinnerId(null);
    setSpinning(true);
    setRotation((current) => current + turns * 360 + (delta === 0 ? 360 : delta));
    window.setTimeout(() => {
      setSpinning(false);
      setWinnerId(picked.id);
    }, reduce ? 40 : 4300);
  }

  const gradient =
    slices.length === 0
      ? "conic-gradient(#f0e4d4 0 100%)"
      : `conic-gradient(${slices
          .map((shop, index) => {
            const color = CATEGORY_META[shop.category].color;
            const start = (index / slices.length) * 100;
            const end = ((index + 1) / slices.length) * 100;
            return `${color} ${start}% ${end}%`;
          })
          .join(",")})`;

  return (
    <div>
      <p className="text-sm leading-6 text-[#6b5c4d]">
        從目前篩選的 {pool.length} 間抽出 1 間。類別和搜尋會先算進去。
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={nearbyOnly}
          onChange={(event) => setNearbyOnly(event.target.checked)}
          disabled={!user}
        />
        只抽附近
      </label>
      {!user && <p className="mt-1 text-xs text-[#8a7764]">請先按定位我，才能限縮距離。</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {RADII.map((value) => (
          <button
            key={value}
            type="button"
            disabled={!nearbyOnly}
            onClick={() => setRadius(value)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              radius === value && nearbyOnly ? "bg-[#241c16] text-white" : "bg-[#f3eadf] text-[#6b5c4d]"
            }`}
          >
            {value} 公里
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-5 h-64 w-64">
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 text-[#c4482d]">
          ▼
        </div>
        <div
          className="wheel absolute inset-3 rounded-full shadow-lg"
          style={{ background: gradient, transform: `rotate(${rotation}deg)` }}
        >
          {slices.map((shop, index) => {
            const angle = ((index + 0.5) / slices.length) * 360;
            return (
              <span
                key={shop.id}
                className="absolute left-1/2 top-1/2 w-16 -translate-x-1/2 text-center text-[11px] font-black text-white"
                style={{ transform: `rotate(${angle}deg) translateY(-92px)` }}
              >
                {shortName(shop.name)}
              </span>
            );
          })}
        </div>
        <button
          type="button"
          onClick={spin}
          disabled={spinning || pool.length === 0}
          className="absolute left-1/2 top-1/2 z-10 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white text-sm font-black text-[#c4482d] shadow"
        >
          {spinning ? "..." : "轉動"}
        </button>
      </div>

      {pool.length === 0 && (
        <p className="mt-3 text-center text-sm text-[#8a7764]">這個篩選沒有店可以抽。放寬類別或距離再試。</p>
      )}

      {winner && !spinning && (
        <div className="mt-4 rounded-2xl border border-[#eadfce] bg-white p-4">
          <p className="text-xs font-bold text-[#c4482d]">{CATEGORY_META[winner.category].label}</p>
          <h3 className="mt-1 text-xl font-black">{winner.name}</h3>
          {winner.product && <p className="mt-1 text-sm text-[#6b5c4d]">必買：{winner.product}</p>}
          <p className="mt-1 text-sm text-[#6b5c4d]">
            {winner.district || winner.city}
            {user && `，距離 ${formatDistance(haversineKm(user.lat, user.lng, winner.lat, winner.lng))}`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => onShow(winner)}>
              在地圖上看
            </Button>
            <Button type="button" variant="secondary" onClick={() => onNavigate(winner)}>
              導航
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
