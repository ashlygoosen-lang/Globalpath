import { useState } from "react";
import { Icon, Button, Kicker } from "../ui";
import { PageHero, CTA } from "../layout";
import { fees, rand } from "../lib/content";
import { href } from "../lib/router";

/* Eligibility check based on the Refugees Act 130 of 1998:
   section 3 (who qualifies) and the exclusions in section 4(1) that still apply after
   Scalabrini Centre v Minister of Home Affairs [2026] ZACC 30 (7 July 2026), which struck down
   sections 4(1)(f), (h), (i) and 21(1B). Answers stay in the browser; nothing is sent or stored. */

type Answers = Partial<Record<"reason" | "outside" | "protection" | "elsewhere" | "crime" | "fugitive", string>>;
type Outcome = { level: "likely" | "review" | "unlikely" | "notyet"; title: string; points: string[]; alternatives?: { label: string; to: string }[] };

const QUESTIONS: { id: keyof Answers; q: string; help?: string; options: { v: string; label: string }[] }[] = [
  { id: "reason", q: "What is the main reason you left your country or cannot go back?", options: [
    { v: "persecution", label: "I fear persecution because of my race, tribe, religion, nationality, political opinion, gender, sexual orientation or another group I belong to" },
    { v: "disorder", label: "I fled war, foreign occupation or serious violence and disorder in my country" },
    { v: "dependant", label: "My spouse or parent has refugee status or is an asylum seeker in South Africa" },
    { v: "economic", label: "I am looking for work, a business opportunity or a better income" },
    { v: "study", label: "I want to study in South Africa" },
    { v: "family", label: "I want to live with family who are South African citizens or permanent residents" },
    { v: "other", label: "Another reason" },
  ] },
  { id: "outside", q: "Are you outside your country of nationality now?", help: "If you are stateless, the country where you used to live.", options: [{ v: "yes", label: "Yes" }, { v: "no", label: "No" }] },
  { id: "protection", q: "If you went back, could your own government protect you?", options: [
    { v: "source", label: "No, the government or its officials are the source of the danger" },
    { v: "unable", label: "No, the government cannot or will not protect me" },
    { v: "safe", label: "Yes, I could go back and be safe" },
    { v: "unsure", label: "I am not sure" },
  ] },
  { id: "elsewhere", q: "Do you have citizenship, permanent residence or refugee status in another country where you would be safe?", options: [{ v: "no", label: "No" }, { v: "yes", label: "Yes" }] },
  { id: "crime", q: "Have you committed, or been accused of, a war crime, crime against humanity, terrorism, torture or another serious crime?", options: [{ v: "no", label: "No" }, { v: "yes", label: "Yes" }, { v: "discuss", label: "I would rather discuss this privately" }] },
  { id: "fugitive", q: "Are you wanted by the police or courts in another country?", options: [{ v: "no", label: "No" }, { v: "yes", label: "Yes" }] },
];

function assess(a: Answers): Outcome {
  const alt: Record<string, { label: string; to: string }[]> = {
    economic: [{ label: "Work visas", to: "/visa/critical-skills-work-visa" }, { label: "Business visa", to: "/visa/business-visa" }],
    study: [{ label: "Study visa", to: "/visa/study-visa" }],
    family: [{ label: "Spousal or life partner visa", to: "/visa/spousal-life-partner-visa" }, { label: "Relative's visa", to: "/visa/relatives-visa" }],
    other: [{ label: "Find the right visa", to: "/services#finder" }],
  };
  if (a.reason && ["economic", "study", "family", "other"].includes(a.reason)) {
    return { level: "unlikely", title: "Asylum is unlikely to be the right route for you", alternatives: alt[a.reason], points: [
      "Refugee status is for people who fear persecution, or who fled war or serious public disorder. Looking for work, study or family life are not grounds for asylum.",
      "An asylum claim that does not meet the legal test will be refused. Applying anyway puts you at risk and adds to the delays for people in danger.",
      "There are visas designed for your situation. A consultation can confirm which one fits.",
    ] };
  }
  if (a.outside === "no") return { level: "notyet", title: "You can only apply for asylum once you are outside your own country", points: [
    "South African refugee law protects people who are outside their country of nationality. You cannot apply for asylum in South Africa from your home country.",
    "If you are in danger now, contact UNHCR or a humanitarian organisation in the country where you are.",
  ] };
  if (a.protection === "safe") return { level: "unlikely", title: "Asylum is unlikely if you could safely go back", alternatives: alt.other, points: [
    "Refugee protection is for people who cannot return safely and cannot get protection from their own government.",
    "If your circumstances change, or there is more to your situation, a confidential consultation can help.",
  ] };
  if (a.elsewhere === "yes") return { level: "unlikely", title: "You may be excluded because another country protects you", points: [
    "Section 4(1)(d) of the Refugees Act excludes people who already enjoy the protection of another country as a citizen, resident or recognised refugee.",
    "There can be exceptions, for example if that protection is no longer real. Discuss this in a consultation before applying.",
  ] };
  if (a.crime === "yes" || a.fugitive === "yes" || a.crime === "discuss") return { level: "review", title: "Your situation needs a confidential review before you apply", points: [
    "Section 4(1) of the Refugees Act excludes people who have committed certain serious crimes, terrorism-related offences, or who are fugitives from justice.",
    "Whether an exclusion applies depends on the facts. Being accused is not the same as having committed a crime.",
    "Book a confidential consultation. Do not apply until you have had advice.",
  ] };
  if (a.protection === "unsure") return { level: "review", title: "You may qualify. Let's look at your situation together", points: [
    "Your reason for leaving can be a ground for refugee status, but whether your government could protect you is an important part of the legal test.",
    "A consultation lets us look at the facts and country information before you apply.",
  ] };
  return { level: "likely", title: "You may qualify for refugee protection", points: [
    a.reason === "dependant" ? "Spouses and dependants of refugees can qualify under section 3(c) of the Refugees Act." :
    a.reason === "disorder" ? "People who fled external aggression, occupation or events seriously disturbing public order can qualify under section 3(b) of the Refugees Act." :
    "A well-founded fear of persecution for these reasons is a ground for refugee status under section 3(a) of the Refugees Act.",
    "Only a Refugee Status Determination Officer at Home Affairs can decide your claim. This check is an indication, not a decision.",
    "Apply in person at a Refugee Reception Office as soon as possible, and tell the truth at every step.",
  ] };
}

