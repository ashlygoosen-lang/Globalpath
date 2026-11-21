import { fees, rand } from "./lib/content";

export type Block =
  | string
  | { list: string[] }
  | { table: { head: string[]; rows: string[][] } }
  | { note: string };
export type Section = { id: string; title: string; important?: boolean; blocks: Block[] };
export type LegalDoc = { slug: string; nav: string; title: string; summary: string; updated: string; sections: Section[] };

const UPDATED = "21 November 2026";
const CO = "VINK Group (Pty) Ltd";
const REG = "2018/079316/07";
const ADDRESS = "Cape Town Hub, 39 Somerset Road, Green Point, Cape Town, 8005, South Africa";
const PHONE = "081 543 3728";
const EMAIL = "hello@globalpath.co.za";

const C = rand(fees.consultation);
const A = rand(fees.application);
const AP = rand(fees.appeal);
const AS = rand(fees.asylum);
const VFS = rand(fees.vfs);

/* ------------------------------------------------------------------ */
/* Terms of service                                                    */
/* ------------------------------------------------------------------ */
const terms: LegalDoc = {
  slug: "terms",
  nav: "Terms of service",
  title: "Terms of service",
  summary: "The agreement between you and GlobalPath when you use this website, book a consultation or instruct us on an immigration matter.",
  updated: UPDATED,
  sections: [
    { id: "about", title: "1. Who we are and what these terms cover", blocks: [
      `GlobalPath Immigration (“GlobalPath”, “we”, “us”) is a division of ${CO}, a private company registered in South Africa under registration number ${REG}. Our office is at ${ADDRESS}.`,
      "These terms apply when you browse this website, create a client portal account, book a consultation, use our eligibility tools, or instruct us to help with a visa, permit, appeal or asylum matter. Our Refund and cancellation policy, Privacy policy and Client identification and anti-money-laundering policy form part of these terms.",
      "By booking a service, ticking an acceptance box, paying an invoice or using the client portal, you agree to these terms. If you are accepting on behalf of a company, for example as an employer sponsoring a work visa, you confirm that you are authorised to bind that company.",
      { note: "Some clauses below limit our liability, place risks on you or require you to do things. As the Consumer Protection Act requires, these sections (6, 9, 13 and 14) are marked “Please read carefully”. Please read them carefully, and ask us if anything is unclear before you go ahead." },
    ] },
    { id: "services", title: "2. Our services", blocks: [
      "We provide immigration advisory and application support services for people and businesses dealing with the South African Department of Home Affairs (DHA), VFS Global and South African missions abroad. Our services are:",
      { list: [
        `Consultations: a 45-minute meeting in person or by video, with a written summary of your options, for a fee of ${C}.`,
        `Visa and permit applications: an eligibility assessment, a personalised document checklist, review of every document, completion of forms, the VFS booking, and follow-up until the outcome, for a fixed fee of ${A} per application.`,
        `Appeals and reviews: analysis of a rejection, a fresh evidence plan, drafting and lodging of the appeal or review, and follow-up until the outcome, for a fixed fee of ${AP} per appeal.`,
        `Asylum assistance: help preparing an asylum application, for ${AS}, offered only where our assessment shows that you may qualify for refugee protection.`,
        "Corporate immigration: work authorisation strategy, onboarding of international employees and compliance reviews for employers, on terms set out in a separate proposal.",
      ] },
      "The exact scope of each matter is confirmed in writing before you pay, in our engagement letter or fee confirmation email. Anything not listed there is outside the scope of the matter and may be quoted separately.",
      "Unless we agree otherwise in writing, our fees do not include: government (DHA) fees; VFS Global fees, currently " + VFS + " per applicant; optional VFS services such as courier or premium lounge; sworn translations; police clearance certificates; medical and radiological reports; qualification evaluations (for example by SAQA); certified copies; travel; or the fees of attorneys, advocates or other professionals.",
    ] },
    { id: "nature", title: "3. What we are, and what we are not", blocks: [
      { list: [
        "We are an independent private consultancy. We are not part of, and are not endorsed by, the Department of Home Affairs, VFS Global, any South African mission, or any other government body.",
        "We are not a firm of attorneys. Our advice concerns the requirements and procedures of South African immigration law. Where a matter needs court proceedings, litigation or a legal opinion that only an admitted legal practitioner may give, we will tell you and, if you wish, refer you to an independent attorney, who will contract with you directly.",
        "The information on this website is general and may not apply to your circumstances. It does not create a client relationship and is not a substitute for advice on your specific matter.",
      ] },
    ] },
    { id: "outcomes", title: "4. No guaranteed outcome or processing time", blocks: [
      "Every immigration decision is made by the relevant government authority, which exercises its own discretion. No consultant can guarantee that an application, appeal or asylum claim will succeed, or how long a decision will take.",
      "Processing times we mention are the DHA’s published targets or our experience of recent matters. They are estimates only. We are not responsible for delays caused by the DHA, VFS Global, missions, other government departments, couriers or system outages.",
      "Do not make commitments that depend on a visa being issued, such as buying non-refundable travel, resigning from a job, ending a lease or enrolling at an institution, until you hold the visa or permit itself.",
    ] },
    { id: "engagement", title: "5. How a matter starts", blocks: [
      { list: [
        "Most matters begin with a paid consultation. You can book online. We confirm the appointment and send payment details by email within one business day.",
        "If you want us to act for you after the consultation, we send an engagement letter or fee confirmation that sets out the service, the fee and the documents we need.",
        "A binding agreement for a matter comes into existence when you accept the engagement letter (in writing or electronically) and we receive the fee, or when we start work at your request, whichever happens first.",
        "Before any work begins we must verify your identity, as described in our Client identification and anti-money-laundering policy.",
        "We may decline a matter, for example where we have a conflict of interest, where the application has no reasonable prospect of success, or where we cannot verify your identity or the source of the funds. If we decline after you have paid, we refund you as set out in the Refund and cancellation policy.",
      ] },
    ] },
    { id: "your-duties", title: "6. Your responsibilities", important: true, blocks: [
      "The quality of an application depends on the information and documents you give us. You agree to:",
      { list: [
        "give us complete, true and current information, including any previous refusals, overstays, deportations, criminal convictions or other adverse history, even if you think it is not relevant;",
        "provide genuine documents only. You must never give us altered, forged or fraudulently obtained documents;",
        "complete the applicant details form in the client portal before you upload documents, and upload every required document on your checklist before we can submit your application. Home Affairs only accepts complete applications;",
        "respond to our requests within the time we give you, and tell us at once if anything changes (for example your address, employment, marital status, passport or immigration status);",
        "attend your VFS appointment for biometrics, and any interview, in person, with original documents;",
        "keep your passport valid for the period the visa or permit requires;",
        "read the application forms and documents we prepare before you sign them. You remain responsible for the contents of every application lodged in your name;",
        "pay all third-party fees (DHA, VFS and others) when they are due;",
        "keep your client portal password secret, and tell us immediately if you think someone else has accessed your account.",
      ] },
      "Giving false information or fraudulent documents in an immigration application is a criminal offence under the Immigration Act and the Refugees Act. If we have reason to believe that information or a document is false, we will stop work, may end the agreement without a refund for work already done, and may be required by law to report the matter.",
      "If an application is refused, delayed or causes you loss because information or documents you supplied were incomplete, late or untrue, we are not responsible for that outcome.",
    ] },
    { id: "our-duties", title: "7. Our responsibilities", blocks: [
      "When we act for you, we will:",
      { list: [
        "carry out the agreed services with the care, skill and diligence expected of a professional immigration adviser;",
        "base our advice on the legislation, regulations, directives and DHA requirements in force at the time;",
        "check your documents against the checklist for your category before submission and tell you about any weakness we identify;",
        "keep your information confidential and protect it as described in our Privacy policy;",
        "keep you informed about progress through the client portal and by email, and respond to your messages within two business days;",
        "tell you promptly about any time limit that affects your matter, including the time limit for an appeal or review.",
      ] },
    ] },
    { id: "fees", title: "8. Fees and payment", blocks: [
      { table: { head: ["Service", "Professional fee", "Notes"], rows: [
        ["Consultation (any service)", C, "45 minutes, in person or by video, with a written summary. Payable before the appointment."],
        ["Visa or permit application", A, "Per application and per applicant. Each dependant needs a separate application."],
        ["Appeal or review", AP, "Per appeal, after a rejection."],
        ["Asylum assistance", AS, "Only after our assessment shows you may qualify. Home Affairs charges no fee to apply for asylum."],
        ["VFS Global service fee", VFS, "Charged by VFS per applicant, paid to VFS. Not a GlobalPath fee."],
        ["DHA fees", "Varies", "Set by the DHA for each category. Some categories are exempt. Confirmed before you pay."],
      ] } },
      { list: [
        "Prices are in South African rand and include VAT where VAT is applicable.",
        "Professional fees are payable in full before we begin work, unless your engagement letter sets out a different payment schedule.",
        "We accept payment by electronic funds transfer (EFT) or card only. We do not accept cash.",
        "Payment must come from you, from your employer or sponsor named in the engagement letter, or from another payer we have approved in writing. Please use the reference we give you.",
        "Government and VFS fees can change without notice. If a tariff changes before payment, we will tell you the new amount. These fees are passed on at cost.",
        "If an invoice remains unpaid after its due date, we may pause work until it is paid. We will tell you before we pause and explain any risk to your deadlines.",
        "Fixed fees cover one round of the agreed service. Work that becomes necessary because of changes in your circumstances, or a second application, is quoted separately before we do it.",
      ] },
    ] },
    { id: "refunds", title: "9. Cancellations and refunds", important: true, blocks: [
      "You may cancel a booking or end our engagement at any time. Whether you receive a refund, and how much, depends on how much work has been done and on the costs we have already paid to third parties. Full details are in our Refund and cancellation policy, which forms part of these terms.",
      "A refusal by the Department of Home Affairs, or a decision you disagree with, does not by itself entitle you to a refund, because our fee is for the professional work we do, not for the government’s decision.",
    ] },
    { id: "portal", title: "10. The client portal", blocks: [
      { list: [
        "The client portal lets you complete your applicant details, upload documents, follow your application’s stage and message our team.",
        "You must be at least 18 years old to open an account. A parent or legal guardian manages the matter of a child.",
        "Each account is for one person. Do not share your login. You are responsible for activity on your account.",
        "Uploads must be PDF, JPG, PNG or WebP files of up to 10 MB each, and must be clear, complete copies of the original documents.",
        "We may suspend an account that is used to upload unlawful material, to attempt unauthorised access, or in breach of these terms.",
        "We aim to keep the portal available at all times, but it may be unavailable during maintenance or for reasons outside our control. If a deadline is close, contact us by phone or email as well.",
      ] },
    ] },
    { id: "fica", title: "11. Client identification and anti-money-laundering", blocks: [
      "We verify the identity of every client and, where relevant, the source of the funds used to pay us, before we start work. We do not accept cash, we only refund money to the account it came from, and we may be required by the Financial Intelligence Centre Act to report suspicious transactions without telling you. Our Client identification and anti-money-laundering policy explains what we ask for and why.",
    ] },
    { id: "confidentiality", title: "12. Confidentiality and privacy", blocks: [
      "We treat everything you tell us about your matter as confidential. We share it only with the people and authorities who need it to deliver the service you asked for (for example the DHA, VFS Global, a South African mission or your sponsoring employer), with service providers who help us run our business under confidentiality obligations, or where the law requires us to. Our Privacy policy explains how we handle personal information under the Protection of Personal Information Act (POPIA).",
    ] },
    { id: "liability", title: "13. Limitation of liability", important: true, blocks: [
      "Nothing in these terms limits any right you have under the Consumer Protection Act or another law that cannot be excluded, or our liability for loss caused by our gross negligence, fraud or wilful misconduct.",
      "Subject to that, and to the extent the law allows:",
      { list: [
        "we are not liable for decisions, delays, errors or system failures of the DHA, VFS Global, South African missions, other government departments, banks, couriers or other third parties;",
        "we are not liable for loss caused by information or documents you supplied that were incomplete, late, inaccurate or not genuine, or by your failure to follow our written advice;",
        "we are not liable for indirect or consequential loss, such as loss of income, travel costs, accommodation or business opportunities, arising from the refusal or delay of an application;",
        "our total liability to you in connection with a matter is limited to the professional fees you paid us for that matter.",
      ] },
      "If we make an error in our own work, for example by missing a deadline that we were responsible for, we will first try to put it right at no extra cost to you, including by preparing an appeal or a new application without charging our professional fee.",
    ] },
    { id: "termination", title: "14. Ending the agreement", important: true, blocks: [
      "You may end our engagement at any time by telling us in writing. The Refund and cancellation policy then applies.",
      "We may end our engagement by giving you written notice if:",
      { list: [
        "you give us false information or documents, or ask us to act dishonestly or unlawfully;",
        "you do not pay an amount due within 14 days of a written reminder;",
        "you do not respond to our requests for 60 days or more, so that we cannot progress your matter;",
        "we cannot complete identity verification, or the law requires us to stop;",
        "a conflict of interest arises; or",
        "you behave in an abusive or threatening way towards our staff.",
      ] },
      "When the agreement ends, we will return your original documents (if we hold any), give you copies of the work we have completed if you ask, and tell you of any deadline you must still meet. We keep records as described in the Privacy policy.",
    ] },
    { id: "website", title: "15. Using this website", blocks: [
      { list: [
        "You may use this website for your own information and to use our services. You may not copy, republish or sell its content, design or logo without our written permission. All rights in the website belong to " + CO + " or its licensors.",
        "You may not attempt to gain unauthorised access to the website or the client portal, interfere with their operation, introduce malicious code, or collect information about other users.",
        "Our eligibility tools, including the visa assessment and the asylum eligibility check, give an initial indication only. They do not replace a professional assessment and are not a decision on your eligibility.",
        "Links to other websites, such as those of the DHA or VFS Global, are provided for convenience. We are not responsible for their content or availability.",
      ] },
    ] },
    { id: "complaints", title: "16. Complaints", blocks: [
      `If you are unhappy with our service, please tell us first so we can put it right. Email ${EMAIL} with the subject “Complaint” and your client reference. We acknowledge complaints within two business days and aim to give you a full response within ten business days.`,
      "If we cannot resolve your complaint, you may refer it to the Consumer Goods and Services Ombud (www.cgso.org.za, 0860 000 272, info@cgso.org.za) or the National Consumer Commission. Complaints about personal information may be referred to the Information Regulator, as set out in our Privacy policy.",
    ] },
    { id: "general", title: "17. General", blocks: [
      { list: [
        "These terms are governed by the laws of the Republic of South Africa. You and we agree to the jurisdiction of the South African courts, including the magistrates’ courts, for any dispute that is not resolved through the complaints process.",
        "If any part of these terms is found invalid, the rest remains in force.",
        "These terms, your engagement letter and the policies referred to above are the whole agreement between us about a matter. If your engagement letter conflicts with these terms, the engagement letter applies.",
        "We may update these terms from time to time. The version that applies to your matter is the one in force when you accepted your engagement letter, unless you agree to a later version. Changes to website-use terms apply from the date we publish them.",
        "Notices to us must be sent to " + EMAIL + ". We send notices to the email address in your client portal account.",
      ] },
    ] },
    { id: "ecta", title: "18. Supplier information", blocks: [
      "Published in terms of section 43 of the Electronic Communications and Transactions Act 25 of 2002:",
      { table: { head: ["Item", "Details"], rows: [
        ["Trading name", "GlobalPath Immigration"],
        ["Legal entity", `${CO}, a private company`],
        ["Registration number", REG],
        ["Physical and postal address", ADDRESS],
        ["Telephone", PHONE],
        ["Email", EMAIL],
        ["Website", "globalpath-production.up.railway.app"],
        ["Payment methods", "EFT and card. No cash."],
        ["Policies", "Refund and cancellation policy, Privacy policy, Client identification and anti-money-laundering policy"],
      ] } },
    ] },
  ],
};

