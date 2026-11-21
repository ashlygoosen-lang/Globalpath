import fs from 'node:fs';

export const content = JSON.parse(fs.readFileSync(new URL('./data/content.json', import.meta.url), 'utf8'));

export const serviceTitles = content.services.map(s => s.title);
export const visaBySlug = Object.fromEntries(content.visas.map(v => [v.slug, v]));
export const visaByTitle = Object.fromEntries(content.visas.map(v => [v.title, v]));

/**
 * Official document checklist for a visa type: the core list for its category
 * (DHA-1738 temporary residence, DHA-947 permanent residence) plus its own documents.
 * conditional = "where applicable" on the official form.
 */
export function checklistFor(visaSlug) {
  const visa = visaBySlug[visaSlug];
  if (!visa) return [];
  const core = (content.documentSets[visa.core] || []).map(i => ({ ...i, kind: 'core' }));
  const specific = (visa.requirements || []).map(i => ({ ...i, kind: 'category' }));
  return [...core, ...specific].map(i => ({ key: i.key, name: i.name, note: i.note || '', conditional: Boolean(i.conditional), kind: i.kind }));
}
