import { ReactNode, useState, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { href } from "./lib/router";

const iconPaths: Record<string, ReactNode> = {
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
  arrow: <path d="M5 12h14M14 7l5 5-5 5"/>,
  chevron: <path d="M9 6l6 6-6 6"/>,
  down: <path d="M6 9l6 6 6-6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 7V5h8v2M3 12h18"/></>,
  home: <><path d="M3 11l9-8 9 8v9H3z"/><path d="M9 20v-6h6v6"/></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>,
  users: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20c0-4 2-7 6-7s6 3 6 7M15 14c4 0 6 2 6 6"/></>,
  book: <><path d="M4 4h6a3 3 0 013 3v13a3 3 0 00-3-3H4z"/><path d="M20 4h-4a3 3 0 00-3 3v13a3 3 0 013-3h4z"/></>,
  heart: <path d="M20 5c-2-2-5-2-8 1-3-3-6-3-8-1-3 3-1 8 8 15 9-7 11-12 8-15z"/>,
  shield: <><path d="M12 3l8 3v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/><path d="M9 12l2 2 4-5"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></>,
  tick: <path d="M5 12l5 5 9-10"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="M5 5l14 14M19 5L5 19"/>,
  phone: <path d="M7 3l3 5-2 2c2 4 4 6 7 7l2-2 4 3c-1 3-3 4-5 3C9 19 5 15 3 8c-1-2 1-4 4-5z"/>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></>,
  pin: <><path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h5"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
  logout: <><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/></>,
  alert: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  refuge: <><path d="M3 12a9 9 0 0118 0z"/><path d="M12 12v7a2 2 0 01-4 0"/><path d="M12 3v1"/></>,
  scale: <><path d="M12 3v18M5 21h14M4 7h16"/><path d="M4 7l-2.5 6a3 3 0 005 0L4 7zM20 7l-2.5 6a3 3 0 005 0L20 7z"/></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></>,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.5M12 17v-4a2 2 0 014 0v4M12 10v7"/></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5v.5"/></>,
  facebook: <path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>,
};

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>;
}

export function Img({ src, alt, className, eager }: { src: string; alt: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div role="img" aria-label={alt} className={`image-fallback ${className || ""}`}><Icon name="globe" size={48}/></div>;
  return <img src={src} alt={alt} className={className} loading={eager ? "eager" : "lazy"} decoding="async" {...(eager ? { fetchPriority: "high" as const } : {})} onError={() => setFailed(true)} />;
}

type BtnProps = { children: ReactNode; to?: string; onClick?: () => void; variant?: "primary" | "ghost" | "dark" | "quiet"; type?: "button" | "submit"; disabled?: boolean; busy?: boolean; className?: string };
export function Button({ children, to, onClick, variant = "primary", type = "button", disabled, busy, className = "" }: BtnProps) {
  const cls = `btn btn-${variant} ${busy ? "is-busy" : ""} ${className}`;
  if (to) return <a className={cls} href={href(to)}>{children}</a>;
  return <button type={type} onClick={onClick} className={cls} disabled={disabled || busy} aria-busy={busy || undefined}>{busy && <span className="spinner" aria-hidden="true"/>}{children}</button>;
}

export function Kicker({ children }: { children: ReactNode }) { return <p className="kicker">{children}</p>; }

export function Logo({ light = false }: { light?: boolean }) {
  return <a className={`logo ${light ? "logo-light" : ""}`} href={href("/")} aria-label="GlobalPath Immigration, home">
    <img className="logo-mark" src="/logo.png" alt="" width="48" height="48" decoding="async"/>
    <span className="logo-word"><strong>GlobalPath</strong><small>Immigration</small></span>
  </a>;
}

type FieldBase = { label: string; error?: string; hint?: string; name: string };
export function Input({ label, error, hint, name, ...rest }: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${name}`;
  return <div className={`field ${error ? "has-error" : ""}`}>
    <label htmlFor={id}>{label}</label>
    <input id={id} name={name} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...rest}/>
    {hint && !error && <small id={`${id}-hint`} className="hint">{hint}</small>}
    {error && <small id={`${id}-err`} className="error-text">{error}</small>}
  </div>;
}
export function Select({ label, error, name, children, ...rest }: FieldBase & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = `f-${name}`;
  return <div className={`field ${error ? "has-error" : ""}`}>
    <label htmlFor={id}>{label}</label>
    <div className="select-wrap"><select id={id} name={name} aria-invalid={!!error} {...rest}>{children}</select><Icon name="down" size={16}/></div>
    {error && <small className="error-text">{error}</small>}
  </div>;
}
export function Textarea({ label, error, name, ...rest }: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = `f-${name}`;
  return <div className={`field ${error ? "has-error" : ""}`}>
    <label htmlFor={id}>{label}</label>
    <textarea id={id} name={name} aria-invalid={!!error} {...rest}/>
    {error && <small className="error-text">{error}</small>}
  </div>;
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" | "success" }) {
  return <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}><Icon name={tone === "success" ? "check" : "alert"} size={18}/><div>{children}</div></div>;
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00+02:00`) : new Date(iso);
  return d.toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg", ...opts });
}
export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return formatDate(iso);
}
