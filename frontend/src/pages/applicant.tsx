import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, Button, Kicker, Alert, formatDate } from "../ui";
import { content, visaBySlug } from "../lib/content";
import { api, ApiError } from "../lib/api";

/* ---------- Form definition (shared with the server: content.json → applicantForm) ---------- */
type Cond = { field: string; in: string[] };
export type FieldDef = {
  key: string; label: string; type: string; required: boolean | Cond; showWhen?: Cond;
  options?: string[]; hint?: string; min?: number; max?: number; rule?: string; transform?: string; autocomplete?: string;
  fields?: FieldDef[]; maxItems?: number;
};
export type SectionDef = { id: string; title: string; intro?: string; fields: FieldDef[]; cores?: string[]; purposes?: string[] };
const FORM = (content as any).applicantForm as { sections: SectionDef[]; countries: string[] };

const regionNames = (() => { try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; } })();
const countryName = (code: string) => (code === "XK" ? "Kosovo" : regionNames?.of(code) || code);
const COUNTRY_OPTIONS = FORM.countries.map(c => ({ code: c, name: countryName(c) })).sort((a, b) => a.name.localeCompare(b.name));

export const getPath = (obj: any, path: string) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(obj: any, path: string, value: any) {
  const copy = structuredClone(obj || {});
  const keys = path.split(".");
  let o = copy;
  keys.slice(0, -1).forEach(k => { o[k] = o[k] && typeof o[k] === "object" ? o[k] : {}; o = o[k]; });
  o[keys[keys.length - 1]] = value;
  return copy;
}
const matches = (c: Cond | undefined, data: any) => !c || c.in.includes(getPath(data, c.field));
const shown = (f: FieldDef, data: any) => matches(f.showWhen, data);
const required = (f: FieldDef, data: any) => f.required === true || (typeof f.required === "object" && matches(f.required, data));
const isEmpty = (v: any) => v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && v.length === 0);

export function sectionsForVisa(slug: string): SectionDef[] {
  const visa = visaBySlug(slug);
  return FORM.sections.filter(s => (!s.cores || s.cores.includes(visa?.core || "")) && (!s.purposes || s.purposes.some(p => visa?.purposes.includes(p))));
}

const todayIso = () => new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);

/** Quick client-side check so people find problems before the final confirm; the server has the final say. */
function checkField(f: FieldDef, v: any): string | null {
  if (isEmpty(v)) return null;
  if (f.type === "email" && !/^\S+@\S+\.\S+$/.test(v)) return "Enter a valid email address.";
  if (f.type === "date") {
    if (f.rule === "past" && v > todayIso()) return "This date cannot be in the future.";
    if (f.rule === "future" && v < todayIso()) return "This date cannot be in the past.";
    if (f.rule === "passportExpiry" && v <= todayIso()) return "Your passport has expired. Renew it before applying.";
  }
  if (f.rule === "passport" && !/^[A-Z0-9]{5,15}$/.test(String(v).toUpperCase().replace(/\s+/g, ""))) return "Use 5 to 15 letters and numbers, without spaces.";
  if (f.rule === "phone" && !/^\+?[\d\s()-]{7,20}$/.test(v)) return "Enter a valid phone number, including the country code.";
  if ((f.type === "text" || f.type === "textarea") && f.min && String(v).trim().length < f.min) return `Please write at least ${f.min} characters.`;
  return null;
}

function sectionErrors(s: SectionDef, data: any): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const f of s.fields) {
    if (!shown(f, data)) continue;
    const v = getPath(data, f.key);
    if (isEmpty(v)) { if (required(f, data)) errs[f.key] = f.type === "checkbox" ? "Please confirm to continue." : f.type === "list" ? "Add at least one dependant." : "This field is required."; continue; }
    if (f.type === "list") {
      (v as any[]).forEach((item, i) => f.fields!.forEach(sub => {
        const sv = item?.[sub.key]; const key = `${f.key}.${i}.${sub.key}`;
        if (isEmpty(sv)) { if (sub.required) errs[key] = "This field is required."; return; }
        const m = checkField(sub, sv); if (m) errs[key] = m;
      }));
      continue;
    }
    const m = checkField(f, v); if (m) errs[f.key] = m;
  }
  return errs;
}

