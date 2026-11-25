export type Category = "souvenir" | "coffee" | "dessert" | "tea";

export type Award = {
  edition: number;
  year: string;
  award: string;
  product: string;
  url: string;
};

export type ShopSource = {
  kind: "live" | "google-list" | "official";
  label: string;
  url: string;
};

export type Shop = {
  id: string;
  name: string;
  category: Category;
  product: string;
  detail: string;
  note: string;
  address: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  gmaps: string;
  rating?: number;
  reviews?: number;
  ratingSource?: string;
  status?: string;
  awards: Award[];
  sources: ShopSource[];
  order: number;
  addressFrom?: string;
};
