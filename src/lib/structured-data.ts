import type { Shop } from "./types";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

export function buildJsonLd(shops: Shop[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "zh-Hant-TW",
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/#shops`,
        name: "台中伴手禮店家",
        numberOfItems: shops.length,
        itemListElement: shops.map((shop, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Place",
            name: shop.name,
            address: {
              "@type": "PostalAddress",
              streetAddress: shop.address,
              addressLocality: shop.district || shop.city,
              addressRegion: shop.city || "台中市",
              addressCountry: "TW",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: shop.lat,
              longitude: shop.lng,
            },
          },
        })),
      },
    ],
  };
}
