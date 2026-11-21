import raw from "../content.json";

export type Requirement = { key: string; name: string; note?: string; conditional?: boolean };
export type Visa = {
  slug: string; title: string; section: string; group: string; turnaround: string;
  dhaFee: string; vfsFee: string; intro: string; qualifies: string; purposes: string[];
  core: "temporary" | "medical" | "permanent" | "waiver"; requirements: Requirement[];
};
export type Service = { slug: string; icon: string; title: string; blurb: string; visa: string | null; href?: string };
export type Fees = { currency: string; application: number; appeal: number; vfs: number; consultation: number; asylum: number; applicationIncludes: string[]; appealIncludes: string[]; asylumIncludes: string[] };
export type Purpose = { id: string; label: string; question: string };
export type Article = { slug: string; tag: string; title: string; summary: string; minutes: number; featured?: boolean; body: { h: string; p: string }[] };

export const content = raw as {
  purposes: Purpose[]; services: Service[]; visas: Visa[]; documentSets: Record<string, Requirement[]>;
  faqs: { q: string; a: string }[]; articles: Article[]; fees: Fees;
};

export const { purposes, services, visas, documentSets, faqs, articles, fees } = content;

export const CORE_LABEL: Record<Visa["core"], string> = {
  temporary: "Required for every temporary residence application (DHA-1738)",
  medical: "Required for every medical treatment application (DHA-1738)",
  permanent: "Required for every permanent residence application (DHA-947)",
  waiver: "Required for every waiver application",
};
export const visaBySlug = (slug?: string) => visas.find(v => v.slug === slug);
export const serviceHref = (s: Service) => s.href || (s.visa ? `/visa/${s.visa}` : "/corporate");

/** R10,000 style formatting. */
export const rand = (n: number) => `R${n.toLocaleString("en-ZA").replace(/\u00a0|\s/g, ",")}`;

/** Numeric DHA fee, or null when it must be confirmed at submission. "R0 where exempt" counts as 0. */
export function dhaAmount(v: Visa): number | null {
  const m = v.dhaFee.match(/R\s?([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

/** Estimated cost of one application: government fee + VFS + GlobalPath professional fee. */
export function costFor(v: Visa) {
  const dha = dhaAmount(v);
  return { dha, vfs: content.fees.vfs, professional: content.fees.application, total: (dha ?? 0) + content.fees.vfs + content.fees.application, dhaKnown: dha !== null };
}

export const CONTACT = {
  email: "hello@globalpath.co.za",
  phone: "081 543 3728",
  phoneHref: "+27815433728",
  office: "Cape Town Hub",
  street: "39 Somerset Road, Green Point",
  city: "Cape Town, 8005, South Africa",
  address: "Cape Town Hub, 39 Somerset Road, Green Point, Cape Town, 8005, South Africa",
  area: "Green Point, Cape Town",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=39+Somerset+Road%2C+Green+Point%2C+Cape+Town+8005",
  hours: "Mon–Fri, 08:30–17:00 SAST",
};
