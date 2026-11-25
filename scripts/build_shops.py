#!/usr/bin/env python3
"""Merge the old 43 shops, the owner's Google list, and Taichung award winners."""

from __future__ import annotations

import json
import math
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "src" / "data"
PRIZE = "https://www.top10gifts.com.tw/prize.aspx"
LIST_URL = "https://maps.app.goo.gl/82BroEKMe523ML4z5"
LIVE_URL = "https://taichung-souvenirs-map.vercel.app"
YEARS = {
    12: "2020-2021",
    13: "2022",
    14: "2023",
    15: "2024",
    16: "2025",
    17: "2026",
}

# Official-list shops that are not already in the old map.
# Addresses come from the brand site, the city tourism site, or the city shopping-festival directory.
EXTRAS = [
    {"id": "fabudian", "name": "法布甜", "category": "souvenir", "address": "台中市西屯區大墩路979號", "aliases": ["法布甜"], "addressFrom": "法布甜官網、臺中觀光旅遊網"},
    {"id": "chen-yun", "name": "陳允寶泉", "category": "souvenir", "address": "台中市中區自由路二段36號", "aliases": ["陳允寶泉", "寶泉食品"], "addressFrom": "臺中觀光旅遊網（自由總店）"},
    {"id": "bluebird", "name": "青鳥旅行", "category": "souvenir", "address": "台中市西屯區中工二路160號", "aliases": ["青鳥旅行"], "addressFrom": "青鳥旅行官網中工創始店"},
    {"id": "seven-days", "name": "七個小日子", "category": "souvenir", "address": "台中市北屯區崇德路三段1號", "aliases": ["七個小日子"], "addressFrom": "七個小日子官網"},
    {"id": "jiujiujin", "name": "久久津乳酪本舖", "category": "souvenir", "addresses": ["台中市北屯區崇德十九路651號", "台中市北屯區崇德路十九路651號"], "aliases": ["久久津"], "addressFrom": "臺中觀光旅遊網"},
    {"id": "baba-ya", "name": "巴部屋工房", "category": "souvenir", "address": "台中市南區建成路1824號", "aliases": ["巴部屋工房"], "addressFrom": "臺中觀光旅遊網"},
    {"id": "licha", "name": "犁茶品記", "category": "souvenir", "address": "台中市西屯區福科路776號", "aliases": ["犁茶品記"], "addressFrom": "2026臺中購物節店家頁"},
    {"id": "wanglai", "name": "旺來八鳳梨酥", "category": "souvenir", "address": "台中市豐原區中正路5號", "aliases": ["旺來八"], "addressFrom": "2026臺中購物節店家頁"},
    {"id": "jellyfish", "name": "水母吃乳酪", "category": "dessert", "address": "台中市新社區中和街五段99-1號", "aliases": ["水母吃乳酪"], "addressFrom": "水母吃乳酪門市資料（新社本店）"},
    {"id": "smile-angel", "name": "微笑天使烘焙坊", "category": "souvenir", "address": "台中市大里區大衛路48-8號", "aliases": ["微笑天使"], "addressFrom": "微笑天使烘焙坊官網"},
    {"id": "mengen", "name": "蒙恩聽障烘焙坊", "category": "souvenir", "address": "台中市北屯區崇德路二段325號", "aliases": ["蒙恩聽障"], "addressFrom": "臺中觀光旅遊網"},
    {"id": "luhe", "name": "旅禾泡芙之家", "category": "souvenir", "address": "台中市西區美村路一段343號", "aliases": ["旅禾泡芙", "旅禾烘焙"], "addressFrom": "旅禾官網美村旗艦門市"},
    {"id": "yuzhenxin", "name": "裕珍馨", "category": "souvenir", "address": "台中市大甲區光明路67號", "aliases": ["裕珍馨"], "addressFrom": "裕珍馨光明旗艦店（臺中觀光旅遊網）"},
    {"id": "hoshino", "name": "星野製菓", "category": "souvenir", "address": "台中市西區公益路132號", "aliases": ["星野製菓", "星野烘焙"], "addressFrom": "2026臺中購物節公益門市"},
    {"id": "shixin", "name": "實心蛋捲", "category": "souvenir", "address": "台中市南屯區永春東路1348號", "aliases": ["實心蛋捲"], "addressFrom": "臺中觀光旅遊網永春總店"},
    {"id": "oklao", "name": "歐客佬精品咖啡", "category": "coffee", "address": "台中市北區崇德路一段517號", "aliases": ["歐客佬"], "addressFrom": "歐客佬太原門市 LINE 官方帳號"},
    {"id": "qiuguo", "name": "秋菓草莓大福", "category": "dessert", "address": "台中市北區文昌東一街77號", "aliases": ["秋菓"], "addressFrom": "秋菓門市食記所列地址"},
    {"id": "xiong", "name": "熊介巧", "category": "souvenir", "address": "台中市太平區中山路四段260巷12號", "aliases": ["熊介巧"], "addressFrom": "太平樹孝商圈店家頁"},
    {"id": "xiaolin", "name": "小林煎餅", "category": "souvenir", "address": "台中市大甲區鎮瀾街109號", "aliases": ["小林煎餅"], "addressFrom": "小林煎餅官網鎮瀾門市"},
    {"id": "zhengji", "name": "鄭記油蔥酥", "category": "souvenir", "address": "台中市清水區高美路477之4號", "aliases": ["鄭記油蔥酥", "鄭記"], "addressFrom": "鄭記油蔥酥官網"},
    {"id": "bingshu", "name": "炳叔烤玉米", "category": "souvenir", "address": "台中市西屯區文華路10之8號", "aliases": ["炳叔烤玉米", "炳叔"], "addressFrom": "炳叔烤玉米官網"},
    {"id": "orsir", "name": "歐舍咖啡", "category": "coffee", "address": "台中市西區五權路14號", "aliases": ["歐舍咖啡", "歐舍"], "addressFrom": "歐舍咖啡官網台中門市"},
    {"id": "shijin", "name": "似錦堂", "category": "souvenir", "address": "台中市西區民權路31號", "aliases": ["似錦堂"], "addressFrom": "似錦堂官網站前門市"},
    {"id": "isabelle", "name": "伊莎貝爾烘焙觀光工廠", "category": "souvenir", "address": "台中市大雅區中清路三段735號", "aliases": ["伊莎貝爾"], "addressFrom": "伊莎貝爾官網"},
    {"id": "piaoting", "name": "旅人票亭", "category": "souvenir", "address": "台中市北區中華路二段121號", "aliases": ["旅人票亭"], "addressFrom": "旅人票亭官網"},
    {"id": "ichisatori", "name": "一覺吐司", "category": "souvenir", "address": "台中市南屯區大墩路673號", "aliases": ["一覺吐司"], "addressFrom": "一覺吐司官網台中總店"},
    {"id": "yannick", "name": "亞尼克", "category": "souvenir", "address": "台中市西區五權西四街120號", "aliases": ["亞尼克"], "addressFrom": "臺中觀光旅遊網旗艦店"},
    {"id": "dearcreme", "name": "拾個月", "category": "souvenir", "address": "台中市沙鹿區北勢東路476號", "aliases": ["拾個月"], "addressFrom": "拾個月官網沙鹿旗艦店、2026臺中購物節"},
    {"id": "fongden", "name": "丰丹嚴選本舖", "category": "souvenir", "address": "台中市西屯區河南路二段27號", "aliases": ["丰丹嚴選", "丰丹"], "addressFrom": "丰丹官網河南總店"},
    {"id": "lemon-forest", "name": "檸檬森林", "category": "souvenir", "address": "台中市外埔區六分路120-8號", "aliases": ["檸檬森林"], "addressFrom": "2025臺中購物節店家頁"},
    {"id": "haole", "name": "好樂農莊", "category": "souvenir", "address": "台中市東勢區慶福街77之3號", "aliases": ["好樂農莊"], "addressFrom": "農業易遊網"},
    {"id": "qingtian", "name": "晴天菓子", "category": "dessert", "address": "台中市北區西屯路一段364號", "aliases": ["晴天菓子"], "addressFrom": "愛食記店家頁"},
    {"id": "rose-house", "name": "古典玫瑰園", "category": "tea", "address": "台中市中區中山路20號", "aliases": ["古典玫瑰園"], "addressFrom": "與宮原眼科同棟（中山路20號）", "detail": "玫瑰花瓣茶。門市在宮原眼科同棟。"},
]