/* ---------- Field rendering ---------- */
function Field({ f, value, onChange, error, idPrefix = "" }: { f: FieldDef; value: any; onChange: (v: any) => void; error?: string; idPrefix?: string }) {
  const id = `ap-${idPrefix}${f.key.replace(/\./g, "-")}`;
  const req = f.required === true || typeof f.required === "object";
  const label = <label htmlFor={id}>{f.label}{!req && <span className="optional"> (optional)</span>}</label>;
  const common = { id, "aria-invalid": !!error, "aria-describedby": error ? `${id}-err` : f.hint ? `${id}-hint` : undefined };
  let control;
  switch (f.type) {
    case "textarea": control = <textarea {...common} rows={3} value={value ?? ""} maxLength={f.max} onChange={e => onChange(e.target.value)}/>; break;
    case "date": control = <input {...common} type="date" value={value ?? ""} max={f.rule === "past" ? todayIso() : undefined} min={f.rule === "future" || f.rule === "passportExpiry" ? todayIso() : undefined} onChange={e => onChange(e.target.value)}/>; break;
    case "number": control = <input {...common} type="number" inputMode="numeric" value={value ?? ""} min={f.min} max={f.max} onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))}/>; break;
    case "select": control = <div className="select-wrap"><select {...common} value={value ?? ""} onChange={e => onChange(e.target.value)}><option value="">Choose…</option>{f.options!.map(o => <option key={o}>{o}</option>)}</select><Icon name="down" size={16}/></div>; break;
    case "country": control = <div className="select-wrap"><select {...common} value={value ?? ""} onChange={e => onChange(e.target.value)}><option value="">Choose a country…</option>{COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select><Icon name="down" size={16}/></div>; break;
    case "yesno": return <fieldset className={`field yn-field ${error ? "has-error" : ""}`}><legend>{f.label}</legend>
        <div className="yn">{["Yes", "No"].map(o => <label key={o} className={value === o ? "is-on" : ""}><input type="radio" name={id} value={o} checked={value === o} onChange={() => onChange(o)}/>{o}</label>)}</div>
        {error && <small id={`${id}-err`} className="error-text">{error}</small>}</fieldset>;
    case "checkbox": return <div className={`field ${error ? "has-error" : ""}`}><label className={`consent declare ${error ? "has-error" : ""}`}><input id={id} type="checkbox" checked={value === true} onChange={e => onChange(e.target.checked)}/><span>{f.label}</span></label>{error && <small className="error-text">{error}</small>}</div>;
    default: control = <input {...common} type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"} autoComplete={f.autocomplete} value={value ?? ""} maxLength={f.max}
      onChange={e => onChange(f.transform === "upper" ? e.target.value.toUpperCase().replace(/\s+/g, "") : e.target.value)}/>;
  }
  return <div className={`field ${error ? "has-error" : ""} ${f.type === "textarea" ? "span-2" : ""}`}>
    {label}{control}
    {f.hint && !error && <small id={`${id}-hint`} className="hint">{f.hint}</small>}
    {error && <small id={`${id}-err`} className="error-text">{error}</small>}
  </div>;
}

function ListField({ f, value, onChange, errors }: { f: FieldDef; value: any[]; onChange: (v: any[]) => void; errors: Record<string, string> }) {
  const items = value || [];
  const update = (i: number, key: string, v: any) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)));
  return <div className="list-field span-2">
    {items.map((item, i) => <div key={i} className="list-item">
      <div className="list-item-head"><strong>Dependant {i + 1}</strong><button type="button" className="link-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button></div>
      <div className="form-grid">{f.fields!.map(sub => <Field key={sub.key} f={sub} idPrefix={`${i}-`} value={item?.[sub.key]} error={errors[`${f.key}.${i}.${sub.key}`]} onChange={v => update(i, sub.key, v)}/>)}</div>
    </div>)}
    {items.length < (f.maxItems || 10) && <button type="button" className="add-item" onClick={() => onChange([...items, {}])}><Icon name="users" size={18}/>Add a dependant</button>}
    {errors[f.key] && <small className="error-text">{errors[f.key]}</small>}
  </div>;
}

