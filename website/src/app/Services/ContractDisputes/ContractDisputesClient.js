"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { APP_BASE_PATH } from "@/config/appConfig";
import "@/styles/contractDisputes.css";

/* ── Data ── */
const disputeTypes = [
  {
    num: "01",
    title: "Breach of Contract",
    img: "/assets/images/CAD-1.png",
    alt: "Breach of Contract",
    desc: "Occurs when one party fails to fulfill agreed obligations, leading to delays, losses, or unmet expectations. Such disputes often result in legal and business complications.",
    tags: ["Failure to meet obligations", "Written Agreement violations", "Refusal to perform agreed work", "Delay in contract fulfillment"],
  },
  {
    num: "02",
    title: "Service Agreement Disputes",
    img: "/assets/images/CAD-2.png",
    alt: "Service Agreement Disputes",
    desc: "Arise when services delivered do not meet agreed expectations in terms of quality, scope, or timelines. These issues are often caused by miscommunication or unclear service terms.",
    tags: ["Poor service quality", "Scope of work disagreements", "Disagreements over deliverables or charges"],
    reverse: true,
  },
  {
    num: "03",
    title: "Vendor & Supplier Disputes",
    img: "/assets/images/CAD-3.png",
    alt: "Vendor & Supplier Disputes",
    desc: "Happen when there are objections with deliveries, product quality, or pricing agreements. These disputes can disrupt supply chains and business operations significantly.",
    tags: ["Late or incomplete deliveries", "Defective or sub-standard supplies", "Pricing or invoice disagreements", "Forcing in excess requirements"],
  },
  {
    num: "04",
    title: "Payment & Compensation Issues",
    img: "/assets/images/CAD-4.png",
    alt: "Payment & Compensation Issues",
    desc: "Involve non-payments, penalties, or financial obligations between parties. These conflicts usually arise due to lack of clarity in payment terms or disputes.",
    tags: ["Non-payment or late payment", "Dispute over penalty clauses", "Salary or compensation disputes", "Claim for financial loss"],
    reverse: true,
  },
  {
    num: "05",
    title: "Contract Termination Conflicts",
    img: "/assets/images/CAD-5.png",
    alt: "Contract Termination Conflicts",
    desc: "Arise from early or improper contract termination, leading to disagreements over liabilities or entitlements. These disputes can lead to significant financial and legal consequences.",
    tags: ["Sudden or early termination", "Holding payments or obligations", "Notice period violations", "Seeking penalties or damages"],
  },
];

const resolveTips = [
  {
    img: "/assets/images/yoga.png",
    title: "Stay Calm & Be Willing to Talk",
    tips: [
      "Take time to cool down before discussing",
      "Focus on solving the issue, not winning",
      "Respect different opinions",
      "Keep the discussion on the main problem",
      "Avoid raising your voice or reacting emotionally",
      "Choose the right time and place to talk",
      "Be open to hearing things you may not agree with",
    ],
  },
  {
    img: "/assets/images/listen.png",
    title: "Listen & Communicate Clearly",
    tips: [
      "Listen without interrupting",
      "Try to understand the other person's perspective",
      "Ask questions to avoid misunderstandings",
      "Express your thoughts calmly and honestly",
      "Maintain eye contact and attention",
      "Avoid blaming or accusing language",
      "Be clear and specific in what you say",
    ],
  },
  {
    img: "/assets/images/agreement.png",
    title: "Set Clear Agreements",
    tips: [
      "Make sure everyone understands the decision",
      "Define responsibilities clearly",
      "Write down the agreement if needed",
      "Respect the agreed outcome",
      "Set timelines if required",
      "Avoid assumptions—clarify everything",
      "Stay committed to what was agreed",
    ],
  },
  {
    img: "/assets/images/work-together.png",
    title: "Work Together to Find a Solution",
    tips: [
      "Discuss possible solutions together",
      "Be open to compromise",
      "Focus on common ground",
      "Agree on a solution and follow it",
      "Think of solutions that benefit both sides",
      "Avoid \"my way or your way\" thinking",
      "Consider long-term impact of decisions",
    ],
  },
];