/* ------------------------------------------------------------------ */
/* Refund and cancellation policy                                      */
/* ------------------------------------------------------------------ */
const refunds: LegalDoc = {
  slug: "refunds",
  nav: "Refund policy",
  title: "Refund and cancellation policy",
  summary: "What happens to your payment if you cancel a consultation, end an application, or we cannot take your matter on.",
  updated: UPDATED,
  sections: [
    { id: "principles", title: "1. How refunds work", blocks: [
      "Our professional fees pay for the time and expertise we spend on your matter. If you cancel, we refund the part of the fee that covers work we have not yet done, and keep a fair amount for the work already completed. This follows section 17 of the Consumer Protection Act, which allows a supplier to charge a reasonable cancellation fee that reflects the nature of the service, how much notice you give and the work already done.",
      { list: [
        "You can cancel at any time, by email to " + EMAIL + " or through the client portal. The date we receive your written notice is the cancellation date.",
        "A refusal by the Department of Home Affairs (DHA) is not a reason for a refund on its own. Our fee is for the professional work, not for the government’s decision.",
        "Money paid to third parties is not ours to refund. See section 6.",
        "If a person a booking was made for dies or is admitted to hospital and cannot keep the booking, we refund the full professional fee paid for any work not yet completed and charge no cancellation fee.",
      ] },
    ] },
    { id: "consultations", title: `2. Consultations (${C})`, blocks: [
      { table: { head: ["When you cancel or change", "What happens"], rows: [
        ["24 hours or more before the appointment", "Free rescheduling, or a full refund."],
        ["Less than 24 hours before the appointment", "One free reschedule, or a 50% refund."],
        ["You do not attend and do not tell us", "No refund. We will offer one new time within 30 days at no extra cost if you contact us within 7 days."],
        ["We cancel or cannot hold the appointment", "Your choice of a new time or a full refund."],
      ] } },
    ] },
    { id: "applications", title: `3. Visa and permit applications (${A})`, blocks: [
      "Each application moves through six stages, which you can see in the client portal. The refund depends on the stage your application has reached on the cancellation date.",
      { table: { head: ["Stage on the cancellation date", "Refund of the professional fee"], rows: [
        ["Paid, but within 7 days of payment and before any work has started", "100%"],
        ["1. Assessment in progress or completed", "75%"],
        ["2. Document collection (checklist issued, documents being gathered)", "50%"],
        ["3. Quality review (documents reviewed, forms prepared)", "25%"],
        ["4. Submitted to VFS, or any later stage", "No refund. The service has been substantially performed."],
      ] } },
      { list: [
        "If our assessment shows that you do not meet the requirements for the category, and you choose not to go ahead, we refund 75% of the fee.",
        "If we decline to act for you before work starts (for example because of a conflict of interest), we refund 100%. If we end the engagement for one of the reasons in section 14 of our Terms of service, the stage table above applies.",
        "If you do not respond to our requests for 60 days or more and we close your matter, the stage table applies on the date we close it. We will warn you in writing before we do so.",
      ] },
      { note: "Paying before 7 days have passed and asking us to start straight away? Under section 42(2)(d) of the Electronic Communications and Transactions Act, the 7-day cooling-off period does not apply to services that begin with your consent. You still keep the refund rights in this table." },
    ] },
    { id: "appeals", title: `4. Appeals and reviews (${AP})`, blocks: [
      { table: { head: ["Stage on the cancellation date", "Refund of the professional fee"], rows: [
        ["Before we start analysing the rejection", "100%"],
        ["Rejection analysed and evidence plan issued, drafting not started", "50%"],
        ["Appeal or review drafted", "25%"],
        ["Appeal or review lodged", "No refund"],
      ] } },
      "Appeals and reviews have strict time limits. If you cancel close to the deadline, we cannot guarantee that another adviser will be able to lodge in time.",
    ] },
    { id: "asylum", title: `5. Asylum assistance (${AS})`, blocks: [
      "We only accept the asylum fee after our assessment shows that you may qualify for refugee protection. Home Affairs does not charge a fee to apply for asylum.",
      { table: { head: ["Stage on the cancellation date", "Refund of the professional fee"], rows: [
        ["Before we begin work on your written account", "100%"],
        ["Written account in preparation", "50%"],
        ["Account and evidence plan completed, or interview preparation started", "No refund"],
      ] } },
    ] },
    { id: "third-party", title: "6. Third-party fees", blocks: [
      "These amounts are paid to other organisations and are not refundable by GlobalPath once they have been paid on your behalf:",
      { list: [
        `VFS Global service fees (currently ${VFS} per applicant) and optional VFS services;`,
        "DHA application fees;",
        "fees for sworn translations, police clearance certificates, medical and radiological reports, qualification evaluations, certified copies and couriers.",
      ] },
      "If we are still holding money for a third-party fee that has not yet been paid, we refund it in full. Any refund of a fee already paid to VFS or the DHA is subject to their own rules; we will help you request it where those rules allow.",
    ] },
    { id: "our-error", title: "7. If we make a mistake", blocks: [
      "If an application is refused, or a deadline is missed, because of an error in our own work, we will prepare and lodge the appeal, review or new application without charging our professional fee. If you would prefer not to continue with us, we refund the professional fee you paid for that matter in full. This does not apply where the refusal results from information or documents you supplied, or from a decision within the DHA’s discretion.",
    ] },
    { id: "how", title: "8. How to ask for a refund", blocks: [
      { list: [
        `Email ${EMAIL} with the subject “Refund request”, your client reference and the reason.`,
        "We confirm the amount within five business days, with a short statement of the work completed.",
        "We pay approved refunds within ten business days of confirming the amount.",
        "Refunds are paid only to the bank account or card the payment came from. This is a requirement of our anti-money-laundering controls. We cannot pay a refund to a different person or account, or in cash.",
        "We do not deduct an administration fee. Your bank may charge its own fees for receiving a payment, especially from abroad.",
      ] },
      "If you dispute a card payment with your bank (a chargeback) without first contacting us, we will pause work on your matter until the dispute is resolved.",
    ] },
    { id: "disputes", title: "9. If you disagree", blocks: [
      "If you are not satisfied with our refund decision, follow the complaints process in section 16 of our Terms of service. You may also contact the Consumer Goods and Services Ombud (www.cgso.org.za, 0860 000 272). This policy does not limit any right you have under the Consumer Protection Act.",
    ] },
  ],
};