function Checker() {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Outcome | null>(null);
  const q = QUESTIONS[step];
  const choose = (v: string) => {
    const next = { ...answers, [q.id]: v };
    setAnswers(next);
    // Stop early when an answer already decides the outcome
    const early = (q.id === "reason" && ["economic", "study", "family", "other"].includes(v)) || (q.id === "outside" && v === "no") || (q.id === "protection" && v === "safe") || (q.id === "elsewhere" && v === "yes");
    if (early || step === QUESTIONS.length - 1) setResult(assess(next));
    else setStep(step + 1);
  };
  const reset = () => { setAnswers({}); setStep(0); setResult(null); };

  if (result) {
    const icon = result.level === "likely" ? "check" : result.level === "review" ? "alert" : "close";
    return <div className={`asy-result asy-${result.level}`} role="status">
      <div className="asy-result-head"><span className="asy-badge"><Icon name={icon} size={22}/></span><h3>{result.title}</h3></div>
      <ul>{result.points.map(p => <li key={p}>{p}</li>)}</ul>
      {result.level === "likely" && <div className="asy-offer">
        <div><strong>We can help with your application for {rand(fees.asylum)}</strong><span>After a {rand(fees.consultation)} consultation confirms you may qualify. Home Affairs does not charge to apply for asylum.</span></div>
        <Button to="/book?service=Asylum%20%26%20Refugee%20Protection">Book a consultation</Button>
      </div>}
      {result.level === "review" && <div className="asy-offer"><div><strong>Confidential consultation, {rand(fees.consultation)}</strong><span>We review the facts with you before anything is submitted to Home Affairs.</span></div><Button to="/book?service=Asylum%20%26%20Refugee%20Protection">Book a consultation</Button></div>}
      {result.alternatives && <div className="asy-alts"><span>Routes that may suit you:</span>{result.alternatives.map(a => <a key={a.to} className="link" href={href(a.to)}>{a.label}<Icon name="arrow" size={15}/></a>)}</div>}
      <button className="inline asy-restart" onClick={reset}>Start the check again</button>
    </div>;
  }

  return <div className="asy-check">
    <div className="asy-progress" aria-hidden="true">{QUESTIONS.map((_, i) => <i key={i} className={i < step ? "done" : i === step ? "on" : ""}/>)}</div>
    <p className="asy-count">Question {step + 1} of {QUESTIONS.length}</p>
    <fieldset>
      <legend>{q.q}</legend>
      {q.help && <p className="muted small">{q.help}</p>}
      <div className="asy-options">{q.options.map(o => <button key={o.v} type="button" className={answers[q.id] === o.v ? "is-on" : ""} onClick={() => choose(o.v)}>{o.label}</button>)}</div>
    </fieldset>
    <div className="asy-foot">
      {step > 0 ? <button className="back" onClick={() => setStep(step - 1)}>Back</button> : <span/>}
      <span className="muted small"><Icon name="lock" size={14}/> Your answers are not saved or sent anywhere.</span>
    </div>
  </div>;
}

