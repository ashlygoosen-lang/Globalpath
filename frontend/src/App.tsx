import { ReactNode, useEffect, useRef } from "react";
import { useRoute } from "./lib/router";
import { Header, Footer } from "./layout";
import { Legal } from "./pages/legal";
import { legalDoc } from "./legal";
import { Home, About, ServicesPage, Corporate, Resources, ArticlePage, NotFound } from "./pages/marketing";
import { VisaPage } from "./pages/visa";
import { FeesPage } from "./pages/fees";
import { AsylumPage } from "./pages/asylum";
import { Contact, Booking } from "./pages/forms";
import { Portal, useSession } from "./pages/portal";
import { Admin } from "./pages/admin";
import { visaBySlug, articles, CONTACT } from "./lib/content";
import { Icon } from "./ui";
import { href } from "./lib/router";
import { pageChanged } from "./motion";

const TITLES: Record<string, string> = {
  "": "South African immigration consultancy",
  about: "About us", fees: "Fees", asylum: "Asylum eligibility check", services: "Immigration services", corporate: "Corporate immigration", resources: "Insights",
  contact: "Contact", book: "Book a consultation", portal: "Client portal", admin: "Admin", legal: "Legal",
};

export default function App() {
  const route = useRoute();
  const sessionApi = useSession();
  const mainRef = useRef<HTMLElement>(null);
  const [section, param] = route.parts;

  useEffect(() => {
    // Support in-page anchors like #/services#directory
    const anchor = location.hash.split("#")[2];
    if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }), 60);
    else window.scrollTo({ top: 0, behavior: "instant" });
    mainRef.current?.focus({ preventScroll: true });
    const sub = section === "visa" ? visaBySlug(param)?.title : section === "resources" && param ? articles.find(a => a.slug === param)?.title : section === "legal" ? (legalDoc(param) || legalDoc("privacy"))?.title : undefined;
    pageChanged();
    document.title = `${sub || TITLES[section || ""] || "GlobalPath"} | GlobalPath Immigration`;
  }, [route.path]);

  let page: ReactNode;
  switch (section) {
    case undefined: page = <Home/>; break;
    case "about": page = <About/>; break;
    case "services": page = <ServicesPage/>; break;
    case "service": // legacy route from the original prototype
    case "visa": page = <VisaPage slug={param}/>; break;
    case "corporate": page = <Corporate/>; break;
    case "fees": page = <FeesPage/>; break;
    case "asylum": page = <AsylumPage/>; break;
    case "resources": page = param ? <ArticlePage slug={param}/> : <Resources/>; break;
    case "contact": page = <Contact/>; break;
    case "book": page = <Booking key={route.query.toString()} query={route.query}/>; break;
    case "portal": page = <Portal sessionApi={sessionApi}/>; break;
    case "admin": page = <Admin sessionApi={sessionApi}/>; break;
    case "legal": page = <Legal slug={param}/>; break;
    default: page = <NotFound/>;
  }
  const appShell = section === "portal" || section === "admin";

  return <>
    <a className="skip" href="#main" onClick={e => { e.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
    <div className="route-progress" aria-hidden="true"/>
    <Header path={route.path}/>
    <main id="main" ref={mainRef} tabIndex={-1}><div className="page" key={route.path}>{page}</div></main>
    {!appShell && <Footer/>}
    {!appShell && section !== "book" && <nav className="mobile-bar" aria-label="Quick actions"><a className="mb-call" href={`tel:${CONTACT.phoneHref}`}><Icon name="phone" size={17}/>Call</a><a className="mb-book" href={href("/book")}>Book a consultation</a></nav>}
    {appShell && <p className="portal-foot wrap">© {new Date().getFullYear()} GlobalPath Immigration, a division of VINK Group (Pty) Ltd (Reg. 2018/079316/07). Your information is protected under POPIA.</p>}
  </>;
}