/* ---------- Read-only summary (portal review step and admin) ---------- */
function display(f: FieldDef, v: any) {
  if (isEmpty(v)) return <span className="muted">Not provided</span>;
  if (f.type === "country") return countryName(v);
  if (f.type === "date") return formatDate(v, { day: "numeric", month: "long", year: "numeric" });
  if (f.type === "checkbox") return v ? "Confirmed" : "Not confirmed";
  if (f.type === "number" && /salary|income|amount/i.test(f.key)) return `R${Number(v).toLocaleString("en-ZA").replace(/\s/g, ",")}`;
  return String(v);
}
export function ApplicantSummary({ sections, data, onEdit }: { sections: SectionDef[]; data: any; onEdit?: (i: number) => void }) {
  return <div className="ap-summary">{sections.map((s, i) => <section key={s.id}>
    <div className="ap-summary-head"><h3>{s.title}</h3>{onEdit && <button type="button" className="inline" onClick={() => onEdit(i)}>Edit</button>}</div>
    <dl>{s.fields.filter(f => shown(f, data) && f.type !== "checkbox").map(f => f.type === "list"
      ? <div key={f.key} className="dl-wide"><dt>{f.label}</dt><dd>{(getPath(data, f.key) || []).map((it: any, j: number) => <p key={j}>{it.fullName} · {it.relationship} · {it.dateOfBirth ? formatDate(it.dateOfBirth) : ""} · {it.nationality ? countryName(it.nationality) : ""} · {it.passportNumber}</p>)}</dd></div>
      : <div key={f.key}><dt>{f.label}</dt><dd>{display(f, getPath(data, f.key))}</dd></div>)}</dl>
  </section>)}</div>;
}