export function AsylumPage() {
  return <>
    <PageHero kicker="Asylum and refugee protection" title="Check if you qualify before you apply." text="Asylum protects people who fear persecution or have fled war. It is not a route to work or study. Our free eligibility check helps you understand where you stand before you go to Home Affairs."/>

    <section className="section wrap asy-top">
      <div className="asy-intro">
        <Kicker>Why checking first matters</Kicker>
        <h2>Applications from people who don't qualify hurt everyone</h2>
        <p className="lead">Many people apply for asylum when another visa would suit them better. Those applications are refused, and they take officials' time away from people who are in real danger.</p>
        <ul className="ticks">
          <li><Icon name="tick" size={16}/>Asylum claims are decided on the facts, against the legal test in the Refugees Act.</li>
          <li><Icon name="tick" size={16}/>A refused claim can leave you without lawful status, and false statements are a criminal offence.</li>
          <li><Icon name="tick" size={16}/>If you don't qualify, we'll point you to the visa that fits your situation.</li>
        </ul>
      </div>
      <div className="asy-card" id="check">
        <h2>Asylum eligibility check</h2>
        <p className="muted">Six questions, about two minutes. This is general guidance, not a legal decision.</p>
        <Checker/>
      </div>
    </section>

    <section className="section tint">
      <div className="wrap asy-cols">
        <div>
          <h3><Icon name="check" size={20}/>Who may qualify</h3>
          <ul className="asy-list">
            <li>People with a well-founded fear of persecution because of their race, gender, tribe, religion, nationality, political opinion or membership of a particular social group, who are outside their country and cannot or will not seek its protection.</li>
            <li>People who fled external aggression, occupation, foreign domination or events seriously disturbing public order in their country.</li>
            <li>The spouse and dependants of a person who qualifies.</li>
          </ul>
          <p className="small-print">Refugees Act 130 of 1998, section 3.</p>
        </div>
        <div>
          <h3><Icon name="close" size={20}/>Who does not qualify</h3>
          <ul className="asy-list">
            <li>People who came to South Africa for work, business, study or a better life. Use a visa instead.</li>
            <li>People who could return safely and get protection from their own government.</li>
            <li>People who already have citizenship, residence or refugee status in another country that protects them.</li>
            <li>People who have committed war crimes, crimes against humanity, terrorism-related or other serious crimes, or who are fugitives from justice.</li>
          </ul>
          <p className="small-print">Refugees Act, section 4(1). Exclusions are decided on the facts of each case.</p>
        </div>
      </div>
    </section>

    <section className="section wrap asy-process">
      <div className="head-split"><div><Kicker>The process</Kicker><h2>How an asylum application works</h2></div><p>Applications are made in person. Home Affairs does not charge a fee to apply for asylum.</p></div>
      <ol className="steps asy-steps">
        <li><span>1</span><div><strong>Report to a Refugee Reception Office</strong>Cape Town, Durban, Desmond Tutu (Pretoria), Musina or Gqeberha. Go as soon as possible after you arrive.</div></li>
        <li><span>2</span><div><strong>Lodge your application</strong>Complete the application, give your fingerprints and photograph, and explain why you need protection.</div></li>
        <li><span>3</span><div><strong>Receive an asylum seeker permit</strong>A section 22 permit lets you stay lawfully, and in most cases work and study, while your claim is decided. Renew it before it expires.</div></li>
        <li><span>4</span><div><strong>Interview and decision</strong>A Refugee Status Determination Officer interviews you and decides whether you are a refugee.</div></li>
        <li><span>5</span><div><strong>Appeal if refused</strong>Some refusals can be appealed to the Refugee Appeals Authority within strict time limits.</div></li>
      </ol>
      <aside className="note">
        <strong>What changed in 2026</strong>
        <p>On 7 July 2026 the Constitutional Court confirmed that people cannot be excluded from refugee status only because they entered South Africa outside a port of entry, reported late to a Refugee Reception Office, or had problems with travel documents. Their claims must be considered on the merits. Practice at Refugee Reception Offices has changed several times this year, so we confirm the current position with you before you go.</p>
      </aside>
    </section>

    <section className="section tint">
      <div className="wrap asy-fees">
        <div>
          <Kicker>Our fees</Kicker>
          <h2>Help with your asylum application</h2>
          <p>We only take on asylum cases where our assessment shows you may qualify. If you don't, we tell you honestly and explain your other options.</p>
          <div className="asy-price-row">
            <div><small>Consultation</small><strong>{rand(fees.consultation)}</strong><span>45 minutes, confidential</span></div>
            <div><small>Application assistance</small><strong>{rand(fees.asylum)}</strong><span>Only if you may qualify</span></div>
          </div>
        </div>
        <div className="asy-includes">
          <h3>What the {rand(fees.asylum)} assistance includes</h3>
          <ul className="ticks">{fees.asylumIncludes.map(i => <li key={i}><Icon name="tick" size={16}/>{i}</li>)}</ul>
          <Button to="/book?service=Asylum%20%26%20Refugee%20Protection">Book a consultation</Button>
        </div>
      </div>
    </section>

    <section className="section wrap">
      <div className="free-help">
        <Icon name="heart" size={26}/>
        <div>
          <h3>Free help is also available</h3>
          <p>You never have to pay to apply for asylum, and no one can buy you refugee status. UNHCR and its partner organisations offer free information and support. UNHCR helpline: <a className="inline" href="tel:0800100030">0800 100 030</a> (toll-free). If anyone asks you for money in exchange for an asylum permit or a decision, do not pay, and report it.</p>
        </div>
      </div>
      <p className="small-print asy-disclaimer">This page is general information about the Refugees Act 130 of 1998 as at November 2026 and is not legal advice. Only the Department of Home Affairs can decide an asylum claim.</p>
    </section>
    <CTA/>
  </>;
}
