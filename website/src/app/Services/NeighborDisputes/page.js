"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { APP_BASE_PATH } from "@/config/appConfig";
import "@/styles/neighborDisputes.css";

/* ── Data ── */
const disputeTypes = [
  {
    num: "01",
    title: "Noise Disturbances",
    img: "/assets/images/ND-1.png",
    alt: "Noise Disturbances",
    desc: "Disputes arising from excessive noise such as loud music, construction, or disruptive activities affecting your peace.",
    tags: ["Loud Music", "Construction Noise", "Late Night Disturbances"],
  },
  {
    num: "02",
    title: "Parking Disputes",
    img: "/assets/images/ND-2.png",
    alt: "Parking Disputes",
    desc: "Conflicts over unauthorized parking, blocked driveways, or misuse of shared parking spaces causing inconvenience.",
    tags: ["Blocked Driveways", "Unauthorized Parking", "Shared Space Misuse"],
    reverse: true,
  },
  {
    num: "03",
    title: "Privacy & Safety Issues",
    img: "/assets/images/ND-3.png",
    alt: "Privacy & Safety Issues",
    desc: "Privacy and safety concerns when neighbors interfere with personal space, security, or violate boundaries unlawfully.",
    tags: ["Boundary Violations", "Surveillance Concerns", "Security Threats"],
  },
  {
    num: "04",
    title: "Maintenance Issues",
    img: "/assets/images/ND-4.png",
    alt: "Maintenance Issues",
    desc: "Maintenance issues arise when there are disagreements over property upkeep, shared facilities, or structural responsibilities.",
    tags: ["Property Upkeep", "Shared Facilities", "Structural Disputes"],
    reverse: true,
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
    q: "Can I bring my lawyer to the session?",
    a: "Yes, you may have legal representation during mediation sessions. Our platform supports both self-represented and legally assisted participants for a fair and balanced process.",
  },
  {
    q: "What happens if the other party refuses to participate?",
    a: "If the other party declines to participate, we guide you on available legal options and next steps to effectively protect your rights and interests.",
  },
  {
    q: "How long does the average case take?",
    a: "Most neighbor and community disputes are resolved within a few days to a few weeks, depending on the complexity of the issue and the willingness of both parties to engage constructively.",
  },
];

const testimonials = [
  {
    name: "Resident, Pune",
    img: "/assets/images/t3.png",
    text: "The platform helped us resolve a long-standing noise complaint without any court involvement. Very professional and smooth.",
  },
  {
    name: "Client, Mumbai",
    img: "/assets/images/t4.png",
    text: "Our parking dispute was resolved quickly and fairly. I was impressed by how neutral and efficient the mediators were.",
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
    text: "Efficient and stress-free. I was able to resolve my dispute without stepping into a court.",
  },
];