/* ------------------------------------------------------------------ */
/* Privacy policy                                                      */
/* ------------------------------------------------------------------ */
const privacy: LegalDoc = {
  slug: "privacy",
  nav: "Privacy policy",
  title: "Privacy policy and POPIA notice",
  summary: "How GlobalPath collects, uses, shares and protects your personal information, and the rights you have under the Protection of Personal Information Act.",
  updated: UPDATED,
  sections: [
    { id: "who", title: "1. Who is responsible for your information", blocks: [
      `GlobalPath Immigration, a division of ${CO} (registration number ${REG}), is the responsible party for the personal information described in this notice. You can contact our Information Officer at ${EMAIL} (subject “POPIA”), on ${PHONE}, or at ${ADDRESS}.`,
      "This notice applies to everyone whose information we process: website visitors, people who book consultations or send enquiries, clients and their dependants, employers and sponsors, and people named in an application.",
    ] },
    { id: "collect", title: "2. Information we collect", blocks: [
      "We collect only what we need to give the service you ask for and to meet the documentary requirements of the DHA. Depending on your matter, this can include:",
      { table: { head: ["Category", "Examples"], rows: [
        ["Identity and contact", "Name, date and place of birth, sex, nationality, marital status, email, phone, home and South African addresses, emergency contact."],
        ["Passport and travel", "Passport number, type, issue and expiry dates, date and port of first entry into South Africa, current visa or permit, travel plans."],
        ["Immigration history", "Previous applications and refusals, overstays, deportations, declarations of undesirability."],
        ["Family and dependants", "Details of your spouse or partner, children and other dependants, and of South African relatives or partners who support your application."],
        ["Employment, study and business", "Employer details, job title, salary, qualifications, professional registrations, company and investment details, course and institution."],
        ["Financial", "Bank statements, proof of income or funds, payment records for our fees."],
        ["Special personal information", "Criminal convictions and police clearance certificates; medical and radiological reports; and, for asylum matters, information about religion, political opinion, ethnic origin, sexual orientation or health where it is part of your claim."],
        ["Documents", "Copies of the documents you upload to the client portal."],
        ["Account and communications", "Portal login details (your password is stored only in encrypted, hashed form), messages, consultation notes, booking details."],
        ["Technical", "IP address, browser type, pages requested and time of request, recorded in our server logs for security."],
      ] } },
      "We collect most of this information directly from you. We may also receive it from your employer or sponsor, a family member who supports your application, the DHA or VFS Global (for example the outcome of your application), and public registers such as the Companies and Intellectual Property Commission (CIPC).",
      "If you give us information about another person, such as a spouse, child or employee, please make sure they know you are sharing it and have seen this notice.",
    ] },
    { id: "why", title: "3. Why we use it, and our legal basis", blocks: [
      { table: { head: ["Purpose", "Legal basis under section 11 of POPIA"], rows: [
        ["Answering enquiries and booking consultations", "Steps you asked us to take before entering into a contract"],
        ["Assessing eligibility, preparing and lodging applications, appeals and asylum claims, and following them up", "Performance of our contract with you, and your consent for special personal information"],
        ["Verifying identity, preventing fraud and money laundering, and reporting to the Financial Intelligence Centre where required", "Compliance with a legal obligation, and our legitimate interest in preventing crime"],
        ["Invoicing, accounting and tax", "Compliance with a legal obligation"],
        ["Securing the website and client portal", "Our legitimate interest in protecting your information and our systems"],
        ["Sending our monthly immigration briefing", "Your consent, which you can withdraw at any time"],
        ["Handling complaints and legal claims", "Our legitimate interest in establishing, exercising or defending legal rights"],
      ] } },
      "We do not use your information for automated decisions that have legal effects on you, and we do not sell it.",
    ] },
    { id: "special", title: "4. Special personal information and children", blocks: [
      "Immigration applications often require special personal information, such as criminal records and medical reports, and asylum claims may require information about religion, political opinion, ethnic origin or sexual orientation. We process this only with your consent, which you give in the declaration in the client portal, or where it is necessary to establish or exercise your rights in law, as section 27 of POPIA allows. Access is limited to the advisers working on your matter.",
      "We process information about children only when a child is included in an application, and only with the consent of a parent or legal guardian, who acts for the child throughout the matter.",
    ] },
    { id: "share", title: "5. Who we share it with", blocks: [
      "We share your information only as needed for your matter, or where the law requires it:",
      { list: [
        "the Department of Home Affairs, VFS Global and South African missions abroad, to lodge and follow up your application;",
        "other government bodies involved in your category, such as the Department of Employment and Labour or SAQA, where your application requires it;",
        "your employer or sponsor, where they are part of your application and you have agreed to this;",
        "an independent attorney, if you ask us to refer your matter;",
        "service providers who help us run our business, such as cloud hosting, email and payment providers. They may use your information only to provide services to us, and must keep it confidential and secure;",
        "our auditors and professional advisers, under a duty of confidentiality;",
        "the Financial Intelligence Centre, the South African Police Service, a court or another authority, where the law requires us to disclose information.",
      ] },
    ] },
    { id: "transfers", title: "6. Transfers outside South Africa", blocks: [
      "Some of our service providers store data outside South Africa. Our website and client portal are hosted on cloud infrastructure in the United States, and applications lodged at a mission abroad are processed in that country. Where we transfer personal information outside South Africa, we do so only as section 72 of POPIA allows: to providers bound by contract, law or binding rules that give a level of protection substantially similar to POPIA, or where the transfer is necessary to perform our contract with you.",
    ] },
    { id: "security", title: "7. How we protect it", blocks: [
      { list: [
        "All traffic to the website and client portal is encrypted in transit (HTTPS).",
        "Passwords are stored only in hashed form. Portal sessions use signed tokens that expire.",
        "Access to client files is limited to staff working on the matter, and administrative access is controlled by role.",
        "Documents are shared through the client portal rather than ordinary email wherever possible. Uploads are restricted to document and image formats.",
        "Our database and uploaded files are stored on access-controlled, backed-up infrastructure.",
        "Staff are bound by confidentiality obligations.",
      ] },
      "If we have reasonable grounds to believe that your personal information has been accessed or acquired by an unauthorised person, we will notify you and the Information Regulator as soon as reasonably possible, as section 22 of POPIA requires.",
    ] },
    { id: "retention", title: "8. How long we keep it", blocks: [
      { table: { head: ["Record", "Retention period"], rows: [
        ["Client files, applications and identity verification records", "Five years after the matter closes"],
        ["Financial and payment records", "Five years, as tax law requires"],
        ["Enquiries and consultations that did not lead to a matter", "Two years"],
        ["Newsletter subscription", "Until you unsubscribe"],
        ["Server logs", "Up to 90 days, unless needed to investigate a security incident"],
      ] } },
      "We may keep records longer where the law requires it or where they are needed for a legal claim. When records are no longer needed, we delete them or de-identify them.",
    ] },
    { id: "rights", title: "9. Your rights", blocks: [
      "Under POPIA you have the right to:",
      { list: [
        "ask whether we hold personal information about you, and request a copy of it;",
        "ask us to correct information that is inaccurate, out of date or incomplete, or to delete information we are no longer authorised to keep;",
        "object to processing based on our legitimate interests;",
        "withdraw your consent at any time (this does not affect processing already done, and may mean we cannot continue an application that depends on it);",
        "refuse direct marketing, and unsubscribe from our briefing at any time;",
        "complain to the Information Regulator.",
      ] },
      `To use these rights, email ${EMAIL} with the subject “POPIA request”. We will need to verify your identity before we act on a request, and we respond within 30 days. Requests for access to records may also be made under the Promotion of Access to Information Act (PAIA); contact us for our PAIA manual. We do not charge for correcting or deleting information; a prescribed fee may apply to some access requests under PAIA.`,
    ] },
    { id: "marketing", title: "10. Direct marketing", blocks: [
      "We send our monthly immigration briefing only to people who subscribe to it. Every email has an unsubscribe link. We do not send marketing by SMS or phone call without your prior consent, and we never share your details with others for their marketing.",
    ] },
    { id: "cookies", title: "11. Cookies, local storage and tools on this site", blocks: [
      { list: [
        "We do not use advertising or tracking cookies, and we do not use third-party analytics.",
        "When you sign in to the client portal, your browser’s local storage keeps a session token so you stay signed in. It is removed when you sign out.",
        "The asylum eligibility check runs entirely in your browser. Your answers are not sent to us or stored.",
        "The visa assessment sends your yes or no answers to our server to calculate the result. If you are signed in, the result is saved to your account so your adviser can see it.",
        "Our fonts are hosted on our own server, so loading the website does not send your information to font providers. Map links open Google Maps in a new page, under Google’s own privacy terms.",
      ] },
    ] },
    { id: "changes", title: "12. Changes to this notice", blocks: [
      "We review this notice regularly and will publish any update on this page with a new date. If a change significantly affects how we use information you have already given us, we will tell you by email.",
    ] },
    { id: "regulator", title: "13. The Information Regulator", blocks: [
      "Please contact us first if you have a concern, so we can try to resolve it. You also have the right to complain to the Information Regulator:",
      { table: { head: ["", ""], rows: [
        ["Website", "www.inforegulator.org.za (complaints are lodged through the Regulator’s eService portal)"],
        ["Email", "enquiries@inforegulator.org.za"],
        ["Toll free", "0800 017 160"],
        ["Address", "Woodmead North Office Park, 54 Maxwell Drive, Woodmead, Johannesburg, 2191"],
      ] } },
    ] },
  ],
};

