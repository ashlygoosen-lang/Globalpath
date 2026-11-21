// Validates the applicant details form against the shared definition in content.json (applicantForm).
import { content, visaBySlug } from './content.js';

const FORM = content.applicantForm;
const COUNTRIES = new Set(FORM.countries);
const DAY = 864e5;

export const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function set(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach(k => { o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {}; o = o[k]; });
  o[keys.at(-1)] = value;
}
const matches = (cond, data) => !cond || (typeof cond === 'object' && cond.in.includes(get(data, cond.field)));
const isShown = (field, data) => matches(field.showWhen, data);
const isRequired = (field, data) => field.required === true || (typeof field.required === 'object' && matches(field.required, data));
const empty = v => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** Sections that apply to this visa type. */
export function sectionsFor(visaSlug) {
  const visa = visaBySlug[visaSlug];
  return FORM.sections.filter(s =>
    (!s.cores || s.cores.includes(visa?.core)) &&
    (!s.purposes || s.purposes.some(p => visa?.purposes.includes(p))));
}

const today = () => new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime());
const addDays = (iso, n) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * DAY).toISOString().slice(0, 10);

function clean(field, raw) {
  if (raw === undefined || raw === null) return undefined;
  switch (field.type) {
    case 'checkbox': return raw === true;
    case 'number': { if (raw === '') return ''; const n = Number(raw); return Number.isFinite(n) ? n : String(raw).slice(0, 20); }
    case 'list': return Array.isArray(raw) ? raw.slice(0, field.maxItems || 10).map(item => {
      const out = {};
      for (const sub of field.fields) { const v = clean(sub, item?.[sub.key]); if (v !== undefined) out[sub.key] = v; }
      return out;
    }) : [];
    default: {
      let s = String(raw).trim().slice(0, field.max || 600);
      if (field.transform === 'upper') s = s.toUpperCase().replace(/\s+/g, '');
      return s;
    }
  }
}

function checkValue(field, v, data, label = field.label) {
  const t = field.type;
  if (t === 'select' && !field.options.includes(v)) return 'Choose one of the options.';
  if (t === 'country' && !COUNTRIES.has(v)) return 'Choose a country.';
  if (t === 'yesno' && v !== 'Yes' && v !== 'No') return 'Choose yes or no.';
  if (t === 'checkbox' && v !== true) return 'Please confirm to continue.';
  if (t === 'email' && !/^\S+@\S+\.\S+$/.test(v)) return 'Enter a valid email address.';
  if (t === 'number') {
    if (typeof v !== 'number') return 'Enter a number.';
    if (field.min !== undefined && v < field.min) return `Must be at least ${field.min}.`;
    if (field.max !== undefined && v > field.max) return `Must be ${field.max} or less.`;
  }
  if ((t === 'text' || t === 'textarea') && field.min && v.length < field.min) return `Please write at least ${field.min} characters.`;
  if (t === 'date') {
    if (!isDate(v)) return 'Enter a valid date.';
    if (field.rule === 'past' && v > today()) return 'This date cannot be in the future.';
    if (field.rule === 'future' && v < today()) return 'This date cannot be in the past.';
    if (field.rule === 'passportExpiry') {
      if (v <= today()) return 'Your passport has expired. Renew it before applying.';
      const dep = get(data, 'trip.departureDate');
      if (isDate(dep || '') && v < addDays(dep, 30)) return 'Your passport must be valid for at least 30 days after your intended departure.';
    }
  }
  if (field.rule === 'passport' && !/^[A-Z0-9]{5,15}$/.test(v)) return 'Use 5 to 15 letters and numbers, without spaces.';
  if (field.rule === 'phone' && !/^\+?[\d\s()-]{7,20}$/.test(v)) return 'Enter a valid phone number, including the country code.';
  if (field.rule === 'saId' && !/^(\d{13}|[A-Z0-9]{6,20})$/i.test(v.replace(/\s/g, ''))) return 'Enter a 13-digit ID number or a valid permit number.';
  return null;
}

/**
 * Sanitises the submitted data to the fields that apply to this visa.
 * With complete=true, validates every required field and cross-field rule.
 */
export function validateApplicant(input, visaSlug, { complete = false } = {}) {
  const data = {};
  const sections = sectionsFor(visaSlug);
  for (const s of sections) for (const field of s.fields) {
    const v = clean(field, get(input, field.key));
    if (v !== undefined) set(data, field.key, v);
  }
  const errors = {};
  if (!complete) return { data, errors };

  for (const s of sections) for (const field of s.fields) {
    if (!isShown(field, data)) { set(data, field.key, undefined); continue; }
    const v = get(data, field.key);
    if (empty(v) || v === false) {
      if (isRequired(field, data)) errors[field.key] = field.type === 'checkbox' ? 'Please confirm to continue.' : field.type === 'list' ? 'Add at least one dependant.' : 'This field is required.';
      continue;
    }
    if (field.type === 'list') {
      v.forEach((item, i) => field.fields.forEach(sub => {
        const sv = item[sub.key];
        const key = `${field.key}.${i}.${sub.key}`;
        if (empty(sv)) { if (sub.required) errors[key] = 'This field is required.'; return; }
        const msg = checkValue(sub, sv, data); if (msg) errors[key] = msg;
      }));
      continue;
    }
    const msg = checkValue(field, v, data);
    if (msg) errors[field.key] = msg;
  }

  // Cross-field checks
  const pairs = [
    ['passport.issueDate', 'passport.expiryDate', 'The expiry date must be after the date of issue.'],
    ['trip.arrivalDate', 'trip.departureDate', 'Departure must be after arrival.'],
    ['study.startDate', 'study.endDate', 'The end date must be after the start date.'],
    ['history.firstEntryDate', 'history.lastEntryDate', 'Your most recent entry cannot be before your first entry.'],
  ];
  for (const [a, b, msg] of pairs) {
    const va = get(data, a), vb = get(data, b);
    if (isDate(va || '') && isDate(vb || '') && vb < va && !errors[b]) errors[b] = msg;
  }
  const dob = get(data, 'personal.dateOfBirth');
  const first = get(data, 'history.firstEntryDate');
  if (isDate(dob || '') && isDate(first || '') && first < dob && !errors['history.firstEntryDate']) errors['history.firstEntryDate'] = 'This is before your date of birth.';
  if (get(data, 'history.inSouthAfrica') === 'Yes' && get(data, 'history.everEntered') === 'No') errors['history.everEntered'] = 'You said you are in South Africa now, so you have entered before.';

  return { data, errors };
}

/** Pre-fill from the account when an application is created. */
export function initialApplicant(user) {
  const parts = user.name.trim().split(/\s+/);
  return {
    personal: { surname: parts.length > 1 ? parts.at(-1) : '', givenNames: parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] },
    contact: { email: user.email, phone: user.phone || '' },
  };
}
