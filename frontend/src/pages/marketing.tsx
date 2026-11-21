import heroImage from "../assets/globalpath-hero.webp";
import corporateImage from "../assets/globalpath-corporate.webp";
import { Icon, Img, Button, Kicker } from "../ui";
import { PageHero, CTA } from "../layout";
import { PathwayFinder, VisaDirectory } from "./visa";
import { services, serviceHref, articles, faqs, visas, fees, rand } from "../lib/content";
import { href } from "../lib/router";

const steps = [
  ["Initial consultation", "We listen to your goals and circumstances."],
  ["Immigration assessment", "We identify the strongest route and its risks."],
  ["Documentation", "We build and quality-check your evidence file."],
  ["Application", "We prepare and lodge your application with VFS."],
  ["Follow-up", "We track progress and respond to requests."],
  ["Ongoing support", "Renewals, dependants and permanent residence."],
];

const strengths = [
  ["users", "Advice built around you", "Recommendations shaped by your circumstances, goals and timeline, not a generic checklist."],
  ["shield", "Grounded in current rules", "We work from the latest regulations, directives and published departmental targets."],
  ["eye", "Clear about fees and risk", `A fixed ${rand(fees.application)} per application, and honest advice where a case has weaknesses.`],
  ["lock", "Confidential by default", "Personal records are handled under POPIA and shared only through your secure portal."],
];

