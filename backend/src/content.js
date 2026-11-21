import fs from 'node:fs';

export const content = JSON.parse(fs.readFileSync(new URL('./data/content.json', import.meta.url), 'utf8'));

export const serviceTitles = content.services.map(s => s.title);
export const visaBySlug = Object.fromEntries(content.visas.map(v => [v.slug, v]));
export const visaByTitle = Object.fromEntries(content.visas.map(v => [v.title, v]));

/** Default document checklist for an application of a given visa type. */
export function checklistFor(visaSlug) {
  const visa = visaBySlug[visaSlug];
  const core = content.commonDocuments.map(name => ({ name, kind: 'core' }));
  const specific = (visa?.documents || []).map(name => ({ name, kind: 'category' }));
  return [...core, ...specific];
}