const whyIcons = [
  { src: "/assets/icons/fastresol.png", label: "Fast Resolution" },
  { src: "/assets/icons/legallycom.png", label: "Legally Compliant" },
  { src: "/assets/icons/s&c.png", label: "Secure & Confidential" },
  { src: "/assets/icons/neutralexp.png", label: "Neutral Experts" },
  { src: "/assets/icons/247.png", label: "24/7 Access" },
];

const faqData = [
  {
    q: "Is my privacy protected during the process?",
    a: "Yes. All mediation sessions are fully confidential. Information shared during the process cannot be disclosed or used in court without mutual consent, ensuring a safe environment for open communication.",
  },
  {
    q: "Can I bring my own lawyer to the session?",
    a: "Yes, you may have legal representation during mediation sessions. Our platform supports both self-represented and legally assisted participants for a fair and balanced process.",
  },
  {
    q: "What happens if the other party refuses to join?",
    a: "If the other party declines to participate, we guide you on available legal options and next steps to effectively protect your rights and interests.",
  },
  {
    q: "How long does the average case take?",
    a: "Most contract and agreement disputes are resolved within a few days to a few weeks, depending on the complexity of the issue and the willingness of both parties to engage constructively.",
  },
];

const testimonials = [
  {
    name: "Resident, Pune",
    img: "/assets/images/t3.png",
    text: "The platform helped us resolve a contract breach quickly and professionally without any court involvement.",
  },
  {
    name: "Client, Mumbai",
    img: "/assets/images/t4.png",
    text: "Our service agreement dispute was resolved efficiently. I was impressed by how neutral the mediators were.",
  },
  {
    name: "Tenant, Hyderabad",
    img: "/assets/images/t1.png",
    text: "I was nervous about the process but the mediator was neutral and very professional throughout.",
  },
  {
    name: "User, Indore",
    img: "/assets/images/t2.png",
    text: "Very smooth and simple process. The team handled things professionally and made communication easier.",
  },
  {
    name: "Landlord, Delhi",
    img: "/assets/images/t5.png",
    text: "Efficient and stress-free. I was able to resolve my contract dispute without stepping into a court.",
  },
];

