import { useMemo, useState } from "react";
import { Icon, Button, Kicker } from "../ui";
import { PageHero, CTA } from "../layout";
import { fees, visas, rand, costFor, visaBySlug } from "../lib/content";
import { href } from "../lib/router";

/** Plain-language cost summary for one visa: what each part is and who it's paid to. */
export function CostBreakdown({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const visa = visaBySlug(slug)!;
  const c = costFor(visa);
  return <div className={`cost ${compact ? "cost-compact" : ""}`}>
    <dl>
      <div><dt>GlobalPath professional fee<small>Paid to GlobalPath</small></dt><dd>{rand(c.professional)}</dd></div>
      <div><dt>Department of Home Affairs fee<small>Paid at submission</small></dt><dd>{c.dhaKnown ? visa.dhaFee : <span className="tbc">Confirmed at submission</span>}</dd></div>
      <div><dt>VFS Global service fee<small>Per applicant, paid at submission</small></dt><dd>{rand(c.vfs)}</dd></div>
    </dl>
    <div className="cost-total"><span>Estimated total{!c.dhaKnown && <small>plus the DHA fee</small>}</span><strong>{rand(c.total)}</strong></div>
  </div>;
}

export function FeesPage() {
  const [slug, setSlug] = useState("critical-skills-work-visa");
  const rows = useMemo(() => visas.map(v => ({ v, ...costFor(v) })), []);

  return <>
    <PageHero kicker="Fees" title="One fixed fee. No surprises." text="Our professional fees are the same for every visa category. Government and VFS charges are listed separately, so you can see exactly what you are paying for."/>

    <section className="section wrap">
      <div className="consult-strip">
        <div><Icon name="calendar" size={24}/><span><strong>Consultation: {rand(fees.consultation)}</strong> for every service. 45 minutes with an advisor, in person in Cape Town or by video, with a written summary of your options.</span></div>
        <Button to="/book" variant="dark">Book a consultation</Button>
      </div>
      <div className="price-grid">
        <article className="price price-main" id="applications">
          <div className="price-head">
            <Icon name="file" size={26}/>
            <h2>Visa or permit application</h2>
            <p>Full preparation and submission of one application, from assessment to outcome.</p>
          </div>
          <p className="price-amount"><strong>{rand(fees.application)}</strong><span>per application</span></p>
          <ul>{fees.applicationIncludes.map(i => <li key={i}><Icon name="tick" size={16}/>{i}</li>)}</ul>
          <Button to="/book">Book a consultation</Button>
        </article>
        <article className="price" id="appeals">
          <div className="price-head">
            <Icon name="scale" size={26}/>
            <h2>Appeal or review</h2>
            <p>When an application has been rejected and you want the decision reconsidered.</p>
          </div>
          <p className="price-amount"><strong>{rand(fees.appeal)}</strong><span>per appeal</span></p>
          <ul>{fees.appealIncludes.map(i => <li key={i}><Icon name="tick" size={16}/>{i}</li>)}</ul>
          <Button to="/book?service=Appeals%20%26%20Reviews" variant="dark">Get help with an appeal</Button>
        </article>
        <article className="price" id="asylum">
          <div className="price-head">
            <Icon name="refuge" size={26}/>
            <h2>Asylum application</h2>
            <p>Only for people our assessment shows may qualify for refugee protection.</p>
          </div>
          <p className="price-amount"><strong>{rand(fees.asylum)}</strong><span>if you may qualify</span></p>
          <ul>{fees.asylumIncludes.slice(0, 4).map(i => <li key={i}><Icon name="tick" size={16}/>{i}</li>)}</ul>
          <Button to="/asylum" variant="quiet">Check eligibility first</Button>
        </article>
        <aside className="price-side">
          <h3>Paid separately at submission</h3>
          <div className="ps-item"><div className="price-line"><span>VFS Global service fee</span><strong>{rand(fees.vfs)}</strong></div>
          <p>Charged by VFS Global per applicant for lodging the application and capturing biometrics.</p></div>
          <div className="ps-item"><div className="price-line"><span>Department of Home Affairs fee</span><strong>R0–R2,870</strong></div>
          <p>Depends on the visa category. Some categories are exempt. See the table below.</p></div>
          <p className="small-print">Appeals usually carry no new VFS or DHA fee, but we confirm this for your case. Home Affairs does not charge a fee to apply for asylum.</p>
        </aside>
      </div>
    </section>

    <section className="section tint">
      <div className="wrap estimator">
        <div>
          <Kicker>Cost estimate</Kicker>
          <h2>What will my application cost?</h2>
          <p>Choose a visa or permit to see the full estimated cost of one application, including government and VFS charges.</p>
          <div className="field">
            <label htmlFor="est-visa">Visa or permit</label>
            <div className="select-wrap"><select id="est-visa" value={slug} onChange={e => setSlug(e.target.value)}>
              {["Temporary residence", "Permanent residence", "Waivers"].map(g => <optgroup key={g} label={g}>{visas.filter(v => v.group === g).map(v => <option key={v.slug} value={v.slug}>{v.title}</option>)}</optgroup>)}
            </select><Icon name="down" size={16}/></div>
          </div>
          <a className="link" href={href(`/visa/${slug}`)}>Requirements for this visa<Icon name="arrow" size={15}/></a>
        </div>
        <CostBreakdown slug={slug}/>
      </div>
    </section>

    <section className="section wrap">
      <div className="head-split"><div><Kicker>All categories</Kicker><h2>Estimated cost by visa type</h2></div><p>Per application, for one applicant. Government tariffs can change, so we confirm them before you pay.</p></div>
      <div className="table-wrap fee-table-wrap">
        <table className="fee-table">
          <thead><tr><th scope="col">Visa or permit</th><th scope="col">DHA fee</th><th scope="col">VFS fee</th><th scope="col">GlobalPath fee</th><th scope="col">Estimated total</th></tr></thead>
          <tbody>{rows.map(({ v, dha, total }) => <tr key={v.slug}>
            <th scope="row"><a href={href(`/visa/${v.slug}`)}>{v.title}</a><small>{v.group}</small></th>
            <td data-label="DHA fee">{dha === null ? "Confirmed at submission" : v.dhaFee}</td>
            <td data-label="VFS fee">{rand(fees.vfs)}</td>
            <td data-label="GlobalPath fee">{rand(fees.application)}</td>
            <td data-label="Estimated total"><strong>{rand(total)}{dha === null ? " + DHA" : ""}</strong></td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="small-print fee-note">DHA fees are the indicative amounts in the visa directory. Optional VFS services, such as courier or premium lounge, are extra. Additional applicants (for example dependants) each need their own application.</p>
    </section>
    <CTA/>
  </>;
}