export function Home() {
  return <>
    <section className="hero">
      <Img src={heroImage} alt="A GlobalPath advisor overlooking a city skyline at sunset" className="hero-image"/>
      <div className="hero-shade"/>
      <div className="wrap hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker">Immigration consultancy in Cape Town</p>
          <h1>Your global future starts with the right guidance.</h1>
          <p className="hero-sub">Professional immigration support for individuals, families, entrepreneurs and employers building a future in South Africa.</p>
          <div className="hero-actions">
            <Button to="/book">Book a consultation</Button>
            <Button to="/services" variant="ghost">Explore our services</Button>
          </div>
        </div>
      </div>
    </section>

    <section className="finder-section">
      <div className="wrap"><PathwayFinder compact/></div>
    </section>

    <section className="proof wrap" aria-label="At a glance">
      <div><strong>{visas.length}</strong><span>visa and permit categories we advise on</span></div>
      <div><strong>45 min</strong><span>first consultation, with a written summary</span></div>
      <div><strong>One advisor</strong><span>your single point of contact throughout</span></div>
      <div><strong>Worldwide</strong><span>consultations by video or in person in Cape Town</span></div>
    </section>

    <section className="section wrap intro">
      <div className="intro-media">
        <Img src={corporateImage} alt="GlobalPath advisors reviewing an immigration application" className="photo"/>
      </div>
      <div className="intro-copy">
        <Kicker>Who we are</Kicker>
        <h2>Immigration is more than an application.</h2>
        <p className="lead">It is about careers, families, business expansion and new beginnings. We treat it that way.</p>
        <p>GlobalPath Immigration provides structured, personal support to help clients navigate South African immigration requirements with confidence. Every matter is prepared with the rigour an adjudicator expects and the attention a life decision deserves.</p>
        <Button to="/about" variant="dark">About our approach</Button>
      </div>
    </section>

    <section className="section tint">
      <div className="wrap">
        <div className="head-split">
          <div><Kicker>Our expertise</Kicker><h2>Comprehensive immigration services</h2></div>
          <p>Temporary and permanent residence, corporate mobility and complex matters, each backed by a category-specific evidence plan.</p>
        </div>
        <ServiceIndex/>
      </div>
    </section>

    <section className="section wrap">
      <div className="head-split">
        <div><Kicker>Why GlobalPath</Kicker><h2>Professional guidance, and a clearer journey</h2></div>
      </div>
      <div className="strengths">{strengths.map(([icon, title, text]) => <div key={title}><Icon name={icon} size={26}/><h3>{title}</h3><p>{text}</p></div>)}</div>
    </section>

    <section className="section journey">
      <div className="wrap">
        <div className="head-split light"><div><Kicker>How we work</Kicker><h2>Your immigration journey, in six steps</h2></div><p>A defined process with clear communication at every stage. Clients can follow each step in the secure portal.</p></div>
        <ol className="timeline">{steps.map(([t, d], i) => <li key={t}><span className="t-num">{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}</ol>
      </div>
    </section>

    <section className="section wrap fee-band" aria-labelledby="fee-band-title">
      <div className="fee-band-copy">
        <Kicker>Fees</Kicker>
        <h2 id="fee-band-title">Fixed fees, published upfront.</h2>
        <p>The same professional fee for every visa category. Government and VFS charges are shown separately on every visa page, so you know the full cost before you commit.</p>
        <a className="link" href={href("/fees")}>See fees and cost estimates<Icon name="arrow" size={15}/></a>
      </div>
      <div className="fee-band-prices">
        <a href={href("/fees#applications")}><span>Visa or permit application</span><strong>{rand(fees.application)}</strong><small>per application, assessment to outcome</small></a>
        <a href={href("/fees#appeals")}><span>Appeal or review</span><strong>{rand(fees.appeal)}</strong><small>per appeal after a rejection</small></a>
      </div>
    </section>

    <section className="section wrap corp">
      <div className="corp-copy">
        <Kicker>Corporate immigration</Kicker>
        <h2>Immigration support for businesses and global talent.</h2>
        <p>We help HR and mobility teams bring international employees to South Africa and keep every record compliant.</p>
        <ul className="ticks"><li><Icon name="tick" size={16}/>Corporate visa and work authorisation strategy</li><li><Icon name="tick" size={16}/>International employee onboarding and dependants</li><li><Icon name="tick" size={16}/>Ongoing compliance reviews and expiry tracking</li></ul>
        <Button to="/corporate" variant="dark">Corporate services</Button>
      </div>
      <Img src={corporateImage} alt="Corporate immigration advisors in a boardroom" className="photo corp-photo"/>
    </section>

    <section className="section tint">
      <div className="wrap">
        <div className="head-split"><div><Kicker>Insights</Kicker><h2>Informed decisions start with clear information</h2></div><a className="link" href={href("/resources")}>All insights<Icon name="arrow" size={15}/></a></div>
        <ArticleGrid items={articles.slice(0, 3)}/>
      </div>
    </section>
    <CTA/>
  </>;
}

export function ServiceIndex() {
  return <ul className="service-index">
    {services.map(s => <li key={s.slug}>
      <a href={href(serviceHref(s))}>
        <span className="si-icon"><Icon name={s.icon} size={22}/></span>
        <span className="si-text"><strong>{s.title}</strong><span>{s.blurb}</span></span>
        <Icon name="arrow" size={18} className="si-arrow"/>
      </a>
    </li>)}
  </ul>;
}

function ArticleGrid({ items }: { items: typeof articles }) {
  return <div className="article-grid">{items.map(a => <a key={a.slug} className="article-card" href={href(`/resources/${a.slug}`)}>
    <span className="tag">{a.tag}</span><h3>{a.title}</h3><p>{a.summary}</p><small>{a.minutes} min read</small>
  </a>)}</div>;
}

export function About() {
  return <>
    <PageHero kicker="About GlobalPath" title="Expertise with a distinctly human perspective." text="We help people and businesses make important immigration decisions with clarity, discretion and care."/>
    <section className="section wrap intro">
      <div className="intro-copy">
        <Kicker>Our purpose</Kicker>
        <h2>A clear path forward, built around you.</h2>
        <p className="lead">GlobalPath was established to bring structure, transparency and personal attention to South African immigration.</p>
        <p>Our work begins by listening. We seek to understand the full context behind every application, because the strongest strategies are considered, accurate and aligned to each client’s future.</p>
        <blockquote>Your journey deserves more than a checklist. It deserves experienced guidance and genuine care.</blockquote>
      </div>
      <div className="intro-media"><Img src={corporateImage} alt="GlobalPath's advisory team" className="photo"/></div>
    </section>
    <section className="section tint">
      <div className="wrap">
        <div className="head-split"><div><Kicker>What we believe</Kicker><h2>Principles that shape every matter</h2></div></div>
        <div className="strengths">{strengths.map(([icon, title, text]) => <div key={title}><Icon name={icon} size={26}/><h3>{title}</h3><p>{text}</p></div>)}</div>
      </div>
    </section>
    <section className="section wrap values">
      <div><h3>Who we work with</h3><p>Skilled professionals and their families, international students, retirees, founders and investors, and employers relocating talent to South Africa.</p></div>
      <div><h3>Where we work</h3><p>From our Cape Town office and by video with clients worldwide. Applications are lodged through VFS Global centres in South Africa or the relevant mission abroad.</p></div>
      <div><h3>How we charge</h3><p>A fixed {rand(fees.application)} per application and {rand(fees.appeal)} per appeal, kept separate from government and VFS charges so you always know what you are paying for. <a className="inline" href={href("/fees")}>See all fees</a>.</p></div>
    </section>
    <CTA/>
  </>;
}

export function ServicesPage() {
  return <>
    <PageHero kicker="Immigration services" title="Professional solutions for every direction." text="From individual applications to international workforce strategy, our services make complex requirements clear."/>
    <section className="section tint" id="finder"><div className="wrap"><PathwayFinder/></div></section>
    <section className="section wrap">
      <div className="head-split"><div><Kicker>Services</Kicker><h2>How we can help</h2></div></div>
      <ServiceIndex/>
    </section>
    <section className="section tint">
      <div className="wrap">
        <div className="head-split"><div><Kicker>Visa directory</Kicker><h2>Every category, with official targets and fees</h2></div><p>Select any visa or permit for its requirements and document checklist.</p></div>
        <VisaDirectory/>
      </div>
    </section>
    <CTA/>
  </>;
}

export function Corporate() {
  const phases = [["Plan", "Workforce planning and visa category assessment for each role, before you recruit."], ["Mobilise", "Coordinated employee and dependant applications, with regular updates to HR."], ["Comply", "Right-to-work records, expiry tracking and annual programme reviews."]];
  return <>
    <PageHero kicker="Corporate immigration" title="Global talent. Local compliance. One trusted partner." text="Strategic immigration support for organisations employing and relocating international professionals in South Africa."/>
    <section className="section wrap intro">
      <div className="intro-media"><Img src={corporateImage} alt="Executives discussing corporate immigration strategy" className="photo"/></div>
      <div className="intro-copy">
        <Kicker>For employers</Kicker>
        <h2>Mobility programmes built for business.</h2>
        <p className="lead">We align immigration requirements with workforce priorities, so HR and mobility teams can manage risk without losing momentum.</p>
        <ul className="ticks"><li><Icon name="tick" size={16}/>Corporate and individual work visa strategy</li><li><Icon name="tick" size={16}/>Employee eligibility and document coordination</li><li><Icon name="tick" size={16}/>Right-to-work and immigration compliance reviews</li><li><Icon name="tick" size={16}/>Executive, dependant and family relocation support</li></ul>
        <Button to="/book?service=Immigration%20Compliance%20%26%20Advisory" variant="dark">Arrange a corporate consultation</Button>
      </div>
    </section>
    <section className="section tint">
      <div className="wrap">
        <div className="head-split"><div><Kicker>Built around your organisation</Kicker><h2>Support at every stage of mobility</h2></div></div>
        <ol className="phases">{phases.map(([t, d], i) => <li key={t}><span>{i + 1}</span><h3>{t}</h3><p>{d}</p></li>)}</ol>
      </div>
    </section>
    <section className="section wrap">
      <div className="head-split"><div><Kicker>Work routes</Kicker><h2>Categories employers use most</h2></div></div>
      <div className="mini-visas">{visas.filter(v => v.purposes.includes("work")).map(v => <a key={v.slug} href={href(`/visa/${v.slug}`)}><strong>{v.title}</strong><span>{v.section}</span><small>Target {v.turnaround}</small></a>)}</div>
    </section>
    <CTA/>
  </>;
}

export function Resources() {
  const featured = articles.find(a => a.featured) || articles[0];
  return <>
    <PageHero kicker="Insights" title="Informed decisions begin with clear information." text="Practical perspectives on South African immigration for individuals, families and international employers."/>
    <section className="section wrap">
      <a className="feature-article" href={href(`/resources/${featured.slug}`)}>
        <div><span className="tag">{featured.tag}</span><h2>{featured.title}</h2><p>{featured.summary}</p><span className="link">Read the guide<Icon name="arrow" size={15}/></span></div>
        <div className="feature-graphic" aria-hidden="true"><Icon name="file" size={52}/><span>{featured.minutes} min read</span></div>
      </a>
      <ArticleGrid items={articles.filter(a => a !== featured)}/>
    </section>
    <section className="section tint" id="faq">
      <div className="wrap faq">
        <div><Kicker>Common questions</Kicker><h2>Immigration FAQs</h2><p>Can’t find your answer? <a className="inline" href={href("/contact")}>Send us a question</a>.</p></div>
        <div>{faqs.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
      </div>
    </section>
    <CTA/>
  </>;
}

export function ArticlePage({ slug }: { slug?: string }) {
  const a = articles.find(x => x.slug === slug);
  if (!a) return <NotFound/>;
  const others = articles.filter(x => x.slug !== a.slug).slice(0, 3);
  return <>
    <PageHero kicker={a.tag} title={a.title} text={a.summary}/>
    <section className="section wrap reader">
      <article className="prose">
        {a.body.map(s => <div key={s.h}><h2>{s.h}</h2><p>{s.p}</p></div>)}
        <aside className="note"><strong>General information only</strong><p>This article is a general overview, not legal advice. Requirements change and depend on your circumstances; book a consultation for advice on your matter.</p></aside>
        <div className="reader-actions"><Button to="/book">Book a consultation</Button><a className="link" href={href("/resources")}>Back to insights<Icon name="arrow" size={15}/></a></div>
      </article>
      <aside className="sidebar"><div className="side-related"><h3>More insights</h3>{others.map(o => <a key={o.slug} href={href(`/resources/${o.slug}`)}><span>{o.title}</span><small>{o.minutes} min</small></a>)}</div></aside>
    </section>
  </>;
}

const LEGAL: Record<string, { title: string; body: [string, string][] }> = {
  privacy: { title: "Privacy & POPIA notice", body: [
    ["What we collect", "Contact details, immigration history, identity and supporting documents you choose to share with us, and records of our communications."],
    ["Why we collect it", "To assess your options, prepare and lodge applications on your instruction, and meet our legal and professional obligations."],
    ["How we protect it", "Documents are stored in access-controlled systems and shared through the client portal rather than email wherever possible. Only staff working on your matter can view them."],
    ["Your rights", "Under the Protection of Personal Information Act you may request access to, correction of, or deletion of your personal information. Contact hello@globalpath.co.za."],
  ] },
  terms: { title: "Terms of use", body: [
    ["Use of this website", "This website provides general information about South African immigration. Using it does not create a client relationship."],
    ["Engagement", "Professional services begin only once a written engagement letter and fee confirmation have been accepted."],
    ["Accuracy", "We update content regularly, but government requirements, tariffs and timeframes can change without notice."],
  ] },
  disclaimer: { title: "Legal disclaimer", body: [
    ["General information", "Content on this website does not constitute legal advice and should not be relied on for any specific matter."],
    ["No guaranteed outcomes", "Immigration decisions are made by the Department of Home Affairs and other authorities. No consultant can guarantee an outcome or a processing time."],
  ] },
};

export function Legal({ slug }: { slug?: string }) {
  const doc = LEGAL[slug || ""] || LEGAL.privacy;
  return <>
    <PageHero kicker="Legal" title={doc.title} text="Last reviewed November 2026."/>
    <section className="section wrap reader"><article className="prose">{doc.body.map(([h, p]) => <div key={h}><h2>{h}</h2><p>{p}</p></div>)}</article></section>
  </>;
}

export function NotFound() {
  return <section className="section wrap notfound">
    <Kicker>Page not found</Kicker>
    <h1>We couldn’t find that page.</h1>
    <p>The link may be out of date. Start from our services, or tell us what you’re looking for.</p>
    <div className="hero-actions"><Button to="/services">Browse services</Button><Button to="/contact" variant="quiet">Contact us</Button></div>
  </section>;
}
