import { FormEvent, useEffect, useMemo, useState } from "react";
import { Icon, Button, Kicker, Input, Select, Textarea, Alert, formatDate } from "../ui";
import { PageHero, CTA } from "../layout";
import { services, visaBySlug, CONTACT } from "../lib/content";
import { api, ApiError } from "../lib/api";
import { href } from "../lib/router";

type Fields = Record<string, string>;

export function Contact() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", service: "", message: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Fields>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState("");
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setErrors({});
    try {
      const res = await api<{ reference: string }>("/enquiries", { body: form, auth: false });
      setRef(res.reference);
    } catch (err) {
      const ae = err as ApiError;
      setError(ae.message); setErrors(ae.fields || {});
    } finally { setBusy(false); }
  };

  return <>
    <PageHero kicker="Contact GlobalPath" title="Let’s talk about where you’re going." text="Professional, confidential immigration guidance. We reply to every enquiry within one business day."/>
    <section className="section wrap two-col">
      <div className="contact-info">
        <h2>Speak to our team</h2>
        <p>Share a few details and an advisor will respond during business hours. For urgent matters, call us directly.</p>
        <ul className="contact-lines">
          <li><Icon name="mail"/><span><small>Email</small><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></span></li>
          <li><Icon name="phone"/><span><small>Phone</small><a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phone}</a></span></li>
          <li><Icon name="pin"/><span><small>Office</small>{CONTACT.address}</span></li>
          <li><Icon name="clock"/><span><small>Hours</small>{CONTACT.hours}</span></li>
        </ul>
        <div className="contact-book"><p>Prefer to speak face to face, or by video?</p><Button to="/book" variant="dark">Book a consultation</Button></div>
      </div>
      {ref ? <Success title="Thank you. Your enquiry has been received." reference={ref} text={`We’ve emailed a confirmation to ${form.email}. An advisor will reply within one business day.`}/> :
      <form className="form-card" onSubmit={submit} noValidate>
        <h2 className="form-title">Send an enquiry</h2>
        {error && <Alert>{error}</Alert>}
        <div className="row-2">
          <Input label="First name" name="firstName" autoComplete="given-name" required value={form.firstName} onChange={set("firstName")} error={errors.firstName}/>
          <Input label="Last name" name="lastName" autoComplete="family-name" required value={form.lastName} onChange={set("lastName")} error={errors.lastName}/>
        </div>
        <div className="row-2">
          <Input label="Email address" name="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} error={errors.email}/>
          <Input label="Phone (optional)" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} error={errors.phone}/>
        </div>
        <Select label="Area of interest" name="service" required value={form.service} onChange={set("service")} error={errors.service}>
          <option value="" disabled>Choose a service</option>
          {services.map(s => <option key={s.slug}>{s.title}</option>)}
        </Select>
        <Textarea label="How can we help?" name="message" rows={5} required value={form.message} onChange={set("message")} error={errors.message} placeholder="Tell us about your situation and timeline."/>
        <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={form.website} onChange={set("website")}/>
        <label className={`consent ${errors.consent ? "has-error" : ""}`}><input type="checkbox" checked={form.consent} onChange={set("consent")}/> <span>I agree to GlobalPath processing my information in line with the <a className="inline" href={href("/legal/privacy")}>privacy notice</a>.</span></label>
        {errors.consent && <small className="error-text">{errors.consent}</small>}
        <Button type="submit" busy={busy}>Send enquiry</Button>
      </form>}
    </section>
  </>;
}

export function Success({ title, text, reference, children }: { title: string; text: string; reference?: string; children?: React.ReactNode }) {
  return <div className="success" role="status">
    <div className="success-mark"><Icon name="tick" size={28}/></div>
    <h2>{title}</h2>
    {reference && <p className="ref">Reference <strong>{reference}</strong></p>}
    <p>{text}</p>
    {children}
  </div>;
}

type Slot = { time: string; available: boolean };
const MODES = [
  { id: "video", icon: "video", label: "Video call", note: "Anywhere in the world" },
  { id: "in-person", icon: "pin", label: "In person", note: "Our Cape Town office" },
  { id: "phone", icon: "phone", label: "Phone call", note: "We’ll call you" },
];

