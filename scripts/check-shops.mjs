import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const shops = JSON.parse(readFileSync(new URL("../src/data/shops.json", import.meta.url)));
const live = JSON.parse(readFileSync(new URL("../data/raw/live-shops.json", import.meta.url)));

function km(aLat, aLng, bLat, bLng) {
  const earth = 6371;
  const p1 = (aLat * Math.PI) / 180;
  const p2 = (bLat * Math.PI) / 180;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

const errors = [];
if (shops.length < 100) errors.push(`expected about 100 shops, got ${shops.length}`);
const liveIds = new Set(shops.filter((shop) => shop.id.startsWith("live-")).map((shop) => shop.id));
if (liveIds.size !== 43) errors.push(`live shops ${liveIds.size}`);
for (const item of live) {
  const shop = shops.find((entry) => entry.id === `live-${item.id}`);
  if (!shop) {
    errors.push(`missing live ${item.id} ${item.name}`);
    continue;
  }
  if (shop.rating !== item.rating || shop.reviews !== item.reviews) {
    errors.push(`rating changed ${item.name}`);
  }
  if (km(shop.lat, shop.lng, item.lat, item.lng) > 0.05) {
    errors.push(`live coordinate moved ${item.name}`);
  }
}

const spot = [
  ["日出 宮原眼科", 24.1378, 120.6836],
  ["鴻鼎菓子 噠啵曲奇", 24.2578, 120.7287],
  ["如邑堂 太陽餅", 24.1849, 120.64],
  ["裕珍馨", 24.344, 120.623],
  ["水母吃乳酪", 24.25, 120.81],
  ["拾個月", 24.22, 120.58],
];
for (const [name, lat, lng] of spot) {
  const shop = shops.find((entry) => entry.name === name);
  if (!shop) {
    errors.push(`missing spot ${name}`);
    continue;
  }
  const distance = km(shop.lat, shop.lng, lat, lng);
  if (distance > 1.5) errors.push(`${name} is ${distance.toFixed(2)} km from expected point`);
}

for (const shop of shops) {
  if (!(shop.lat > 21.5 && shop.lat < 26 && shop.lng > 119 && shop.lng < 123)) {
    errors.push(`out of range ${shop.name}`);
  }
  if ("blogReviews" in shop) errors.push(`blog field on ${shop.name}`);
}

const origin = shops.find((shop) => shop.name === "日出 宮原眼科");
const sorted = [...shops].sort(
  (a, b) => km(origin.lat, origin.lng, a.lat, a.lng) - km(origin.lat, origin.lng, b.lat, b.lng),
);
if (sorted[0].id !== origin.id) errors.push("distance sort did not keep the origin first");
if (km(origin.lat, origin.lng, sorted[1].lat, sorted[1].lng) > 0.3) {
  errors.push("nearest neighbour of 宮原眼科 is unexpectedly far");
}

const uiRoot = new URL("../src", import.meta.url);
function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(path);
  }
  return files;
}
for (const file of walk(uiRoot.pathname)) {
  const text = readFileSync(file, "utf8");
  if (text.includes("—") || text.includes("–")) errors.push(`dash in ${file}`);
  if (text.includes("blogReviews")) errors.push(`blog field in ${file}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`ok ${shops.length} shops, spot checks passed`);
