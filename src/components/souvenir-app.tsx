"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import shopsData from "@/data/shops.json";
import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { formatDistance, haversineKm, mapsDirections } from "@/lib/geo";
import type { Category, Shop } from "@/lib/types";
import { Button, buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import { Dialog } from "./ui/dialog";
import type { MapHandle } from "./map-view";
import { SpinWheel } from "./spin-wheel";

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[#8a7764]">地圖載入中</div>,
});

const shops = shopsData as Shop[];

function pinsFor(list: Shop[]) {
  const counters: Record<string, number> = {};
  const pins = new Map<string, number>();
  [...list].sort((a, b) => a.order - b.order).forEach((shop) => {
    counters[shop.category] = (counters[shop.category] || 0) + 1;
    pins.set(shop.id, counters[shop.category]);
  });
  return pins;
}

const PINS = pinsFor(shops);

export function SouvenirApp() {
  const [active, setActive] = useState<Record<Category, boolean>>({
    souvenir: true,
    coffee: true,
    dessert: true,
    tea: true,
  });
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [user, setUser] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileMode, setMobileMode] = useState<"split" | "map" | "list">("split");
  const mapRef = useRef<MapHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const tally = { souvenir: 0, coffee: 0, dessert: 0, tea: 0 };
    shops.forEach((shop) => {
      tally[shop.category] += 1;
    });
    return tally;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shops.filter((shop) => {
      if (!active[shop.category]) return false;
      if (!q) return true;
      const awardText = shop.awards.map((award) => `${award.year}${award.award}${award.product}`).join(" ");
      const blob = `${shop.name} ${shop.note} ${shop.product} ${shop.address} ${shop.district} ${awardText}`.toLowerCase();
      return blob.includes(q);
    });
  }, [active, query]);

  const visible = useMemo(() => {
    if (!user) return filtered;
    return [...filtered].sort(
      (a, b) =>
        haversineKm(user.lat, user.lng, a.lat, a.lng) - haversineKm(user.lat, user.lng, b.lat, b.lng),
    );
  }, [filtered, user]);

  const detail = shops.find((shop) => shop.id === detailId) ?? null;

  useEffect(() => {
    window.__openShop = (id: string) => {
      setSelectedId(id);
      setDetailId(id);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`shop-${selectedId}`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, visible]);

  function locate() {
    if (!navigator.geolocation) {
      setMessage("瀏覽器不支援定位");
      return;
    }
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setUser({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        setLocating(false);
        setMessage(["", "定位被拒絕", "無法取得位置", "定位逾時"][error.code] || "無法取得位置");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function showOnMap(shop: Shop) {
    setSelectedId(shop.id);
    setDetailId(null);
    setWheelOpen(false);
    setMobileMode("map");
    window.setTimeout(() => mapRef.current?.focus(shop), 80);
  }

  function openDetail(shop: Shop) {
    setSelectedId(shop.id);
    setDetailId(shop.id);
    mapRef.current?.focus(shop);
  }

  const grouped = user ? null : CATEGORIES.filter((category) => active[category]);

  return (
    <div className="flex h-dvh flex-col bg-[#f6f1e7] text-[#241c16]">
      <header className="z-20 shrink-0 border-b border-[#eadfce] bg-[#fffaf3]/95 px-3 py-2.5 backdrop-blur sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-black tracking-tight sm:text-lg">台中伴手禮地圖</h1>
            <p className="text-[11px] text-[#8a7764] sm:text-xs">突然要買伴手禮，先定位，再看附近名店</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-black leading-none">{visible.length}</div>
            <div className="text-[11px] text-[#8a7764]">間{query || !Object.values(active).every(Boolean) ? ` / ${shops.length}` : ""}</div>
          </div>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜尋店名、必買或地址"
          className="mt-2 h-10 w-full rounded-full border border-[#eadfce] bg-white px-4 text-sm outline-none focus:border-[#c4482d]"
          aria-label="搜尋店家"
        />
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const on = active[category];
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActive((current) => ({ ...current, [category]: !current[category] }))}
                className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold"
                style={{
                  color: on ? "#fff" : meta.color,
                  background: on ? meta.color : "#fff",
                  borderColor: meta.color,
                }}
              >
                {meta.icon} {meta.label} {counts[category]}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Button type="button" size="sm" onClick={locate} disabled={locating}>
            {locating ? "定位中" : "定位我"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setWheelOpen(true)}>
            隨機輪盤
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-[900px]:hidden"
            onClick={() => setMobileMode((mode) => (mode === "map" ? "list" : mode === "list" ? "split" : "map"))}
          >
            {mobileMode === "map" ? "看列表" : mobileMode === "list" ? "地圖加列表" : "看地圖"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAboutOpen(true)}>
            關於
          </Button>
        </div>
        {message && <p className="mt-1 text-xs font-semibold text-[#c4482d]">{message}</p>}
        {user && <p className="mt-1 text-xs text-[#2f6b4f]">已定位，列表改為由近到遠。</p>}
      </header>

      <div className={`workspace mode-${mobileMode} min-h-0 flex-1`} data-mode={mobileMode}>
        <section className="list-pane flex min-h-0 flex-col border-[#eadfce] bg-[#fffaf3]">
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 && (
              <p className="p-6 text-sm text-[#8a7764]">沒有符合的店。換個關鍵字，或打開其他類別。</p>
            )}
            {grouped
              ? grouped.map((category) => {
                  const items = visible.filter((shop) => shop.category === category);
                  if (items.length === 0) return null;
                  const meta = CATEGORY_META[category];
                  return (
                    <div key={category}>
                      <div className="sticky top-0 border-t px-4 py-2 text-xs font-black" style={{ color: meta.color, background: "#fffaf3" }}>
                        {meta.icon} {meta.label}
                      </div>
                      {items.map((shop) => (
                        <ShopRow
                          key={shop.id}
                          shop={shop}
                          pin={PINS.get(shop.id) ?? 0}
                          selected={shop.id === selectedId}
                          distance={user ? haversineKm(user.lat, user.lng, shop.lat, shop.lng) : null}
                          onClick={() => openDetail(shop)}
                        />
                      ))}
                    </div>
                  );
                })
              : visible.map((shop) => (
                  <ShopRow
                    key={shop.id}
                    shop={shop}
                    pin={PINS.get(shop.id) ?? 0}
                    selected={shop.id === selectedId}
                    distance={user ? haversineKm(user.lat, user.lng, shop.lat, shop.lng) : null}
                    onClick={() => openDetail(shop)}
                  />
                ))}
          </div>
        </section>
        <section className="map-pane relative min-h-0">
          <MapView
            ref={mapRef}
            shops={visible}
            pins={PINS}
            selectedId={selectedId}
            user={user}
            layoutKey={mobileMode}
            onSelect={(id) => {
              setSelectedId(id);
              setDetailId(id);
            }}
          />
        </section>
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetailId(null)} title={detail?.name ?? "店家"}>
        {detail && (
          <ShopDetail
            shop={detail}
            pin={PINS.get(detail.id) ?? 0}
            distance={user ? haversineKm(user.lat, user.lng, detail.lat, detail.lng) : null}
            onShow={() => showOnMap(detail)}
          />
        )}
      </Dialog>

      <Dialog open={wheelOpen} onOpenChange={setWheelOpen} title="隨機輪盤">
        <SpinWheel
          shops={visible}
          user={user}
          onShow={showOnMap}
          onNavigate={(shop) => window.open(mapsDirections(shop.lat, shop.lng), "_blank", "noopener")}
        />
      </Dialog>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen} title="關於這張地圖">
        <div className="space-y-3 text-sm leading-6 text-[#4d4036]">
          <p>突然需要伴手禮時，先定位，再看附近還有哪些名店。前版地圖的 43 間店全部留著，另外併進店主的 Google 清單，以及台中市十大伴手禮歷屆得獎品牌。</p>
          <p>星等只出現在前版地圖本來就有的店，這次沒有重新向 Google 核對，也沒有替新店補上分數。</p>
          <p>
            官方名單：
            <a className="ml-1 font-bold text-[#1a56c4]" href="https://www.top10gifts.com.tw/prize.aspx?Cid=5" target="_blank" rel="noreferrer">
              十大伴手禮歷屆得獎
            </a>
          </p>
          <p>要增刪店家，請改 data 裡的 shops.json。沒有定位到門市的得獎品牌放在 ungeocoded.json，不會出現在地圖上。</p>
        </div>
      </Dialog>
    </div>
  );
}

