# 台中伴手禮地圖

突然要買伴手禮時用的單頁地圖。可以篩類別、搜尋、定位後依距離排序，也能轉輪盤抽一間。資料是靜態 JSON，沒有後端。

## 本機執行

需要 Node.js 20 以上。

```bash
npm install
npm run dev
```

瀏覽器打開 http://127.0.0.1:43123

正式打包：

```bash
npm run build
```

靜態檔在 `out/`。

## 怎麼改店家

店家都在 `src/data/shops.json`。每一間長這樣：

```json
{
  "id": "my-shop",
  "name": "店名",
  "category": "souvenir",
  "product": "必買品項",
  "detail": "",
  "note": "📌必買：必買品項",
  "address": "台中市西區某某路1號",
  "district": "西區",
  "city": "台中市",
  "lat": 24.14,
  "lng": 120.68,
  "gmaps": "https://www.google.com/maps/search/?api=1&query=店名",
  "awards": [],
  "sources": [],
  "order": 3000
}
```

`category` 只能是 `souvenir`（伴手禮）、`coffee`（咖啡）、`dessert`（甜點）、`tea`（茶館）。

`lat`、`lng` 請用地址查出的真實座標。沒有座標就不要放進這個檔，否則會標在錯的地方。

`rating` 和 `reviews` 只有前版地圖原本就有的店才保留。新店不要自己填分數。

改完存檔，重新整理頁面即可。`order` 愈小，同類型的地圖編號愈前面。

查過但沒有可靠門市地址的得獎品牌在 `src/data/ungeocoded.json`，不會出現在地圖上。

## 部署到 Vercel

這個環境沒有已登入的 Vercel 帳號，所以沒有代為發布。請用自己的帳號，密碼只輸入在 Vercel 網站。

1. 把這個專案推到 GitHub。若還沒有倉庫，先在 GitHub 建一個空倉庫再推上去。
2. 打開 https://vercel.com/new ，用自己的帳號登入。
3. Import 剛才的 Git 倉庫。
4. Framework 維持 Next.js。不需要環境變數。
5. 按 Deploy。完成後會得到一組 `https://xxxx.vercel.app` 網址。

也可以在自己的電腦、已經登入 Vercel CLI 的情況下執行 `npx vercel`。