function nextWeekdays(n: number) {
  const out: string[] = [];
  const d = new Date(Date.now() + 2 * 3600e3);
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function Booking({ query }: { query: URLSearchParams }) {
  const initialService = useMemo(() => {
    const s = query.get("service");
    if (s && services.some(x => x.title === s)) return s;
    const visa = query.get("visa");
    if (visa) { const svc = services.find(x => x.visa === visa) || services.find(x => visaBySlug(x.visa || "")?.purposes.some(p => visaBySlug(visa)?.purposes.includes(p))); if (svc) return svc.title; }
    const purpose = query.get("purpose");
    const map: Record<string, string> = { work: "work-visas", business: "business-investment", study: "study-exchange", family: "family", settle: "permanent-residence", retire: "retirement-medical", visit: "temporary-residence", special: "waivers" };
    if (purpose && map[purpose]) return services.find(x => x.slug === map[purpose])?.title || "";
    return "";
  }, [query]);
  const visaNote = query.get("visa") ? `Interested in: ${visaBySlug(query.get("visa")!)?.title}. ` : "";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ service: initialService, mode: "video", date: "", time: "", name: "", email: "", phone: "", country: "", notes: visaNote, website: "" });
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotMsg, setSlotMsg] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errors, setErrors] = useState<Fields>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const days = useMemo(() => nextWeekdays(10), []);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.date) return;
    let cancelled = false;
    setLoadingSlots(true); setSlots(null); setSlotMsg("");
    api<{ slots: Slot[]; reason?: string }>(`/consultations/availability?date=${form.date}`, { auth: false })
      .then(r => { if (!cancelled) { setSlots(r.slots); setSlotMsg(r.reason || (r.slots.every(s => !s.available) ? "This day is fully booked. Choose another date." : "")); } })
      .catch((e: ApiError) => { if (!cancelled) setSlotMsg(e.message); })
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => { cancelled = true; };
  }, [form.date]);

  const next = () => {
    const errs: Fields = {};
    if (step === 1 && !form.service) errs.service = "Choose a service.";
    if (step === 2 && !form.date) errs.date = "Choose a date.";
    if (step === 2 && !form.time) errs.time = "Choose a time.";
    if (step === 3) {
      if (form.name.trim().length < 2) errs.name = "Enter your full name.";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email address.";
    }
    setErrors(errs);
    if (!Object.keys(errs).length) setStep(step + 1);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (step < 4) return next();
    setBusy(true); setError("");
    try {
      const res = await api<{ reference: string }>("/consultations", { body: form });
      setDone(res);
    } catch (err) {
      const ae = err as ApiError;
      setError(ae.message); setErrors(ae.fields || {});
      if (ae.fields?.time || ae.fields?.date) { setStep(2); set("time", ""); }
    } finally { setBusy(false); }
  };

  const mode = MODES.find(m => m.id === form.mode)!;
  const labels = ["Service", "Date & time", "Your details", "Confirm"];

  return <>
    <PageHero kicker="Book a consultation" title="A clearer path starts with a conversation." text="Choose a time that suits you and tell us a little about your immigration goals."/>
    <section className="section wrap two-col booking">
      <div className="booking-intro">
        <h2>What to expect</h2>
        <ul className="expect">
          <li><Icon name="clock"/><span><strong>45 minutes with an advisor</strong>Time to understand your history, goals and constraints.</span></li>
          <li><Icon name="file"/><span><strong>A written summary</strong>Your options, likely category and next steps, sent after the call.</span></li>
          <li><Icon name="lock"/><span><strong>Fully confidential</strong>Your information is handled under POPIA.</span></li>
        </ul>
        <p className="small-print">All times are South Africa Standard Time (UTC+2). We’ll confirm your appointment by email within one business day.</p>
      </div>

      {done ? <Success title="Your consultation request is in." reference={done.reference} text={`${formatDate(form.date, { weekday: "long", day: "numeric", month: "long" })} at ${form.time} SAST, by ${mode.label.toLowerCase()}. We’ve emailed a confirmation to ${form.email}.`}>
        <div className="hero-actions"><Button to="/portal" variant="dark">Create a client portal account</Button><Button to="/" variant="quiet">Back to home</Button></div>
      </Success> :
      <form className="form-card" onSubmit={submit} noValidate>
        <ol className="stepper" aria-label="Booking progress">{labels.map((l, i) => <li key={l} className={i + 1 === step ? "is-current" : i + 1 < step ? "is-done" : ""} aria-current={i + 1 === step ? "step" : undefined}><span>{i + 1 < step ? <Icon name="tick" size={14}/> : i + 1}</span>{l}</li>)}</ol>
        {error && <Alert>{error}</Alert>}

        {step === 1 && <div className="step-pane">
          <h2 className="form-title">What would you like to discuss?</h2>
          <Select label="Immigration service" name="service" value={form.service} onChange={e => set("service", e.target.value)} error={errors.service}>
            <option value="">Choose a service</option>
            {services.map(s => <option key={s.slug}>{s.title}</option>)}
          </Select>
          <fieldset className="choice-group"><legend>How would you like to meet?</legend>
            <div className="choices">{MODES.map(m => <label key={m.id} className={`choice ${form.mode === m.id ? "is-on" : ""}`}>
              <input type="radio" name="mode" value={m.id} checked={form.mode === m.id} onChange={() => set("mode", m.id)}/>
              <Icon name={m.icon}/><strong>{m.label}</strong><small>{m.note}</small>
            </label>)}</div>
          </fieldset>
        </div>}

        {step === 2 && <div className="step-pane">
          <h2 className="form-title">Choose a date and time</h2>
          <fieldset className="choice-group"><legend>Date</legend>
            <div className="days">{days.map(d => <button type="button" key={d} className={`day ${form.date === d ? "is-on" : ""}`} aria-pressed={form.date === d} onClick={() => { set("date", d); set("time", ""); }}>
              <small>{formatDate(d, { weekday: "short" })}</small><strong>{formatDate(d, { day: "numeric" })}</strong><small>{formatDate(d, { month: "short" })}</small>
            </button>)}</div>
            {errors.date && <small className="error-text">{errors.date}</small>}
          </fieldset>
          {form.date && <fieldset className="choice-group"><legend>Time (SAST)</legend>
            {loadingSlots && <p className="muted">Checking availability…</p>}
            {slots && <div className="slots">{slots.map(s => <button type="button" key={s.time} disabled={!s.available} className={`slot ${form.time === s.time ? "is-on" : ""}`} aria-pressed={form.time === s.time} onClick={() => set("time", s.time)}>{s.time}</button>)}</div>}
            {slotMsg && <p className="muted">{slotMsg}</p>}
            {errors.time && <small className="error-text">{errors.time}</small>}
          </fieldset>}
        </div>}

        {step === 3 && <div className="step-pane">
          <h2 className="form-title">Tell us about yourself</h2>
          <Input label="Full name" name="name" autoComplete="name" value={form.name} onChange={e => set("name", e.target.value)} error={errors.name}/>
          <div className="row-2">
            <Input label="Email address" name="email" type="email" autoComplete="email" value={form.email} onChange={e => set("email", e.target.value)} error={errors.email}/>
            <Input label="Phone (optional)" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={e => set("phone", e.target.value)} error={errors.phone}/>
          </div>
          <Input label="Country of residence (optional)" name="country" autoComplete="country-name" value={form.country} onChange={e => set("country", e.target.value)}/>
          <Textarea label="Briefly describe your goals (optional)" name="notes" rows={4} value={form.notes} onChange={e => set("notes", e.target.value)}/>
          <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={form.website} onChange={e => set("website", e.target.value)}/>
        </div>}

        {step === 4 && <div className="step-pane">
          <h2 className="form-title">Check and confirm</h2>
          <dl className="summary">
            <div><dt>Service</dt><dd>{form.service}</dd></div>
            <div><dt>When</dt><dd>{formatDate(form.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, {form.time} SAST</dd></div>
            <div><dt>Format</dt><dd>{mode.label}</dd></div>
            <div><dt>Name</dt><dd>{form.name}</dd></div>
            <div><dt>Email</dt><dd>{form.email}</dd></div>
            {form.phone && <div><dt>Phone</dt><dd>{form.phone}</dd></div>}
          </dl>
        </div>}

        <div className="form-nav">
          {step > 1 ? <button type="button" className="back" onClick={() => setStep(step - 1)}>Back</button> : <span/>}
          {step < 4 ? <Button key="next" onClick={next}>Continue</Button> : <Button key="submit" type="submit" busy={busy}>Request consultation</Button>}
        </div>
      </form>}
    </section>
    <CTA/>
  </>;
}