/* ------------------------------------------------------------------ */
/* Client identification and AML policy                                */
/* ------------------------------------------------------------------ */
const aml: LegalDoc = {
  slug: "fica",
  nav: "FICA and anti-money-laundering",
  title: "Client identification and anti-money-laundering policy",
  summary: "Why we verify who our clients are, what we ask for, and how we handle payments, under the Financial Intelligence Centre Act and South African immigration law.",
  updated: UPDATED,
  sections: [
    { id: "why", title: "1. Why we verify our clients", blocks: [
      "Immigration services can be misused for identity fraud, people smuggling and money laundering. We verify every client to protect you, the integrity of the applications we lodge, and our business.",
      "Every business in South Africa must report suspicious and unusual transactions to the Financial Intelligence Centre (FIC) under section 29 of the Financial Intelligence Centre Act 38 of 2001 (FICA), and may not deal with people and organisations on the United Nations Security Council sanctions lists. GlobalPath is not an accountable institution listed in Schedule 1 of FICA, but we voluntarily follow the customer due diligence and record-keeping practices that FICA requires of accountable institutions such as legal practitioners.",
    ] },
    { id: "individuals", title: "2. What we ask individuals for", blocks: [
      { list: [
        "a clear copy of your valid passport (or South African ID, for South African sponsors and relatives);",
        "proof of your residential address, not older than three months, such as a utility bill, bank statement or lease;",
        "a recent photograph or a live video consultation, so we can confirm that you are the person in the identity document;",
        "for payments by someone else, the identity of the payer and their relationship to you.",
      ] },
      "Much of this also forms part of the documents the DHA requires for your application, so you will usually only need to provide it once, through the client portal.",
    ] },
    { id: "companies", title: "3. What we ask companies and sponsors for", blocks: [
      { list: [
        "the company’s registration documents from CIPC, and its registered address;",
        "the identity of the directors and of every person who owns or controls 5% or more of the company (its beneficial owners);",
        "a resolution or letter authorising the person who instructs us to act for the company;",
        "for trusts and other entities, the founding documents and the identity of trustees and beneficiaries.",
      ] },
    ] },
    { id: "funds", title: "4. Source of funds", blocks: [
      "Where an application relies on significant funds, for example a business or financially independent permit, a retired person’s visa or an investment, we will ask how the funds were obtained and for documents that show it. The DHA requires much of this evidence as well. We may also ask about the source of the funds used to pay our fees where the payment is unusual.",
    ] },
    { id: "payments", title: "5. Payments and refunds", blocks: [
      { list: [
        "We do not accept cash.",
        "We accept payment by EFT or card only, from you, your employer or sponsor named in the engagement letter, or another payer we have approved in writing.",
        "We do not accept overpayments with a request to pay the difference to someone else.",
        "Refunds are paid only to the account or card the payment came from.",
        "We never hold funds for clients other than amounts for third-party fees on your matter, which we pay over promptly.",
      ] },
    ] },
    { id: "screening", title: "6. Sanctions screening and risk", blocks: [
      "We check clients, sponsors and payers against the targeted financial sanctions list published by the FIC. We assess each matter for risk and may ask for more information, or decline to act, where there are signs of identity fraud, document fraud, unexplained wealth, or an attempt to hide who is behind a transaction.",
    ] },
    { id: "reporting", title: "7. Reporting and confidentiality", blocks: [
      "If we know or suspect that a transaction or activity involves the proceeds of crime, money laundering or terrorist financing, the law requires us to report it to the FIC, and prohibits us from telling you or anyone else that a report has been or will be made. In those circumstances we may stop work on a matter without explanation.",
      "We will not knowingly submit false information or fraudulent documents to the DHA or any other authority. Where we find evidence of immigration fraud, we will stop work and may report it to the relevant authorities.",
    ] },
    { id: "records", title: "8. Record keeping", blocks: [
      "We keep identity verification records, and records of every transaction with a client, for at least five years after the matter ends. These records are protected as described in our Privacy policy.",
    ] },
    { id: "refuse", title: "9. If you cannot or will not verify", blocks: [
      "If we cannot complete verification, we cannot start or continue work on your matter. Where you have paid, the Refund and cancellation policy applies, and any refund goes back to the account the payment came from.",
    ] },
  ],
};

/* ------------------------------------------------------------------ */
/* Disclaimer                                                          */
/* ------------------------------------------------------------------ */
const disclaimer: LegalDoc = {
  slug: "disclaimer",
  nav: "Legal disclaimer",
  title: "Legal disclaimer",
  summary: "The limits of the general information published on this website.",
  updated: UPDATED,
  sections: [
    { id: "general", title: "General information", blocks: [
      "Content on this website, including visa requirements, document checklists, fees, processing times and articles, is general information about South African immigration. It does not constitute legal advice and should not be relied on for any specific matter. Requirements, tariffs and timeframes change, sometimes without notice; we confirm the current position for your matter before you pay.",
    ] },
    { id: "outcomes", title: "No guaranteed outcomes", blocks: [
      "Immigration decisions are made by the Department of Home Affairs and other authorities. No consultant can guarantee an outcome or a processing time.",
    ] },
    { id: "independence", title: "Independence", blocks: [
      "GlobalPath is an independent private consultancy. It is not part of, or endorsed by, the Department of Home Affairs, VFS Global or any government body.",
    ] },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [terms, refunds, privacy, aml, disclaimer];
export const legalDoc = (slug?: string) => LEGAL_DOCS.find(d => d.slug === slug);