def haversine(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def norm(value: str) -> str:
    text = value.lower().replace("・", "").replace("．", "").replace(".", "")
    text = re.sub(r"[^\w\u4e00-\u9fff]+", "", text)
    for suffix in ["股份有限公司", "有限公司", "食品行", "食品公司", "休閒農場"]:
        text = text.replace(suffix, "")
    return text


def same_name(a: str, b: str) -> bool:
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    short, long = (na, nb) if len(na) <= len(nb) else (nb, na)
    return len(short) >= 4 and short in long


def district_of(address: str) -> str:
    match = re.search(
        r"((?:西屯|南屯|北屯|豐原|清水|大里|太平|大甲|沙鹿|烏日|霧峰|大雅|神岡|潭子|新社|石岡|東勢|外埔|大安|龍井|大肚|梧棲|后里|和平|中|西|東|南|北)區|魚池鄉|土城區)",
        address,
    )
    return match.group(1) if match else ""


def city_of(address: str, district: str) -> str:
    if "新北" in address or district == "土城區":
        return "新北市"
    if "南投" in address or district == "魚池鄉":
        return "南投縣"
    return "台中市"


def tidy_address(address: str, city: str) -> str:
    text = re.sub(r"^\d{3,6}", "", address or "").strip()
    text = text.replace("臺北", "台北")
    if city == "台中市" and "台中" not in text and "臺中" not in text:
        text = "台中市" + text
    text = text.replace("臺中市", "台中市")
    return text


def product_of(note: str) -> str:
    match = re.search(r"必[買點吃喝][:：]\s*([^（(]+)", note or "")
    if not match:
        return ""
    return match.group(1).strip("、，, ")


def load_google():
    raw = (RAW / "google-list-raw.json").read_text(encoding="utf-8")
    if raw.startswith(")]}'"):
        raw = raw[5:]
    data = json.loads(raw)
    found = []

    def walk(node):
        if (
            isinstance(node, list)
            and len(node) >= 3
            and node[0] is None
            and isinstance(node[1], list)
            and isinstance(node[2], str)
            and len(node[2]) > 1
        ):
            meta = node[1]
            lat = lng = None
            address = ""
            for index, item in enumerate(meta):
                if (
                    isinstance(item, list)
                    and len(item) >= 4
                    and item[0] is None
                    and item[1] is None
                    and isinstance(item[2], (int, float))
                    and isinstance(item[3], (int, float))
                    and 20 < item[2] < 27
                    and 118 < item[3] < 123
                ):
                    lat, lng = float(item[2]), float(item[3])
                    for prev in range(index - 1, -1, -1):
                        if isinstance(meta[prev], str) and meta[prev].strip():
                            address = meta[prev].strip()
                            break
                    break
            if lat is not None and node[2] != "Jean Wu":
                found.append({"name": node[2], "address": address, "lat": lat, "lng": lng})
        if isinstance(node, list):
            for child in node:
                walk(child)

    walk(data)
    unique = []
    seen = set()
    for place in found:
        key = (place["name"], round(place["lat"], 5), round(place["lng"], 5))
        if key in seen:
            continue
        seen.add(key)
        unique.append(place)
    return unique


def clean_google_name(name: str) -> str:
    text = name.strip()
    text = text.split("※")[0].strip()
    text = re.split(r"[（(]", text)[0].strip()
    for sep in ["｜", "|", "－", " - ", "-"]:
        if sep in text:
            left = text.split(sep)[0].strip()
            if len(left) >= 2:
                text = left
                break
    text = re.sub(r"\s*營休.+$", "", text).strip()
    text = re.sub(r"\s+", " ", text)
    if text.lower().startswith("pingping"):
        text = "Pingping_attic"
    if re.search(r"(區|路|街|巷).+號", text):
        short = re.sub(r"^\d+", "", text)
        return f"清單地點 {short}"
    return text


def google_category(name: str) -> str:
    if any(key in name for key in ["成真", "ivette", "曲岸"]):
        return "coffee"
    lowered = name.lower()
    if "ivette" in lowered or lowered.startswith("cafe"):
        return "coffee"
    if any(key in name for key in ["先得月", "TokuToku", "Matcha"]):
        return "tea"
    if "咖啡" in name and "甜點" not in name and "芭荳" not in name:
        return "coffee"
    if any(key in name for key in ["麻糬", "蛋捲", "鳳梨酥"]):
        return "souvenir"
    return "dessert"


def http_json(url: str):
    request = urllib.request.Request(url, headers={"User-Agent": "taichung-souvenir-map/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def geocode(address: str):
    query = urllib.parse.urlencode(
        {"SingleLine": address, "countryCode": "TWN", "f": "json", "maxLocations": 1}
    )
    url = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?" + query
    data = http_json(url)
    time.sleep(0.2)
    candidates = data.get("candidates") or []
    if not candidates:
        return None
    best = candidates[0]
    loc = best["location"]
    return {
        "lat": loc["y"],
        "lng": loc["x"],
        "score": best.get("score"),
        "matched": best.get("address") or "",
    }


def reverse_geocode(lat: float, lng: float) -> str:
    query = urllib.parse.urlencode(
        {"location": f"{lng},{lat}", "f": "json", "langCode": "zh-TW"}
    )
    url = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?" + query
    try:
        data = http_json(url)
    except Exception:
        return ""
    time.sleep(0.2)
    address = (data.get("address") or {}).get("LongLabel") or (data.get("address") or {}).get("Address") or ""
    address = address.split(",")[0].strip()
    return address


def road_key(address: str) -> str:
    core = re.sub(r"之\d+", "", address)
    tail = re.split(r"[區市里]", core)[-1]
    match = re.search(r"([\u4e00-\u9fff]{2,8}(?:路|街|巷|道)(?:[一二三四五六七八九十]+段)?\d+)", tail)
    return match.group(1) if match else ""


def accept_geocode(address: str, result) -> bool:
    if not result or result["score"] < 90:
        return False
    key = road_key(address)
    matched = (result["matched"] or "").replace("臺", "台")
    if key and key not in matched.replace("臺", "台"):
        return False
    # Keep the point inside Taiwan.
    return 21.5 <= result["lat"] <= 25.5 and 119.5 <= result["lng"] <= 122.2


def matches_award(shop, award_name: str) -> bool:
    target = norm(award_name)
    if not target:
        return False
    for alias in [shop.get("name", ""), *shop.get("aliases", [])]:
        text = norm(alias)
        if len(text) < 3:
            continue
        if text == target or text in target or target in text:
            return True
    leading = re.match(r"\s*([\u4e00-\u9fff]{3,})", award_name)
    if leading:
        token = norm(leading.group(1))
        blob = norm(shop.get("name", "") + " " + " ".join(shop.get("aliases", [])))
        if len(token) >= 3 and token in blob:
            return True
    return False


def apply_google_list_ui(shops):
    """Names, ratings and status seen on the shared list itself. No review counts."""
    updates = {
        "g-1": {"rating": 4.6},
        "g-2": {"name": "初禾甜點．初中店", "rating": 4.7},
        "g-3": {"rating": 4.4},
        "g-4": {"rating": 4.6},
        "g-5": {"category": "coffee", "rating": 4.2},
        "g-6": {"rating": 4.6},
        "g-7": {"rating": 4.4},
        "g-8": {"rating": 4.3, "product": "富士山蛋糕卷"},
        "g-9": {"rating": 4.2},
        "g-10": {"name": "巴蕾麵包 Palais Boulangerie", "rating": 4.4},
        "g-11": {"rating": 4.8},
        "g-13": {"rating": 4.1},
        "g-14": {"category": "coffee", "rating": 4.7},
        "g-15": {"rating": 1.5},
        "g-16": {"rating": 4.1},
        "g-17": {"rating": 5.0},
        "g-18": {"rating": 4.7, "product": "開心果冰淇淋"},
        "g-20": {"rating": 4.6},
        "g-21": {"name": "木木や 烘焙早午餐", "rating": 4.1, "product": "可頌"},
        "g-22": {"rating": 4.6},
        "g-23": {"rating": 4.6},
        "g-25": {"name": "Bagel and Bagels", "rating": 3.7},
        "g-26": {"status": "Google 清單標示此地已不存在"},
        "g-27": {"rating": 4.0},
        "g-28": {"name": "牛頌 New Croissant", "rating": 4.7, "status": "Google 清單標示已歇業"},
        "g-29": {"name": "Come True Coffee 審計店", "rating": 4.5},
        "g-30": {"rating": 4.7},
        "g-31": {"rating": 4.7},
        "g-32": {"rating": 4.3},
        "g-33": {"rating": 4.1, "detail": "後方有付費停車場。"},
        "g-34": {"rating": 4.0},
        "g-36": {"rating": 4.7},
        "g-37": {"rating": 4.5, "product": "抹茶捲"},
    }
    by_id = {shop["id"]: shop for shop in shops}
    for shop_id, patch in updates.items():
        shop = by_id.get(shop_id)
        if not shop or any(source["kind"] == "live" for source in shop["sources"]):
            continue
        shop.update(patch)
        if "rating" in patch:
            shop["ratingSource"] = "店主 Google 清單"
        if patch.get("product") and not shop.get("note"):
            shop["note"] = f"📌必買：{patch['product']}"


def main():
    live = json.loads((RAW / "live-shops.json").read_text(encoding="utf-8"))
    prizes = json.loads((RAW / "prizes.json").read_text(encoding="utf-8"))
    for row in prizes:
        row["editionLabel"] = re.sub(r"\s+", "", row["editionLabel"].replace("> > - ", ""))

    live_alias = {
        1: ["如邑堂"],
        2: ["坂神本舖"],
        3: ["讓一糖"],
        4: ["creammm.t", "creammmt"],
        5: ["一福堂"],
        6: ["香格禮坊"],
        7: ["宮原眼科", "日出"],
        8: ["六月初一"],
        9: ["短腿阿鹿"],
        10: ["Mr啃", "mr啃"],
        11: ["今日蜜麻花"],
        12: ["禾雅堂"],
        13: ["鴻鼎菓子"],
        14: ["花鳥川"],
        15: ["不二糕餅"],
        16: ["H.YEH", "丹麥棒"],
        17: ["劉麵包廠"],
        18: ["雪花齋"],
        19: ["向陽房"],
        20: ["俊美食品", "俊美"],
        21: ["上和園"],
        22: ["七賢紅麴"],
        32: ["法米", "La Famille"],
        43: ["Haritts"],
    }

    shops = []
    for index, item in enumerate(live):
        address = tidy_address(item["address"], "台中市")
        shops.append(
            {
                "id": f"live-{item['id']}",
                "name": item["name"],
                "category": item["cat"],
                "product": product_of(item["note"]),
                "detail": "",
                "note": item["note"],
                "address": address,
                "district": district_of(address),
                "city": "台中市",
                "lat": item["lat"],
                "lng": item["lng"],
                "gmaps": item["gmaps"],
                "rating": item["rating"],
                "reviews": item["reviews"],
                "ratingSource": "前版網站",
                "awards": [],
                "sources": [{"kind": "live", "label": "前版地圖", "url": LIVE_URL}],
                "aliases": live_alias.get(item["id"], [item["name"]]),
                "order": index,
            }
        )

    google_places = load_google()
    print(f"google places parsed: {len(google_places)}")
    google_added = 0
    for index, place in enumerate(google_places):
        name = clean_google_name(place["name"])
        address = tidy_address(place["address"], city_of(place["address"], district_of(place["address"])))
        if not address:
            address = reverse_geocode(place["lat"], place["lng"])
            address = tidy_address(address, city_of(address, district_of(address)))
        district = district_of(address)
        city = city_of(address, district)
        host = None
        for shop in shops:
            if same_name(name, shop["name"]) or any(same_name(name, alias) for alias in shop["aliases"]):
                if haversine(place["lat"], place["lng"], shop["lat"], shop["lng"]) < 0.4:
                    host = shop
                    break
        if host:
            if not any(source["kind"] == "google-list" for source in host["sources"]):
                host["sources"].append(
                    {"kind": "google-list", "label": "店主 Google 清單「甜點」", "url": LIST_URL}
                )
            continue
        detail = ""
        if name.startswith("清單地點"):
            detail = "店主的 Google 清單只存了這組地址，沒有店名。"
        shops.append(
            {
                "id": f"g-{index+1}",
                "name": name,
                "category": google_category(place["name"] + name),
                "product": "",
                "detail": detail,
                "note": "",
                "address": address,
                "district": district,
                "city": city,
                "lat": place["lat"],
                "lng": place["lng"],
                "gmaps": "https://www.google.com/maps/search/?api=1&query="
                + urllib.parse.quote(f"{name} {address}"),
                "awards": [],
                "sources": [{"kind": "google-list", "label": "店主 Google 清單「甜點」", "url": LIST_URL}],
                "aliases": [name, place["name"]] + [token for token in ["iminding", "haritts", "frigomio"] if token in place["name"].lower()],
                "order": 1000 + index,
            }
        )
        google_added += 1

    failed = []
    for extra in EXTRAS:
        if any(matches_award(shop, extra["name"]) or same_name(extra["name"], shop["name"]) for shop in shops):
            # Still allow a genuinely different branch. Skip when the brand is already on the map.
            print("skip extra, brand already mapped:", extra["name"])
            continue
        candidates = extra.get("addresses") or [extra["address"]]
        hit = None
        tried = []
        for candidate in candidates:
            result = geocode(candidate)
            tried.append((candidate, result))
            if not result:
                continue
            if accept_geocode(candidate, result):
                hit = (candidate, result)
                break
            print(f"  weak {extra['name']} {candidate} -> {result['score']} {result['matched']}")
        if not hit:
            failed.append({"name": extra["name"], "reason": "地址無法定位", "tried": [item[0] for item in tried]})
            continue
        address, result = hit
        district = district_of(address)
        shops.append(
            {
                "id": extra["id"],
                "name": extra["name"],
                "category": extra["category"],
                "product": "",
                "detail": extra.get("detail", ""),
                "note": "",
                "address": address,
                "district": district,
                "city": "台中市",
                "lat": round(result["lat"], 7),
                "lng": round(result["lng"], 7),
                "geocodeScore": result["score"],
                "geocodeMatched": result["matched"],
                "addressFrom": extra["addressFrom"],
                "gmaps": "https://www.google.com/maps/search/?api=1&query="
                + urllib.parse.quote(f"{extra['name']} {address}"),
                "awards": [],
                "sources": [],
                "aliases": extra["aliases"],
                "order": 2000 + len(shops),
            }
        )
        print(f"geocoded {extra['name']} {result['score']} {result['matched']}")

    for row in prizes:
        award = {
            "edition": row["cid"],
            "year": YEARS.get(row["cid"], ""),
            "award": row["award"],
            "product": row["product"],
            "url": f"{PRIZE}?Cid={row['cid']}",
        }
        targets = [shop for shop in shops if matches_award(shop, row["name"])]
        for shop in targets:
            key = (award["edition"], award["award"], award["product"])
            if key in {(item["edition"], item["award"], item["product"]) for item in shop["awards"]}:
                continue
            shop["awards"].append(award)
            label_year = award["year"] or f"第{award['edition']}屆"
            label = f"{label_year} {award['award']}"
            if not any(source.get("url") == award["url"] and source.get("label") == label for source in shop["sources"]):
                shop["sources"].append({"kind": "official", "label": label, "url": award["url"]})

    for shop in shops:
        if shop["id"] == "oklao" and not shop["awards"]:
            # 獎項頁 HTML 沒有這四個字，市政府新聞稿有列入金口碑。
            for award in [
                {
                    "edition": 16,
                    "year": "2025",
                    "award": "金口碑獎",
                    "product": "",
                    "url": "https://www.taichung.gov.tw/8868/8872/9962/2840560",
                },
            ]:
                shop["awards"].append(award)
                shop["sources"].append({"kind": "official", "label": f"{award['year']} {award['award']}", "url": award["url"]})
        shop["awards"].sort(key=lambda item: item["edition"], reverse=True)
        if not shop["product"] and shop["awards"]:
            shop["product"] = shop["awards"][0]["product"]
        if shop["product"] and not shop["note"]:
            shop["note"] = f"📌必買：{shop['product']}"
        if shop["detail"] and shop["note"] and shop["detail"] not in shop["note"]:
            shop["note"] = shop["note"] + " " + shop["detail"]

    matched_names = []
    for shop in shops:
        matched_names.extend(shop["aliases"])
        matched_names.append(shop["name"])

    ungeocoded = []
    grouped = {}
    for row in prizes:
        grouped.setdefault(row["name"], []).append(row)
    for name, rows in grouped.items():
        if any(matches_award({"aliases": matched_names, "name": ""}, name) or same_name(name, alias) for alias in matched_names):
            continue
        # matches_award on a fake shop is wrong. Do it directly.
    ungeocoded = []
    for name, rows in grouped.items():
        fake = {"aliases": [name], "name": name}
        if any(matches_award(shop, name) for shop in shops):
            continue
        reason = "查無可靠的公開門市地址，沒有放上地圖"
        if any(item["name"] == name for item in failed):
            reason = "有地址但定位失敗，沒有放上地圖"
        ungeocoded.append(
            {
                "name": name,
                "reason": reason,
                "awards": [
                    {
                        "edition": row["cid"],
                        "year": YEARS.get(row["cid"], ""),
                        "award": row["award"],
                        "product": row["product"],
                        "url": f"{PRIZE}?Cid={row['cid']}",
                    }
                    for row in rows
                ],
            }
        )

    for shop in shops:
        shop.pop("aliases", None)

    apply_google_list_ui(shops)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "shops.json").write_text(json.dumps(shops, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "ungeocoded.json").write_text(
        json.dumps(ungeocoded, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    def has(kind):
        return sum(1 for shop in shops if any(source["kind"] == kind for source in shop["sources"]))

    print("---")
    print("shops", len(shops))
    print("live", has("live"), "google", has("google-list"), "official", has("official"))
    print("google added", google_added, "failed extras", len(failed))
    print("ungeocoded brands", len(ungeocoded))
    recent = [
        item["name"]
        for item in ungeocoded
        if any(award["edition"] >= 12 for award in item["awards"])
    ]
    print("ungeocoded 2020-2026", len(recent))
    for name in recent:
        print(" -", name)
    for item in failed:
        print("FAILED", item["name"], item["tried"])


if __name__ == "__main__":
    main()