/* ---------- The multi-step form ---------- */
export function ApplicantForm({ onComplete }: { onComplete: () => void }) {
  const [state, setState] = useState<{ visa: string; data: any; completedAt: string | null; locked: boolean } | null>(null);
  const [data, setData] = useState<any>({});
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ visa: string; data: any; completedAt: string | null; locked: boolean }>("/portal/applicant")
      .then(r => { setState(r); setData(r.data || {}); if (r.completedAt) setStep(-1); })
      .catch((e: ApiError) => setError(e.message));
  }, []);

  const sections = useMemo(() => (state ? sectionsForVisa(state.visa) : []), [state]);
  const reviewIndex = sections.length;
  const sectionDone = (s: SectionDef) => Object.keys(sectionErrors(s, data)).length === 0;

  const saveDraft = async () => {
    if (!dirty.current || state?.locked) return;
    setSaving("saving");
    try { const r = await api<any>("/portal/applicant", { method: "PUT", body: { data, complete: false } }); dirty.current = false; setState(st => st && { ...st, completedAt: r.completedAt }); setSaving("saved"); }
    catch (e) { setError((e as ApiError).message); setSaving("idle"); }
  };
  // Autosave a few seconds after the last change
  useEffect(() => { if (!dirty.current) return; const t = setTimeout(saveDraft, 2500); return () => clearTimeout(t); }, [data]);

  const change = (key: string, v: any) => { dirty.current = true; setSaving("idle"); setData((d: any) => setPath(d, key, v)); setErrors(e => { const n = { ...e }; delete n[key]; return n; }); };
  const goTo = async (i: number) => { await saveDraft(); setStep(i); setError(""); topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const next = async () => {
    const errs = sectionErrors(sections[step], data);
    setErrors(errs);
    if (Object.keys(errs).length) { setError("Please fix the highlighted fields."); return; }
    await goTo(step + 1);
  };

  const confirm = async () => {
    setBusy(true); setError(""); setErrors({});
    try {
      await api("/portal/applicant", { method: "PUT", body: { data, complete: true } });
      dirty.current = false; onComplete();
    } catch (e) {
      const ae = e as ApiError;
      setError(ae.message); setErrors(ae.fields);
      const first = sections.findIndex(s => Object.keys(ae.fields).some(k => s.fields.some(f => k === f.key || k.startsWith(`${f.key}.`))));
      if (first >= 0) setStep(first);
    } finally { setBusy(false); }
  };

  if (!state) return error ? <Alert>{error}</Alert> : <p className="muted">Loading your details…</p>;
  const visaTitle = visaBySlug(state.visa)?.title || "your visa";

  // Completed view
  if (step === -1) return <>
    <div className="portal-head"><div><Kicker>Applicant details</Kicker><h1>Your details</h1></div>
      {!state.locked && <Button variant="quiet" onClick={() => setStep(0)}>Edit details</Button>}</div>
    <div className="submit-banner is-ready"><Icon name="check" size={22}/><div><strong>Applicant details complete</strong><p>{state.locked ? "Your application is with your advisor, so details are locked. Contact them if anything changes." : "You can still edit these until you submit your application. Editing means confirming them again."}</p></div>
      <Button onClick={onComplete}>Go to documents</Button></div>
    <ApplicantSummary sections={sections} data={data}/>
  </>;

  const current = sections[step];
  return <div ref={topRef} className="ap-wrap">
    <div className="portal-head">
      <div><Kicker>Step 1 of 3 · Applicant details</Kicker><h1>Tell us about yourself</h1><p className="muted">For your {visaTitle.toLowerCase()} application. Use the details exactly as they appear in your passport.</p></div>
      <span className={`save-state save-${saving}`} aria-live="polite">{saving === "saving" ? "Saving…" : saving === "saved" ? "Progress saved" : ""}</span>
    </div>
    <div className="ap-layout">
      <nav className="ap-steps" aria-label="Form sections">
        <ol>{sections.map((s, i) => <li key={s.id}><button type="button" className={`${i === step ? "is-current" : ""} ${sectionDone(s) ? "is-done" : ""}`} aria-current={i === step ? "step" : undefined} onClick={() => goTo(i)}>
          <span>{sectionDone(s) ? <Icon name="tick" size={13}/> : i + 1}</span>{s.title}</button></li>)}
          <li><button type="button" className={step === reviewIndex ? "is-current" : ""} onClick={() => goTo(reviewIndex)}><span><Icon name="eye" size={13}/></span>Review and confirm</button></li>
        </ol>
      </nav>
      <div className="ap-panel">
        {error && <Alert>{error}</Alert>}
        {step < reviewIndex ? <>
          <h2>{current.title}</h2>
          {current.intro && <p className="muted">{current.intro}</p>}
          <div className="form-grid">
            {current.fields.filter(f => shown(f, data)).map(f => f.type === "list"
              ? <ListField key={f.key} f={f} value={getPath(data, f.key)} errors={errors} onChange={v => change(f.key, v)}/>
              : <Field key={f.key} f={f} value={getPath(data, f.key)} error={errors[f.key]} onChange={v => change(f.key, v)}/>)}
          </div>
          <div className="form-nav">
            {step > 0 ? <button type="button" className="back" onClick={() => goTo(step - 1)}>Back</button> : <span/>}
            <Button key={`next-${step}`} onClick={next}>{step === reviewIndex - 1 ? "Review your details" : "Save and continue"}</Button>
          </div>
        </> : <>
          <h2>Review and confirm</h2>
          <p className="muted">Check everything carefully. Home Affairs compares these details with your passport and its own records.</p>
          {sections.some(s => !sectionDone(s)) && <Alert>Some sections are incomplete: {sections.filter(s => !sectionDone(s)).map(s => s.title).join(", ")}.</Alert>}
          <ApplicantSummary sections={sections.filter(s => s.id !== "declaration")} data={data} onEdit={i => goTo(i)}/>
          <div className="form-nav">
            <button type="button" className="back" onClick={() => goTo(reviewIndex - 1)}>Back</button>
            <Button key="confirm" onClick={confirm} busy={busy} disabled={sections.some(s => !sectionDone(s))}>Confirm details and continue</Button>
          </div>
        </>}
      </div>
    </div>
  </div>;
}
