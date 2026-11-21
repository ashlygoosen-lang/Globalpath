import { Fragment, useEffect, useState } from "react";
import { Icon, Kicker, Alert, formatDate, timeAgo, Button } from "../ui";
import { api, ApiError, openProtectedFile } from "../lib/api";
import { AuthPanel, useSession } from "./portal";
import { href } from "../lib/router";

type Stats = { enquiries: { total: number; new: number; week: number }; consultations: { total: number; requested: number; upcoming: number }; clients: { total: number }; documents: { awaitingReview: number }; subscribers: number };

export function Admin({ sessionApi }: { sessionApi: ReturnType<typeof useSession> }) {
  const { user, ready, signIn, signOut } = sessionApi;
  const [tab, setTab] = useState<"overview" | "enquiries" | "consultations" | "clients">("overview");
  if (!ready) return <div className="portal-bg"><div className="wrap loading">Loading…</div></div>;
  if (!user || user.role !== "admin") return <div className="portal-bg"><div className="wrap">
    {user && <Alert>You’re signed in as a client. <button className="inline" onClick={signOut}>Sign out</button> to use a staff account.</Alert>}
    {!user && <AuthPanel onAuth={signIn} adminOnly/>}
  </div></div>;

  return <div className="portal-bg">
    <div className="wrap portal">
      <aside className="portal-nav">
        <div className="portal-user"><span>GP</span><p><strong>{user.name}</strong><small>Staff</small></p></div>
        <nav>{([["overview", "Overview", "chart"], ["enquiries", "Enquiries", "mail"], ["consultations", "Consultations", "calendar"], ["clients", "Clients", "users"]] as const).map(([id, label, icon]) =>
          <button key={id} className={tab === id ? "is-on" : ""} onClick={() => setTab(id)}><Icon name={icon} size={18}/>{label}</button>)}</nav>
        <button className="portal-out" onClick={signOut}><Icon name="logout" size={18}/>Sign out</button>
      </aside>
      <main className="portal-main">
        {tab === "overview" && <Overview go={setTab}/>}
        {tab === "enquiries" && <Enquiries/>}
        {tab === "consultations" && <Consultations/>}
        {tab === "clients" && <Clients/>}
      </main>
    </div>
  </div>;
}

function useLoad<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = () => api<T>(path).then(setData).catch((e: ApiError) => setError(e.message));
  useEffect(() => { reload(); }, [path]);
  return { data, error, reload, setError };
}

function Overview({ go }: { go: (t: any) => void }) {
  const { data, error } = useLoad<Stats>("/admin/stats");
  return <>
    <div className="portal-head"><div><Kicker>Dashboard</Kicker><h1>Today at GlobalPath</h1></div></div>
    {error && <Alert>{error}</Alert>}
    {data && <div className="stat-grid">
      <button onClick={() => go("enquiries")}><small>New enquiries</small><strong>{data.enquiries.new}</strong><span>{data.enquiries.week} this week · {data.enquiries.total} total</span></button>
      <button onClick={() => go("consultations")}><small>Awaiting confirmation</small><strong>{data.consultations.requested}</strong><span>{data.consultations.upcoming} upcoming</span></button>
      <button onClick={() => go("clients")}><small>Documents to review</small><strong>{data.documents.awaitingReview}</strong><span>{data.clients.total} portal clients</span></button>
      <div><small>Newsletter subscribers</small><strong>{data.subscribers}</strong><span>Monthly briefing list</span></div>
    </div>}
  </>;
}

function StatusSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return <div className="select-wrap select-sm"><select value={value} onChange={e => onChange(e.target.value)} aria-label="Status">{options.map(o => <option key={o} value={o}>{o[0].toUpperCase() + o.slice(1)}</option>)}</select><Icon name="down" size={14}/></div>;
}

