import raw from "../content.json";

export type Visa = {
  slug: string; title: string; section: string; group: string; turnaround: string;
  dhaFee: string; vfsFee: string; intro: string; qualifies: string; documents: string[]; purposes: string[];
};
export type Service = { slug: string; icon: string; title: string; blurb: string; visa: string | null };
export type Purpose = { id: string; label: string; question: string };
export type Article = { slug: string; tag: string; title: string; summary: string; minutes: number; featured?: boolean; body: { h: string; p: string }[] };

export const content = raw as {
  purposes: Purpose[]; services: Service[]; visas: Visa[]; commonDocuments: string[];
  faqs: { q: string; a: string }[]; articles: Article[];
};

export const { purposes, services, visas, commonDocuments, faqs, articles } = content;
export const visaBySlug = (slug?: string) => visas.find(v => v.slug === slug);
export const serviceHref = (s: Service) => (s.visa ? `/visa/${s.visa}` : "/corporate");

export const CONTACT = {
  email: "hello@globalpath.co.za",
  phone: "+27 (0) 10 555 0142",
  phoneHref: "+27105550142",
  address: "Sandton, Johannesburg, South Africa",
  hours: "Mon–Fri, 08:30–17:00 SAST",
};
