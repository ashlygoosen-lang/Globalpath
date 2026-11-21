import { ReactNode, useEffect, useRef } from "react";
import { useRoute } from "./lib/router";
import { Header, Footer } from "./layout";
import { Home, About, ServicesPage, Corporate, Resources, ArticlePage, Legal, NotFound } from "./pages/marketing";
import { VisaPage } from "./pages/visa";
import { Contact, Booking } from "./pages/forms";
import { Portal, useSession } from "./pages/portal";
import { Admin } from "./pages/admin";
import { visaBySlug, articles } from "./lib/content";

const TITLES: Record<string, string> = {
  "": "South African immigration consultancy",
  about: "About us", services: "Immigration services", corporate: "Corporate immigration", resources: "Insights",
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
    else window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
    const sub = section === "visa" ? visaBySlug(param)?.title : section === "resources" && param ? articles.find(a => a.slug === param)?.title : undefined;
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
    <Header path={route.path}/>
    <main id="main" ref={mainRef} tabIndex={-1}>{page}</main>
    {!appShell && <Footer/>}
    {appShell && <p className="portal-foot wrap">© {new Date().getFullYear()} GlobalPath Immigration · Your information is protected under POPIA.</p>}
  </>;
}
