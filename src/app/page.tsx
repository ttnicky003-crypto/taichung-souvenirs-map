import { SouvenirApp } from "@/components/souvenir-app";
import shopsData from "@/data/shops.json";
import { buildJsonLd } from "@/lib/structured-data";
import type { Shop } from "@/lib/types";

const shops = shopsData as Shop[];
const jsonLd = JSON.stringify(buildJsonLd(shops)).replace(/</g, "\\u003c");

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <SouvenirApp />
    </>
  );
}