export default function NeighborDispute() {
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

      <div className="nd-page">

        {/* ══ HERO ══ */}
        <section ref={heroRef} className={`nd-hero${heroVisible ? " hero-animate" : ""}`}>
          <div className="nd-hero-cl1" aria-hidden="true" />
          <div className="nd-hero-cl2" aria-hidden="true" />
          <div className="nd-hero-cr1" aria-hidden="true" />
          <div className="nd-hero-cr2" aria-hidden="true" />

          <div className="nd-hero-card">
            <div className="nd-hero-badge">WE HANDLE EVERY DISPUTE PROFESSIONALLY</div>
            <h1 className="nd-hero-title">Neighbor &amp; Community Dispute Resolution</h1>
            <p className="nd-hero-sub">
              With a track record of successfully resolving a wide range of legal issues,
              we&apos;re committed to protecting your interests and helping you achieve peace of mind.
            </p>
            <div className="nd-hero-btns">
              <button className="nd-hero-btn-primary" onClick={() => navigateToApp("/user/file-new-case/step1")}>File a Case</button>
              <button className="nd-hero-btn-secondary" onClick={() => navigateToApp("/user/file-new-case/step1")}>Learn More</button>
            </div>
          </div>
        </section>

        {/* ══ WHAT IS PRIVATE NUISANCE ══ */}
        <section ref={whatRef} className={`nd-what${whatVisible ? " what-animate" : ""}`}>
          <div className="nd-container nd-what-grid">
            <div className="nd-what-left">
              <p className="nd-eyebrow nd-eyebrow-left">INDIVIDUAL DISPUTES</p>
              <h2 className="nd-section-title nd-left">What Is Private Nuisance</h2>
              <p className="nd-what-text">
                Private nuisance refers to disturbances or interferences caused by one individual that disrupts
                another&apos;s use, comfort, or enjoyment of their property. These issues commonly arise between
                neighbouring properties due to noise, lighting conflicts, waste management difficulties, and more.
              </p>
              <p className="nd-what-text">
                RaaziMarzi helps resolve such disputes through online mediation, providing a confidential,
                structured, and legally sound environment to settle issues without lengthy court procedures.
              </p>
              <button className="nd-btn-primary nd-btn-sm" onClick={() => navigateToApp("/user/file-new-case/step1")}>
                File a Case
              </button>
            </div>
            <div className="nd-what-right">
              <div className="nd-what-img-wrap">
                <img src="/assets/images/ND-private.png" alt="Private Nuisance" className="nd-what-img" />
              </div>
            </div>
          </div>
        </section>

        {/* ══ CAUSES OF PRIVATE NUISANCE ══ */}
        <section ref={causesRef} className={`nd-causes${causesVisible ? " causes-animate" : ""}`}>
          <div className="nd-container nd-causes-grid">
            <div className="nd-causes-left">
              <p className="nd-eyebrow nd-eyebrow-left">WHAT ARE THE CAUSES</p>
              <h2 className="nd-section-title nd-left">Causes of Private Nuisance</h2>
            </div>
            <div className="nd-causes-cards">
              {[
                { title: "Lack of Communication", desc: "Poor or absent communication between neighbours leads to misunderstandings that escalate into ongoing disputes." },
                { title: "Unclear Rules & Agreements", desc: "Absence of clear shared agreements on noise, parking, or property use creates repeated conflicts between residents." },
                { title: "Negligence & Irresponsible Behavior", desc: "Careless actions like littering, property damage, or ignoring safety risks often trigger formal complaints." },
                { title: "Shared Living Conditions", desc: "Living in close proximity — apartments, societies, or gated communities — naturally increases friction without proper dispute mechanisms." },
              ].map((c, i) => (
                <div key={i} className={`nd-cause-card causes-card-${i + 1}`}>
                  <div className="nd-cause-dot" />
                  <h4>{c.title}</h4>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ TYPES OF PRIVATE NUISANCE ══ */}
        <section ref={typesRef} className={`nd-types${typesVisible ? " types-animate" : ""}`}>
          <div className="nd-container">
            <p className="nd-eyebrow">INDIVIDUAL DISPUTES</p>
            <h2 className="nd-section-title">Types of Private Nuisance</h2>
            <p className="nd-section-sub">
              Addressing common Private Nuisance issues so that they can get resolved in a fast and secure manner.
            </p>
            <div className="nd-types-list">
              {disputeTypes.map((item, i) => (
                <div key={i} className={`nd-type-row${item.reverse ? " nd-type-row-rev" : ""} type-row-${i + 1}`}>
                  <div className="nd-type-num-col">
                    <span className="nd-type-num">{item.num}</span>
                  </div>
                  <div className="nd-type-content">
                    <h3 className="nd-type-title">{item.title}</h3>
                    <p className="nd-type-desc">{item.desc}</p>
                    <ul className="nd-type-tags">
                      {item.tags.map((t, ti) => (
                        <li key={ti}><span className="nd-tag-dot" />{t}</li>
                      ))}
                    </ul>
                    <button className="nd-btn-outline" onClick={() => navigateToApp("/user/file-new-case/step1")}>
                      Learn More
                    </button>
                  </div>
                  <div className="nd-type-img-col">
                    <div className="nd-type-img-wrap">
                      <img src={item.img} alt={item.alt} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW TO RESOLVE CONFLICTS WITH NEIGHBORS ══ */}
        <section ref={resolveRef} className={`nd-resolve${resolveVisible ? " resolve-animate" : ""}`}>
          <div className="nd-container">
            <p className="nd-eyebrow">INDIVIDUAL DISPUTES</p>
            <h2 className="nd-section-title">How to Resolve Conflicts with Neighbors</h2>
            <p className="nd-section-sub">
              Follow a simple and structured approach to handle neighbor disputes
              peacefully and reach a fair resolution.
            </p>
            <div className="nd-resolve-grid">
              <div className="nd-resolve-card resolve-card-1">
                <h4 className="nd-resolve-card-title">Stay Calm &amp; Be Willing to Talk</h4>
                <ul className="nd-resolve-list">
                  {resolveTips[0].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="nd-resolve-img-wrap">
                  <img src={resolveTips[0].img} alt="Stay Calm" />
                </div>
              </div>
              <div className="nd-resolve-card resolve-card-2">
                <h4 className="nd-resolve-card-title">Listen &amp; Communicate Clearly</h4>
                <ul className="nd-resolve-list">
                  {resolveTips[1].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="nd-resolve-img-wrap">
                  <img src={resolveTips[1].img} alt="Listen and Communicate" />
                </div>
              </div>
              <div className="nd-resolve-card resolve-card-3">
                <h4 className="nd-resolve-card-title">Set Clear Agreements</h4>
                <ul className="nd-resolve-list">
                  {resolveTips[2].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="nd-resolve-img-wrap">
                  <img src={resolveTips[2].img} alt="Set Clear Agreements" />
                </div>
              </div>
              <div className="nd-resolve-card resolve-card-4">
                <h4 className="nd-resolve-card-title">Work Together to Find a Solution</h4>
                <ul className="nd-resolve-list">
                  {resolveTips[3].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="nd-resolve-img-wrap">
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
            <p className="svc-section-sub">See how neighbors are resolving disputes quickly and securely with our platform.</p>
            <div className="svc-testimonial-top-avatars">
              {slots.map((offset) => {
                const idx = getSlot(offset);
                const isCenter = offset === 0;
                const isNear = Math.abs(offset) === 1;
                const cls = isCenter ? "svc-floating-avatar active" : isNear ? "svc-floating-avatar svc-av-near" : "svc-floating-avatar svc-av-far";
                return (
                  <button key={offset} className={cls} onClick={() => setTestimonialIdx(idx)} aria-label={`View testimonial from ${testimonials[idx].name}`} aria-pressed={isCenter}>
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