function Enquiries() {
  const { data, error, reload, setError } = useLoad<any[]>("/admin/enquiries");
  const [open, setOpen] = useState<string | null>(null);
  const update = (id: string, status: string) => api(`/admin/enquiries/${id}`, { method: "PATCH", body: { status } }).then(reload).catch((e: ApiError) => setError(e.message));
  return <>
    <div className="portal-head"><div><Kicker>Inbox</Kicker><h1>Enquiries</h1></div></div>
    {error && <Alert>{error}</Alert>}
    {data && !data.length && <div className="empty"><p>No enquiries yet. They’ll appear here as soon as someone uses the contact form.</p></div>}
    {data && data.length > 0 && <div className="table-wrap"><table className="admin-table">
      <thead><tr><th>Received</th><th>Name</th><th>Service</th><th>Status</th></tr></thead>
      <tbody>{data.map(e => <Fragment key={e.id}>
        <tr className={open === e.id ? "is-open" : ""} onClick={() => setOpen(open === e.id ? null : e.id)}>
          <td>{timeAgo(e.createdAt)}<small>{e.reference}</small></td><td><strong>{e.firstName} {e.lastName}</strong><small>{e.email}</small></td><td>{e.service}</td>
          <td onClick={ev => ev.stopPropagation()}><StatusSelect value={e.status} options={["new", "contacted", "closed"]} onChange={v => update(e.id, v)}/></td>
        </tr>
        {open === e.id && <tr className="detail-row"><td colSpan={4}><p>{e.message}</p><p className="muted">{e.phone && <>Phone: {e.phone} · </>}<a className="inline" href={`mailto:${e.email}?subject=Your GlobalPath enquiry ${e.reference}`}>Reply by email</a></p></td></tr>}
      </Fragment>)}</tbody>
    </table></div>}
  </>;
}

function Consultations() {
  const { data, error, reload, setError } = useLoad<any[]>("/admin/consultations");
  const update = (id: string, status: string) => api(`/admin/consultations/${id}`, { method: "PATCH", body: { status } }).then(reload).catch((e: ApiError) => setError(e.message));
  const modeLabel: Record<string, string> = { video: "Video", "in-person": "In person", phone: "Phone" };
  return <>
    <div className="portal-head"><div><Kicker>Diary</Kicker><h1>Consultations</h1></div></div>
    {error && <Alert>{error}</Alert>}
    {data && !data.length && <div className="empty"><p>No consultations booked yet.</p></div>}
    {data && data.length > 0 && <div className="table-wrap"><table className="admin-table">
      <thead><tr><th>When (SAST)</th><th>Client</th><th>Service</th><th>Format</th><th>Status</th></tr></thead>
      <tbody>{data.map(c => <tr key={c.id}>
        <td><strong>{formatDate(c.date, { weekday: "short", day: "numeric", month: "short" })}</strong><small>{c.time} · {c.reference}</small></td>
        <td><strong>{c.name}</strong><small>{c.email}{c.country ? ` · ${c.country}` : ""}</small></td>
        <td>{c.service}{c.notes && <small title={c.notes}>{c.notes.slice(0, 60)}{c.notes.length > 60 ? "…" : ""}</small>}</td>
        <td>{modeLabel[c.mode]}</td>
        <td><StatusSelect value={c.status} options={["requested", "confirmed", "completed", "cancelled"]} onChange={v => update(c.id, v)}/></td>
      </tr>)}</tbody>
    </table></div>}
  </>;
}

function Clients() {
  const { data, error } = useLoad<any[]>("/admin/clients");
  const [selected, setSelected] = useState<string | null>(null);
  if (selected) return <ClientDetail id={selected} back={() => setSelected(null)}/>;
  return <>
    <div className="portal-head"><div><Kicker>Portal</Kicker><h1>Clients</h1></div></div>
    {error && <Alert>{error}</Alert>}
    {data && !data.length && <div className="empty"><p>No portal clients yet. Clients create accounts from the <a className="inline" href={href("/portal")}>client portal</a>.</p></div>}
    {data && data.length > 0 && <div className="table-wrap"><table className="admin-table">
      <thead><tr><th>Client</th><th>Visa</th><th>Stage</th><th>Progress</th><th>Docs to review</th></tr></thead>
      <tbody>{data.map(c => <tr key={c.id} onClick={() => c.application && setSelected(c.application.id)} className="clickable">
        <td><strong>{c.name}</strong><small>{c.email}</small></td>
        <td>{c.application?.visaTitle || "—"}<small>{c.application?.reference}</small></td>
        <td>{c.application?.stageName || "—"}</td>
        <td>{c.application ? <div className="mini-progress"><i style={{ width: `${c.application.progress}%` }}/><span>{c.application.progress}%</span></div> : "—"}</td>
        <td>{c.application ? c.application.documents.received - c.application.documents.approved : 0}</td>
      </tr>)}</tbody>
    </table></div>}
  </>;
}

