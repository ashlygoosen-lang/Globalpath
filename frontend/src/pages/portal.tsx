import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Icon, Button, Kicker, Input, Select, Alert, formatDate, timeAgo } from "../ui";
import { visas, purposes } from "../lib/content";
import { api, ApiError, session, openProtectedFile } from "../lib/api";
import { href, navigate } from "../lib/router";

export type User = { id: string; name: string; email: string; role: "client" | "admin"; phone?: string };

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!session.token);
  useEffect(() => {
    if (!session.token) return;
    api<{ user: User }>("/auth/me").then(r => setUser(r.user)).catch(() => session.clear()).finally(() => setReady(true));
  }, []);
  const signIn = (token: string, u: User) => { session.set(token); setUser(u); };
  const signOut = () => { session.clear(); setUser(null); navigate("/portal"); };
  return { user, ready, signIn, signOut };
}

export function AuthPanel({ onAuth, adminOnly = false }: { onAuth: (t: string, u: User) => void; adminOnly?: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", visa: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setErrors({});
    try {
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const r = await api<{ token: string; user: User }>(`/auth/${mode}`, { body, auth: false });
      if (adminOnly && r.user.role !== "admin") { setError("This account doesn’t have staff access."); return; }
      onAuth(r.token, r.user);
    } catch (err) {
      const ae = err as ApiError; setError(ae.message); setErrors(ae.fields || {});
    } finally { setBusy(false); }
  };

  return <div className="auth">
    <div className="auth-side">
      <Kicker>{adminOnly ? "Staff access" : "Secure client portal"}</Kicker>
      <h1>{adminOnly ? "GlobalPath admin" : "Your immigration journey, in one place."}</h1>
      <p>{adminOnly ? "Manage enquiries, consultations and client applications." : "Track your application, upload documents securely and see every advisor update as it happens."}</p>
      {!adminOnly && <ul className="auth-points">
        <li><Icon name="file"/>A personalised document checklist for your visa</li>
        <li><Icon name="upload"/>Encrypted uploads instead of email attachments</li>
        <li><Icon name="clock"/>Live progress and next steps from your advisor</li>
      </ul>}
    </div>
    <form className="auth-form" onSubmit={submit} noValidate>
      {!adminOnly && <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-on" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-on" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
      </div>}
      {error && <Alert>{error}</Alert>}
      {mode === "register" && <Input label="Full name" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name}/>}
      <Input label="Email address" name="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email}/>
      <Input label="Password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={set("password")} error={errors.password} hint={mode === "register" ? "At least 8 characters, with a letter and a number." : undefined}/>
      {mode === "register" && <>
        <Select label="Which visa are you applying for?" name="visa" value={form.visa} onChange={set("visa")} error={errors.visa}>
          <option value="">Choose a visa or permit</option>
          {["Temporary residence", "Permanent residence", "Waivers"].map(g => <optgroup key={g} label={g}>{visas.filter(v => v.group === g).map(v => <option key={v.slug} value={v.slug}>{v.title}</option>)}</optgroup>)}
        </Select>
        <Input label="Phone (optional)" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} error={errors.phone}/>
      </>}
      <Button type="submit" busy={busy}>{mode === "login" ? "Sign in" : "Create account"}</Button>
      {!adminOnly && <p className="muted small">Not sure which visa applies? <a className="inline" href={href("/book")}>Book a consultation</a> first.</p>}
    </form>
  </div>;
}

type Dashboard = {
  application: null | { id: string; reference: string; visaTitle: string; stage: number; stageName: string; stages: string[]; progress: number; advisor: string; nextStep: string; documents: { total: number; received: number; approved: number; outstanding: number; attention: number } };
  visa: null | { turnaround: string; dhaFee: string; vfsFee: string };
  activity: { id: string; title: string; detail: string; createdAt: string; actor: string }[];
  consultations: { id: string; reference: string; service: string; date: string; time: string; mode: string; status: string }[];
};
type Doc = { id: string; name: string; kind: string; status: "outstanding" | "uploaded" | "approved" | "rejected"; originalName?: string; size?: number; uploadedAt?: string; reviewNote?: string };

