import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Icon, Logo, Button, Kicker } from "./ui";
import { services, serviceHref, CONTACT } from "./lib/content";
import { href } from "./lib/router";
import { api } from "./lib/api";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services", menu: true },
  { to: "/corporate", label: "Corporate" },
  { to: "/resources", label: "Insights" },
  { to: "/contact", label: "Contact" },
];

export function Header({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); setMenu(false); }, [path]);
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 40);
    const onDoc = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); setOpen(false); } };
    addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { removeEventListener("scroll", onScroll); document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to) || (to === "/services" && path.startsWith("/visa")));

  return <>
    <div className="utility-bar">
      <div className="wrap utility-inner">
        <span><Icon name="pin" size={14}/>{CONTACT.address.replace(", South Africa", "")}</span>
        <span className="hide-sm"><Icon name="clock" size={14}/>{CONTACT.hours}</span>
        <span className="utility-push"/>
        <a href={`tel:${CONTACT.phoneHref}`}><Icon name="phone" size={14}/>{CONTACT.phone}</a>
        <a className="hide-sm" href={`mailto:${CONTACT.email}`}><Icon name="mail" size={14}/>{CONTACT.email}</a>
        <a className="utility-portal" href={href("/portal")}><Icon name="lock" size={14}/>Client portal</a>
      </div>
    </div>
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="wrap header-inner">
        <Logo/>
        <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Main">
          {NAV.map(item => item.menu
            ? <div key={item.to} className="nav-menu" ref={menuRef}>
                <button className={isActive(item.to) ? "is-active" : ""} aria-expanded={menu} aria-controls="services-menu" onClick={() => setMenu(!menu)}>
                  {item.label}<Icon name="down" size={14}/>
                </button>
                {menu && <div className="mega" id="services-menu">
                  <div className="mega-lead">
                    <p className="mega-title">Immigration services</p>
                    <p>Temporary and permanent residence, business immigration and complex matters.</p>
                    <a className="link" href={href("/services")}>All services and visa types<Icon name="arrow" size={15}/></a>
                  </div>
                  <ul>{services.map(s => <li key={s.slug}><a href={href(serviceHref(s))}><Icon name={s.icon} size={18}/><span>{s.title}</span></a></li>)}</ul>
                </div>}
              </div>
            : <a key={item.to} href={href(item.to)} className={isActive(item.to) ? "is-active" : ""} aria-current={isActive(item.to) ? "page" : undefined}>{item.label}</a>)}
          <a className="nav-mobile-only" href={href("/portal")}>Client portal</a>
          <Button to="/book" className="nav-mobile-only">Book a consultation</Button>
        </nav>
        <Button to="/book" className="header-cta">Book a consultation</Button>
        <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}><Icon name={open ? "close" : "menu"} size={24}/></button>
      </div>
    </header>
  </>;
}

export function PageHero({ kicker, title, text, children }: { kicker: string; title: string; text: string; children?: ReactNode }) {
  return <section className="page-hero">
    <svg className="contour" viewBox="0 0 600 400" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M-20 ${330 - i * 32} C 140 ${260 - i * 30}, 300 ${380 - i * 34}, 620 ${250 - i * 30}`}/>)}</svg>
    <div className="wrap page-hero-inner">
      <Kicker>{kicker}</Kicker>
      <h1>{title}</h1>
      <p>{text}</p>
      {children}
    </div>
  </section>;
}

export function CTA() {
  return <section className="cta">
    <div className="wrap cta-inner">
      <div>
        <h2>Your next chapter begins with a conversation.</h2>
        <p>Whether you plan to work, study, invest, retire or reunite with family in South Africa, a 45-minute consultation will set out your options and next steps in writing.</p>
      </div>
      <div className="cta-actions">
        <Button to="/book">Book a consultation</Button>
        <a className="cta-phone" href={`tel:${CONTACT.phoneHref}`}><Icon name="phone" size={16}/>Or call {CONTACT.phone}</a>
      </div>
    </div>
  </section>;
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    try { await api("/newsletter", { body: { email }, auth: false }); setState("done"); }
    catch (err: any) { setMsg(err.message); setState("error"); }
  };
  if (state === "done") return <p className="newsletter-done"><Icon name="check" size={18}/>Subscribed. Look out for our next briefing.</p>;
  return <form className="newsletter" onSubmit={submit}>
    <label htmlFor="nl-email">Immigration updates, once a month</label>
    <div><input id="nl-email" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}/><button type="submit" disabled={state === "busy"}>Subscribe</button></div>
    {state === "error" && <small className="error-text">{msg}</small>}
  </form>;
}

export function Footer() {
  return <footer className="site-footer">
    <div className="wrap footer-top">
      <div className="footer-brand">
        <Logo light/>
        <p>Your journey. Our guidance. Your global future.</p>
        <Newsletter/>
      </div>
      <div className="footer-cols">
        <div><h3>Company</h3><a href={href("/about")}>About us</a><a href={href("/corporate")}>Corporate immigration</a><a href={href("/contact")}>Contact</a><a href={href("/book")}>Book a consultation</a></div>
        <div><h3>Services</h3>{services.slice(0, 6).map(s => <a key={s.slug} href={href(serviceHref(s))}>{s.title}</a>)}</div>
        <div><h3>Resources</h3><a href={href("/resources")}>Insights</a><a href={href("/resources#faq")}>FAQs</a><a href={href("/services#directory")}>Visa directory</a><a href={href("/portal")}>Client portal</a></div>
        <div><h3>Visit or call</h3><p>{CONTACT.address}</p><p><a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phone}</a></p><p><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></p><p>{CONTACT.hours}</p>
          <div className="socials"><a href="#" aria-label="GlobalPath on LinkedIn"><Icon name="linkedin" size={18}/></a><a href="#" aria-label="GlobalPath on Instagram"><Icon name="instagram" size={18}/></a><a href="#" aria-label="GlobalPath on Facebook"><Icon name="facebook" size={18}/></a></div>
        </div>
      </div>
    </div>
    <div className="wrap footer-bottom">
      <p>© {new Date().getFullYear()} GlobalPath Immigration. All rights reserved.</p>
      <nav aria-label="Legal"><a href={href("/legal/privacy")}>Privacy & POPIA</a><a href={href("/legal/terms")}>Terms</a><a href={href("/legal/disclaimer")}>Legal disclaimer</a></nav>
    </div>
    <p className="wrap disclaimer">Information on this website is general in nature and does not constitute legal advice or guarantee an immigration outcome. Decisions remain with the relevant government authorities.</p>
  </footer>;
}