function ShopRow({
  shop,
  pin,
  selected,
  distance,
  onClick,
}: {
  shop: Shop;
  pin: number;
  selected: boolean;
  distance: number | null;
  onClick: () => void;
}) {
  const color = CATEGORY_META[shop.category].color;
  return (
    <button
      id={`shop-${shop.id}`}
      type="button"
      onClick={onClick}
      className={`flex w-full gap-3 border-b border-[#f3eadf] px-4 py-3 text-left ${selected ? "bg-[#fff1ea]" : "hover:bg-[#faf6ef]"}`}
    >
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black text-white" style={{ background: color }}>
        {pin}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black">{shop.name}</span>
        {shop.note && <span className="mt-0.5 block text-xs leading-5 text-[#6b5c4d]">{shop.note}</span>}
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          {shop.rating != null && (
            <span className="font-semibold text-[#d0891f]">
              ★ {shop.rating}
              {typeof shop.reviews === "number" ? `　${shop.reviews.toLocaleString("zh-TW")} 則` : ""}
            </span>
          )}
          {shop.status && <span className="font-bold text-[#c4482d]">{shop.status}</span>}
          <span className="text-[#8a7764]">{shop.district || shop.city}</span>
          {distance != null && <span className="font-bold text-[#2f6b4f]">{formatDistance(distance)}</span>}
          {shop.awards[0] && (
            <span className="rounded-full bg-[#f3eadf] px-1.5 py-0.5 font-bold text-[#6b5c4d]">
              {shop.awards[0].year || `第${shop.awards[0].edition}屆`} {shop.awards[0].award}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function ShopDetail({
  shop,
  pin,
  distance,
  onShow,
}: {
  shop: Shop;
  pin: number;
  distance: number | null;
  onShow: () => void;
}) {
  const meta = CATEGORY_META[shop.category];
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: meta.color }}>
          {meta.label} {pin}
        </span>
        {distance != null && <span className="font-bold text-[#2f6b4f]">{formatDistance(distance)}</span>}
      </div>
      {shop.note && <p className="leading-6 text-[#4d4036]">{shop.note}</p>}
      {shop.status && <p className="font-bold text-[#c4482d]">{shop.status}</p>}
      {shop.rating != null && (
        <p className="text-[#d0891f]">
          ★ {shop.rating}
          {typeof shop.reviews === "number" ? `　${shop.reviews.toLocaleString("zh-TW")} 則` : ""}
          <span className="mt-1 block text-xs text-[#8a7764]">
            {shop.ratingSource === "店主 Google 清單"
              ? "星等來自店主的 Google 清單，清單上沒有評論數。"
              : "星等來自前版網站，這次沒有重新核對。"}
          </span>
        </p>
      )}
      <p className="leading-6">
        {shop.address}
        {shop.addressFrom && <span className="mt-1 block text-xs text-[#8a7764]">地址來源：{shop.addressFrom}</span>}
      </p>
      {shop.awards.length > 0 && (
        <ul className="space-y-1">
          {shop.awards.slice(0, 6).map((award) => (
            <li key={`${award.edition}-${award.award}-${award.product}`}>
              <a className="font-semibold text-[#1a56c4]" href={award.url} target="_blank" rel="noreferrer">
                {award.year || `第${award.edition}屆`} {award.award}
              </a>
              {award.product && <span className="text-[#6b5c4d]">：{award.product}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-5 text-[#8a7764]">
        資料：{shop.sources.map((source) => source.label).join("、")}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" onClick={onShow}>
          在地圖上看
        </Button>
        <a className={cn(buttonVariants({ variant: "secondary" }))} href={mapsDirections(shop.lat, shop.lng)} target="_blank" rel="noreferrer">
          用 Google 地圖導航
        </a>
        <a className={cn(buttonVariants({ variant: "ghost" }))} href={shop.gmaps} target="_blank" rel="noreferrer">
          店家頁面
        </a>
      </div>
    </div>
  );
}