export function Portal({ sessionApi }: { sessionApi: ReturnType<typeof useSession> }) {
  const { user, ready, signIn, signOut } = sessionApi;
  const [tab, setTab] = useState<"overview" | "documents" | "assessment">("overview");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Dashboard>("/portal/dashboard").then(setDash).catch((e: ApiError) => { if (e.status === 401) signOut(); else setError(e.message); });
  }, []);
  useEffect(() => { if (user?.role === "client") load(); }, [user, load]);
  useEffect(() => { if (user?.role === "admin") navigate("/admin"); }, [user]);

  if (!ready) return <div className="portal-bg"><div className="wrap loading">Loading your portal…</div></div>;
  if (!user) return <div className="portal-bg"><div className="wrap"><AuthPanel onAuth={signIn}/></div></div>;

  const first = user.name.split(" ")[0];
  const hour = Number(new Date().toLocaleString("en-ZA", { hour: "numeric", hour12: false, timeZone: "Africa/Johannesburg" }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const app = dash?.application;

  return <div className="portal-bg">
    <div className="wrap portal">
      <aside className="portal-nav">
        <div className="portal-user"><span>{user.name.split(" ").map(p => p[0]).slice(0, 2).join("")}</span><p><strong>{user.name}</strong><small>{app?.visaTitle || "Client"}</small></p></div>
        <nav>{([["overview", "Overview", "home"], ["documents", "Documents", "file"], ["assessment", "Eligibility check", "check"]] as const).map(([id, label, icon]) =>
          <button key={id} className={tab === id ? "is-on" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}><Icon name={icon} size={18}/>{label}
            {id === "documents" && app && app.documents.outstanding + app.documents.attention > 0 && <b>{app.documents.outstanding + app.documents.attention}</b>}
          </button>)}</nav>
        <button className="portal-out" onClick={signOut}><Icon name="logout" size={18}/>Sign out</button>
      </aside>
      <main className="portal-main">
        {error && <Alert>{error}</Alert>}
        {!dash && !error && <p className="muted">Loading…</p>}
        {dash && tab === "overview" && <>
          <div className="portal-head">
            <div><Kicker>{app ? `Application ${app.reference}` : "Welcome"}</Kicker><h1>{greeting}, {first}.</h1></div>
            {app && <span className="pill">{app.stageName}</span>}
          </div>
          {app ? <>
            <div className="progress-card">
              <div className="progress-top"><span>Application progress</span><strong>{app.progress}%</strong></div>
              <div className="progress" role="progressbar" aria-valuenow={app.progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${app.progress}%` }}/></div>
              <ol className="stage-track">{app.stages.map((s, i) => <li key={s} className={i < app.stage ? "is-done" : i === app.stage ? "is-current" : ""}><span/>{s}</li>)}</ol>
            </div>
            <div className="portal-cards">
              <div className="p-card"><Icon name="file"/><h3>Documents</h3><strong>{app.documents.received} of {app.documents.total}</strong><p>{app.documents.attention ? `${app.documents.attention} need your attention` : app.documents.outstanding ? `${app.documents.outstanding} still to upload` : "All documents received"}</p><button className="link" onClick={() => setTab("documents")}>Manage documents<Icon name="arrow" size={15}/></button></div>
              <div className="p-card"><Icon name="clock"/><h3>Next step</h3><strong className="p-small">{app.nextStep}</strong><p>Advisor: {app.advisor}</p></div>
              {dash.visa && <div className="p-card"><Icon name="briefcase"/><h3>{app.visaTitle}</h3><strong>{dash.visa.turnaround}</strong><p>Official target · DHA {dash.visa.dhaFee}</p></div>}
            </div>
            <div className="portal-split">
              <section className="activity"><h2>Recent activity</h2>
                {dash.activity.length ? <ul>{dash.activity.map(a => <li key={a.id} className={`actor-${a.actor}`}><span/><p><strong>{a.title}</strong><small>{a.detail}</small></p><time dateTime={a.createdAt}>{timeAgo(a.createdAt)}</time></li>)}</ul> : <p className="muted">No activity yet.</p>}
              </section>
              <section className="activity"><h2>Consultations</h2>
                {dash.consultations.length ? <ul>{dash.consultations.map(c => <li key={c.id}><span/><p><strong>{formatDate(c.date, { weekday: "short", day: "numeric", month: "short" })}, {c.time}</strong><small>{c.service}, {c.status}</small></p></li>)}</ul> : <p className="muted">None booked.</p>}
                <a className="link" href={href("/book")}>Book a consultation<Icon name="arrow" size={15}/></a>
              </section>
            </div>
          </> : <div className="empty"><h2>No open application</h2><p>Book a consultation and your advisor will open an application for you.</p><Button to="/book">Book a consultation</Button></div>}
        </>}
        {tab === "documents" && <Documents onChange={load}/>}
        {tab === "assessment" && <Assessment/>}
      </main>
    </div>
  </div>;
}

const STATUS_LABEL: Record<Doc["status"], string> = { outstanding: "To upload", uploaded: "In review", approved: "Approved", rejected: "Needs attention" };

function Documents({ onChange }: { onChange: () => void }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);

  const load = () => api<Doc[]>("/portal/documents").then(setDocs).catch((e: ApiError) => setError(e.message));
  useEffect(() => { load(); }, []);

  const pick = (docId: string | null) => { target.current = docId; fileRef.current?.click(); };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    if (target.current) fd.append("documentId", target.current);
    else fd.append("name", file.name.replace(/\.[^.]+$/, ""));
    setBusyId(target.current || "new"); setError("");
    try { await api("/portal/documents", { body: fd }); await load(); onChange(); }
    catch (err) { setError((err as ApiError).message); }
    finally { setBusyId(null); }
  };
  const remove = async (d: Doc) => {
    if (!confirm(`Remove ${d.originalName || d.name}?`)) return;
    try { await api(`/portal/documents/${d.id}`, { method: "DELETE" }); await load(); onChange(); } catch (err) { setError((err as ApiError).message); }
  };

  const groups: [string, Doc[]][] = docs ? [["Needs attention", docs.filter(d => d.status === "rejected")], ["Core documents", docs.filter(d => d.kind === "core" && d.status !== "rejected")], ["Visa-specific documents", docs.filter(d => d.kind === "category" && d.status !== "rejected")], ["Supporting documents", docs.filter(d => d.kind === "supporting" && d.status !== "rejected")]] : [];

  return <>
    <div className="portal-head">
      <div><Kicker>Application file</Kicker><h1>Documents</h1></div>
      <Button variant="dark" onClick={() => pick(null)} busy={busyId === "new"}><Icon name="upload" size={17}/>Add supporting document</Button>
    </div>
    <p className="muted">PDF, JPG, PNG or WebP, up to 10 MB each. Your advisor reviews each upload and will flag anything that needs replacing.</p>
    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*" hidden onChange={onFile}/>
    {error && <Alert>{error}</Alert>}
    {!docs && !error && <p className="muted">Loading documents…</p>}
    {groups.filter(([, list]) => list.length).map(([title, list]) => <section key={title} className="doc-group">
      <h2>{title}</h2>
      <ul className="doc-list">{list.map(d => <li key={d.id} className={`doc doc-${d.status}`}>
        <Icon name="file"/>
        <span className="doc-name"><strong>{d.name}</strong><small>{d.status === "rejected" && d.reviewNote ? d.reviewNote : d.originalName ? `${d.originalName} · ${d.size ? Math.ceil(d.size / 1024) + " KB" : ""} · ${d.uploadedAt ? timeAgo(d.uploadedAt) : ""}` : "Not uploaded yet"}</small></span>
        <span className={`status status-${d.status}`}>{STATUS_LABEL[d.status]}</span>
        <span className="doc-actions">
          {d.originalName && <button onClick={() => openProtectedFile(`/portal/documents/${d.id}/file`).catch(e => setError(e.message))} aria-label={`View ${d.name}`}><Icon name="eye" size={17}/></button>}
          {d.status !== "approved" && <button className="doc-upload" onClick={() => pick(d.id)} disabled={busyId === d.id}>{busyId === d.id ? "Uploading…" : d.originalName ? "Replace" : "Upload"}</button>}
          {d.originalName && d.status !== "approved" && <button onClick={() => remove(d)} aria-label={`Remove ${d.name}`}><Icon name="trash" size={17}/></button>}
        </span>
      </li>)}</ul>
    </section>)}
  </>;
}

export function Assessment() {
  const [questions, setQuestions] = useState<Record<string, [string, string][]> | null>(null);
  const [purpose, setPurpose] = useState("work");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<null | { outcome: string; score: number; total: number; message: string; suggested: { slug: string; title: string; turnaround: string }[] }>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api("/assessment/questions", { auth: false }).then(setQuestions).catch((e: ApiError) => setError(e.message)); }, []);

  const qs = questions?.[purpose] || [];
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (qs.some(([k]) => !answers[k])) { setError("Answer every question to see your result."); return; }
    setBusy(true); setError("");
    try { setResult(await api("/assessment", { body: { purpose, answers } })); } catch (err) { setError((err as ApiError).message); } finally { setBusy(false); }
  };

  if (result) return <div className="assess-result">
    <div className={`assess-badge assess-${result.outcome}`}>{result.score}/{result.total}</div>
    <Kicker>Indicative result</Kicker>
    <h2>{result.message}</h2>
    <p className="muted">This is an initial, non-legal indication. A professional assessment is needed to confirm eligibility and requirements.</p>
    {result.suggested.length > 0 && <><h3>Routes to look at</h3><ul className="side-related">{result.suggested.map(s => <a key={s.slug} href={href(`/visa/${s.slug}`)}><span>{s.title}</span><small>{s.turnaround}</small></a>)}</ul></>}
    <div className="hero-actions"><Button to={`/book?purpose=${purpose}`}>Discuss with an advisor</Button><Button variant="quiet" onClick={() => { setResult(null); setAnswers({}); }}>Start again</Button></div>
  </div>;

  return <>
    <div className="portal-head"><div><Kicker>Quick assessment</Kicker><h1>Check your eligibility</h1></div></div>
    <form className="assess" onSubmit={submit}>
      <fieldset className="choice-group"><legend>What is your goal?</legend>
        <div className="finder-chips">{purposes.map(p => <button type="button" key={p.id} className={purpose === p.id ? "is-on" : ""} aria-pressed={purpose === p.id} onClick={() => { setPurpose(p.id); setAnswers({}); }}>{p.label}</button>)}</div>
      </fieldset>
      {qs.map(([key, q]) => <fieldset key={key} className="assess-q"><legend>{q}</legend>
        <div className="yn">{["yes", "no"].map(v => <label key={v} className={answers[key] === v ? "is-on" : ""}><input type="radio" name={key} value={v} checked={answers[key] === v} onChange={() => setAnswers({ ...answers, [key]: v })}/>{v === "yes" ? "Yes" : "No"}</label>)}</div>
      </fieldset>)}
      {error && <Alert>{error}</Alert>}
      <Button type="submit" busy={busy} disabled={!questions}>See my result</Button>
    </form>
  </>;
}