export default function ContractDisputeClient() {
  const [openFaq, setOpenFaq] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  const [hiwVisible, setHiwVisible] = useState(false);
  const [whyVisible, setWhyVisible] = useState(false);
  const [causesVisible, setCausesVisible] = useState(false);
  const [typesVisible, setTypesVisible] = useState(false);
  const [resolveVisible, setResolveVisible] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [whatVisible, setWhatVisible] = useState(false);

  const hiwRef = useRef(null);
  const whyRef = useRef(null);
  const causesRef = useRef(null);
  const typesRef = useRef(null);
  const resolveRef = useRef(null);
  const heroRef = useRef(null);
  const whatRef = useRef(null);

  const navigateToApp = useCallback((path = "/login", queryParams = {}) => {
    try {
      const searchParams = new URLSearchParams(queryParams);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
      window.location.href = `${APP_BASE_PATH}${path}${query}`;
    } catch {
      window.location.href = `${APP_BASE_PATH}/login`;
    }
  }, []);

  const makeObs = (setter, threshold = 0.15) => (ref) => {
    if (!ref?.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setter(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => makeObs(setHeroVisible, 0.20)(heroRef), []);
  useEffect(() => makeObs(setWhatVisible, 0.15)(whatRef), []);
  useEffect(() => makeObs(setHiwVisible, 0.15)(hiwRef), []);
  useEffect(() => makeObs(setWhyVisible, 0.15)(whyRef), []);
  useEffect(() => makeObs(setCausesVisible, 0.10)(causesRef), []);
  useEffect(() => makeObs(setTypesVisible, 0.05)(typesRef), []);
  useEffect(() => makeObs(setResolveVisible, 0.10)(resolveRef), []);
  /* eslint-enable */

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);
  const prevT = () => setTestimonialIdx((i) => (i === 0 ? testimonials.length - 1 : i - 1));
  const nextT = () => setTestimonialIdx((i) => (i === testimonials.length - 1 ? 0 : i + 1));
  const getSlot = (offset) => {
    const len = testimonials.length;
    return ((testimonialIdx + offset) % len + len) % len;
  };
  const slots = [-2, -1, 0, 1, 2];

  return (
    <>
      <Header />

      <div className="cad-page">

        {/* ══ HERO ══ */}
        <section ref={heroRef} className={`cad-hero${heroVisible ? " hero-animate" : ""}`}>
          <div className="cad-hero-cl1" aria-hidden="true" />
          <div className="cad-hero-cl2" aria-hidden="true" />
          <div className="cad-hero-cr1" aria-hidden="true" />
          <div className="cad-hero-cr2" aria-hidden="true" />
          <div className="cad-hero-card">
            <div className="cad-hero-badge">WE HANDLE EVERY DISPUTE PROFESSIONALLY</div>
            <h1 className="cad-hero-title">Contract &amp; Agreement Disputes Resolution</h1>
            <p className="cad-hero-sub">
              With a track record of successfully resolving a wide range of legal issues,
              we&apos;re committed to protecting your interests and helping you achieve peace of mind.
            </p>
            <div className="cad-hero-btns">
              <button className="cad-hero-btn-primary" onClick={() => navigateToApp("/user/file-new-case/step1")}>File a Case</button>
              <button className="cad-hero-btn-secondary" onClick={() => navigateToApp("/user/file-new-case/step1")}>Learn More</button>
            </div>
          </div>
        </section>

        {/* ══ WHAT ARE CONTRACT & AGREEMENT DISPUTES ══ */}
        <section ref={whatRef} className={`cad-what${whatVisible ? " what-animate" : ""}`}>
          <div className="cad-container cad-what-grid">
            <div className="cad-what-left">
              <p className="cad-eyebrow cad-eyebrow-left">COMMERCIAL DISPUTE</p>
              <h2 className="cad-section-title cad-left">What are Contract &amp; Agreement Disputes</h2>
              <p className="cad-what-text">
                Contract &amp; Agreement disputes arise when one or more parties fail to meet the terms
                outlined in a legally binding agreement. These issues are caused by misunderstandings,
                unclear terms, failures to deliver, or violations of agreed responsibilities.
                Disputes are common in business dealings, service agreements, vendor relationships, and
                personal contracts.
              </p>
              <p className="cad-what-text">
                RaaziMarzi helps resolve such disputes through secure and structured online arbitration
                and mediation, providing a smooth, confidential, and legally firm process—eliminating the
                need for lengthy court proceedings.
              </p>
              <button
                className="cad-btn-primary cad-btn-sm"
                onClick={() => navigateToApp("/user/file-new-case/step1")}
              >
                File a Case
              </button>
            </div>
            <div className="cad-what-right">
              <div className="cad-what-img-wrap">
                <img src="/assets/images/CAD.png" alt="Contract Dispute" className="cad-what-img" />
              </div>
            </div>
          </div>
        </section>

        {/* ══ CAUSES ══ */}
        <section ref={causesRef} className={`cad-causes${causesVisible ? " causes-animate" : ""}`}>
          <div className="cad-container cad-causes-grid">
            <div className="cad-causes-left">
              <p className="cad-eyebrow cad-eyebrow-left">COMMERCIAL DISPUTES</p>
              <h2 className="cad-section-title cad-left">Causes of Contract &amp; Agreement Disputes</h2>
            </div>
            <div className="cad-causes-cards">
              {[
                { title: "Communication Gaps", desc: "Poor communication between contracting parties often leads to misunderstandings about terms, responsibilities, and expectations." },
                { title: "Lack of Proper Documentation", desc: "Verbal or loosely written agreements create ambiguity and make it difficult to enforce terms or resolve disagreements legally." },
                { title: "Delays & Missed Commitments", desc: "Failure to meet deadlines or agreed timelines can disrupt both parties causing loss and trust leading to disputes." },
                { title: "Misaligned Expectations", desc: "Differences in interpretation of contract clauses, deliverables, or standards often lead to conflicts between parties." },
              ].map((c, i) => (
                <div key={i} className={`cad-cause-card causes-card-${i + 1}`}>
                  <div className="cad-cause-dot" />
                  <h4>{c.title}</h4>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ TYPES ══ */}
        <section ref={typesRef} className={`cad-types${typesVisible ? " types-animate" : ""}`}>
          <div className="cad-container">
            <p className="cad-eyebrow">INDIVIDUAL DISPUTE</p>
            <h2 className="cad-section-title">Types of Private Nuisance</h2>
            <p className="cad-section-sub">
              Addressing common contract and agreement issues so that they can get resolved in a fast and secure manner.
            </p>
            <div className="cad-types-list">
              {disputeTypes.map((item, i) => (
                <div
                  key={i}
                  className={`cad-type-row${item.reverse ? " cad-type-row-rev" : ""} type-row-${i + 1}`}
                >
                  <div className="cad-type-num-col">
                    <span className="cad-type-num">{item.num}</span>
                  </div>
                  <div className="cad-type-content">
                    <h3 className="cad-type-title">{item.title}</h3>
                    <p className="cad-type-desc">{item.desc}</p>
                    <ul className="cad-type-tags">
                      {item.tags.map((t, ti) => (
                        <li key={ti}><span className="cad-tag-dot" />{t}</li>
                      ))}
                    </ul>
                    <button className="cad-btn-outline" onClick={() => navigateToApp("/user/file-new-case/step1")}>
                      Learn More
                    </button>
                  </div>
                  <div className="cad-type-img-col">
                    <div className="cad-type-img-wrap">
                      <img src={item.img} alt={item.alt} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW TO RESOLVE ══ */}
        <section ref={resolveRef} className={`cad-resolve${resolveVisible ? " resolve-animate" : ""}`}>
          <div className="cad-container">
            <p className="cad-eyebrow">INDIVIDUAL DISPUTES</p>
            <h2 className="cad-section-title">How to Resolve Contract &amp; Agreement Disputes</h2>
            <p className="cad-section-sub">
              Follow a simple and structured approach to handle contract disputes
              peacefully and reach a fair resolution.
            </p>
            <div className="cad-resolve-grid">
              <div className="cad-resolve-card resolve-card-1">
                <h4 className="cad-resolve-card-title">Stay Calm &amp; Be Willing to Talk</h4>
                <ul className="cad-resolve-list">
                  {resolveTips[0].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="cad-resolve-img-wrap">
                  <img src={resolveTips[0].img} alt="Stay Calm" />
                </div>
              </div>
              <div className="cad-resolve-card resolve-card-2">
                <h4 className="cad-resolve-card-title">Listen &amp; Communicate Clearly</h4>
                <ul className="cad-resolve-list">
                  {resolveTips[1].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="cad-resolve-img-wrap">
                  <img src={resolveTips[1].img} alt="Listen and Communicate" />
                </div>
              </div>
              <div className="cad-resolve-card resolve-card-3">
                <h4 className="cad-resolve-card-title">Set Clear Agreements</h4>
                <ul className="cad-resolve-list">
                  {resolveTips[2].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="cad-resolve-img-wrap">
                  <img src={resolveTips[2].img} alt="Set Clear Agreements" />
                </div>
              </div>
              <div className="cad-resolve-card resolve-card-4">
                <h4 className="cad-resolve-card-title">Work Together to Find a Solution</h4>
                <ul className="cad-resolve-list">
                  {resolveTips[3].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="cad-resolve-img-wrap">
                  <img src={resolveTips[3].img} alt="Work Together" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section ref={hiwRef} className={`hiw-section${hiwVisible ? " hiw-animate" : ""}`}>
          <div className="hiw-header">
            <p className="hiw-eyebrow">3 SIMPLE STEPS</p>
            <h2 className="hiw-title">How It Works</h2>
            <p className="hiw-sub">A simple and secure process to resolve disputes online.</p>
          </div>

          <div className="hiw-stage">
            {/* Wave spans full viewport width, not constrained to max-width */}
            <img src="/assets/icons/line.png" className="hiw-wave-img" alt="" aria-hidden="true" />

            <div className="hiw-dot hiw-dot-1"><img src="/assets/icons/1.png" alt="" /></div>
            <div className="hiw-dot hiw-dot-2"><img src="/assets/icons/2.png" alt="" /></div>
            <div className="hiw-dot hiw-dot-3"><img src="/assets/icons/3.png" alt="" /></div>

            <div className="hiw-step hiw-step-1">
              <div className="hiw-step-heading">
                <h4>Submit Your Case</h4>
                <span className="hiw-ghost" aria-hidden="true">1</span>
              </div>
              <p>Provide your dispute details and upload necessary documents securely.</p>
            </div>

            <div className="hiw-step hiw-step-2">
              <div className="hiw-step-heading">
                <h4>Mediation &amp; Discussion</h4>
                <span className="hiw-ghost" aria-hidden="true">2</span>
              </div>
              <p>The other party is notified and a mediator facilitates discussion between both sides.</p>
            </div>

            <div className="hiw-step hiw-step-3">
              <div className="hiw-step-heading">
                <h4>Resolution</h4>
                <span className="hiw-ghost" aria-hidden="true">3</span>
              </div>
              <p>Reach a fair agreement or get a final decision through arbitration.</p>
            </div>
          </div>
        </section>

        {/* ══ WHY CHOOSE ══ */}
        <section ref={whyRef} className={`id-why${whyVisible ? " why-animate" : ""}`}>
          <div className="id-container">
            <div className="id-section-head center">
              <h2>Why Choose RaaziMarzi</h2>
              <p className="id-section-sub">A faster, secure, and reliable way to resolve disputes without lengthy court procedures.</p>
            </div>
            <div className="id-why-grid">
              {whyIcons.map((item, i) => (
                <div key={i} className="id-why-card">
                  <div className="id-why-circle">
                    <img src={item.src} alt={item.label} />
                  </div>
                  <h4>{item.label}</h4>
                  <p>Resolve business, customer, or personal conflicts through a secure platform.</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FAQ ══ */}
        <section className="svc-faq">
          <div className="svc-container">
            <p className="svc-eyebrow">FAQS</p>
            <h2 className="svc-section-title">Frequently Asked Questions</h2>
            <p className="svc-section-sub">Find answers to common questions about our online dispute resolution process.</p>
            <div className="svc-faq-list">
              {faqData.map((faq, i) => (
                <div key={i} className="svc-faq-box">
                  <button className="svc-faq-item" onClick={() => toggleFaq(i)} aria-expanded={openFaq === i}>
                    <span>{faq.q}</span>
                    <span className="svc-faq-toggle">{openFaq === i ? "−" : "+"}</span>
                  </button>
                  {openFaq === i && <div className="svc-faq-answer">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ TESTIMONIALS ══ */}
        <section className="svc-testimonials">
          <div className="svc-container">
            <p className="svc-eyebrow">TESTIMONIALS</p>
            <h2 className="svc-section-title">What Our Clients Say?</h2>
            <p className="svc-section-sub">See how clients are resolving contract disputes quickly and securely with our platform.</p>
            <div className="svc-testimonial-top-avatars">
              {slots.map((offset) => {
                const idx = getSlot(offset);
                const isCenter = offset === 0;
                const isNear = Math.abs(offset) === 1;
                const cls = isCenter
                  ? "svc-floating-avatar active"
                  : isNear
                    ? "svc-floating-avatar svc-av-near"
                    : "svc-floating-avatar svc-av-far";
                return (
                  <button
                    key={offset}
                    className={cls}
                    onClick={() => setTestimonialIdx(idx)}
                    aria-label={`View testimonial from ${testimonials[idx].name}`}
                    aria-pressed={isCenter}
                  >
                    <img src={testimonials[idx].img} alt={testimonials[idx].name} />
                  </button>
                );
              })}
            </div>
            <div className="svc-testimonial-wrap">
              <button className="svc-nav-arrow" onClick={prevT} aria-label="Previous">&#8249;</button>
              <div className="svc-testimonial-card" key={testimonialIdx}>
                <h4 className="svc-testimonial-name">{testimonials[testimonialIdx].name}</h4>
                <div className="svc-stars">★★★★★</div>
                <p className="svc-testimonial-text">&ldquo;{testimonials[testimonialIdx].text}&rdquo;</p>
              </div>
              <button className="svc-nav-arrow" onClick={nextT} aria-label="Next">&#8250;</button>
            </div>
          </div>
        </section>

        {/* ══ CTA ══ */}
        <section className="svc-cta">
          <div className="svc-cta-overlay">
            <div className="svc-container svc-cta-inner">
              <h2 className="svc-cta-title">Ready to find a peaceful resolution?</h2>
              <p className="svc-cta-text">Join thousands of individuals who have settled their disputes with dignity and legal certainty.</p>
              <button className="svc-cta-btn" onClick={() => navigateToApp("/user/file-new-case/step1")}>File a Case</button>
            </div>
          </div>
        </section>

      </div>

      <Footer />
    </>
  );
}