function ClientDetail({ id, back }: { id: string; back: () => void }) {
  const { data, error, reload, setError } = useLoad<any>(`/admin/applications/${id}`);
  const [note, setNote] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [advisor, setAdvisor] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setNextStep(data.application.nextStep || ""); setAdvisor(data.application.advisor || ""); } }, [data]);

  const patchApp = async (body: any) => {
    setBusy(true);
    try { await api(`/admin/applications/${id}`, { method: "PATCH", body }); setNote(""); await reload(); } catch (e) { setError((e as ApiError).message); } finally { setBusy(false); }
  };
  const review = async (docId: string, status: string) => {
    const reviewNote = status === "rejected" ? prompt("What should the client fix?") || "" : "";
    if (status === "rejected" && !reviewNote) return;
    try { await api(`/admin/documents/${docId}`, { method: "PATCH", body: { status, reviewNote } }); await reload(); } catch (e) { setError((e as ApiError).message); }
  };
  if (!data) return <>{error ? <Alert>{error}</Alert> : <p className="muted">Loading…</p>}</>;
  const { application: app, client, documents, activity } = data;

  return <>
    <button className="back" onClick={back}>Back to clients</button>
    <div className="portal-head"><div><Kicker>{app.reference} · {app.visaTitle}</Kicker><h1>{client.name}</h1><p className="muted">{client.email}{client.phone ? ` · ${client.phone}` : ""}</p></div><span className="pill">{app.progress}%</span></div>
    {error && <Alert>{error}</Alert>}
    <section className="admin-panel">
      <h2>Application</h2>
      <div className="fields-3">
        <div className="field"><label htmlFor="stage">Stage</label><div className="select-wrap"><select id="stage" value={app.stage} onChange={e => patchApp({ stage: Number(e.target.value) })}>{app.stages.map((s: string, i: number) => <option key={s} value={i}>{s}</option>)}</select><Icon name="down" size={16}/></div></div>
        <div className="field"><label htmlFor="advisor">Advisor</label><input id="advisor" value={advisor} onChange={e => setAdvisor(e.target.value)} onBlur={() => advisor !== app.advisor && patchApp({ advisor })}/></div>
        <div className="field"><label htmlFor="ns">Next step shown to client</label><input id="ns" value={nextStep} onChange={e => setNextStep(e.target.value)} onBlur={() => nextStep !== app.nextStep && patchApp({ nextStep })}/></div>
      </div>
      <div className="note-row"><input aria-label="Update for the client" placeholder="Post an update to the client’s activity feed" value={note} onChange={e => setNote(e.target.value)}/><Button variant="dark" busy={busy} disabled={!note.trim()} onClick={() => patchApp({ note })}>Post update</Button></div>
    </section>
    <section className="admin-panel">
      <h2>Documents</h2>
      <ul className="doc-list">{documents.map((d: any) => <li key={d.id} className={`doc doc-${d.status}`}>
        <Icon name="file"/>
        <span className="doc-name"><strong>{d.name}</strong><small>{d.originalName || "Not uploaded"}{d.reviewNote ? ` · ${d.reviewNote}` : ""}</small></span>
        <span className={`status status-${d.status}`}>{d.status}</span>
        <span className="doc-actions">
          {d.originalName && <button onClick={() => openProtectedFile(`/portal/documents/${d.id}/file`).catch(e => setError(e.message))} aria-label="View file"><Icon name="eye" size={17}/></button>}
          {d.originalName && d.status !== "approved" && <button className="doc-upload" onClick={() => review(d.id, "approved")}>Approve</button>}
          {d.originalName && d.status !== "rejected" && <button className="doc-reject" onClick={() => review(d.id, "rejected")}>Request new copy</button>}
        </span>
      </li>)}</ul>
    </section>
    <section className="admin-panel activity"><h2>Activity</h2><ul>{activity.map((a: any) => <li key={a.id} className={`actor-${a.actor}`}><span/><p><strong>{a.title}</strong><small>{a.detail}</small></p><time>{timeAgo(a.createdAt)}</time></li>)}</ul></section>
  </>;
}
