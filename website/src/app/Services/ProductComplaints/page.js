"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { APP_BASE_PATH } from "@/config/appConfig";
import "@/styles/productComplaint.css";


/* ── Data ── */
const disputeTypes = [
  {
    num: "01",
    title: "Defective Product Complaint",
    img: "/assets/images/pod-1.png",
    alt: "Defective Product Complaint",
    desc: "Defective product complaints arise when a product does not function as expected or has faults in its usability. These issues may occur due to manufacturing defects, poor quality materials.",
    tags: ["Product not working properly", "Physical damage to components", "Short product lifespan or failure"],
  },
  {
    num: "02",
    title: "Warranty Disputes",
    img: "/assets/images/pod-2.png",
    alt: "Warranty Disputes",
    desc: "Warranty disputes arise when a company/seller refuses or mismanages warranty claims involving repairs, replacements, or refunds. These issues may often occur due to unclear warranty terms, denial of service.",
    tags: ["Denial of warranty claim", "Terms of service violations", "Refusal to repair or replace"],
    reverse: true,
  },
  {
    num: "03",
    title: "Product Not as Described",
    img: "/assets/images/pod-3.png",
    alt: "Product Not as Described",
    desc: "Product not as described complaints arise when the delivered item does not match the listed description, specifications, or images. These issues may occur due to inaccurate product listings.",
    tags: ["Mismatch in product images", "Missing features or functions", "Lower quality than advertised"],
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
    a: "If the other party declines to participate, we guide you on available legal options and next steps to effectively protect your rights and interests as a consumer.",
  },
  {
    q: "How long does the average case take?",
    a: "Most product complaint disputes are resolved within a few days to a few weeks, depending on the complexity of the issue and the willingness of both parties to engage constructively.",
  },
];

const testimonials = [
  {
    name: "Resident, Pune",
    img: "/assets/images/t3.png",
    text: "The platform helped us resolve a defective product complaint quickly and fairly without any court involvement.",
  },
  {
    name: "Client, Mumbai",
    img: "/assets/images/t4.png",
    text: "My warranty dispute was resolved efficiently. I was impressed by how neutral and professional the mediators were.",
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
    text: "Efficient and stress-free. I was able to resolve my product complaint without stepping into a court.",
  },
];

export default function ProductComplaint() {
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

      <div className="pc-page">

        {/* ══ HERO ══ */}
        <section ref={heroRef} className={`pc-hero${heroVisible ? " hero-animate" : ""}`}>
          <div className="pc-hero-cl1" aria-hidden="true" />
          <div className="pc-hero-cl2" aria-hidden="true" />
          <div className="pc-hero-cr1" aria-hidden="true" />
          <div className="pc-hero-cr2" aria-hidden="true" />

          <div className="pc-hero-card">
            <div className="pc-hero-badge">WE HANDLE EVERY DISPUTE PROFESSIONALLY</div>
            <h1 className="pc-hero-title">Defective Product Complaint Resolution</h1>
            <p className="pc-hero-sub">
              With a track record of successfully resolving a wide range of legal issues,
              we&apos;re committed to protecting your interests and helping you achieve peace of mind.
            </p>
            <div className="pc-hero-btns">
              <button className="pc-hero-btn-primary" onClick={() => navigateToApp("/user/file-new-case/step1")}>File a Case</button>
              <button className="pc-hero-btn-secondary" onClick={() => navigateToApp("/user/file-new-case/step1")}>Learn More</button>
            </div>
          </div>
        </section>

        {/* ══ WHO CAN FILE A PRODUCT COMPLAINT ══ */}
        <section ref={whatRef} className={`pc-what${whatVisible ? " what-animate" : ""}`}>
          <div className="pc-container pc-what-grid">
            <div className="pc-what-left">
              <p className="pc-eyebrow pc-eyebrow-left">PRODUCT COMPLAINTS</p>
              <h2 className="pc-section-title pc-left">Who Can File a Product Complaint?</h2>
              <p className="pc-what-text">
                Anyone who has purchased a product and faced issues with its quality, condition, or overall
                experience can raise a complaint.
              </p>
              <p className="pc-what-text">
                This includes customers who received items that do not meet expectations, face difficulties
                after purchase, or are unable to get adequate support from the seller. RaaziMarzi provides
                an easy and secure platform to raise all disputes related to customer claims or seller fulfillment.
              </p>
              <button className="pc-btn-primary pc-btn-sm" onClick={() => navigateToApp("/user/file-new-case/step1")}>
                File a Case
              </button>
            </div>
            <div className="pc-what-right">
              <div className="pc-what-img-wrap">
                <img src="/assets/images/pod.png" alt="Product Complaint" className="pc-what-img" />
              </div>
            </div>
          </div>
        </section>

        {/* ══ CAUSES OF PRODUCT COMPLAINTS ══ */}
        <section ref={causesRef} className={`pc-causes${causesVisible ? " causes-animate" : ""}`}>
          <div className="pc-container pc-causes-grid">
            <div className="pc-causes-left">
              <p className="pc-eyebrow pc-eyebrow-left">CONSUMER DISPUTES</p>
              <h2 className="pc-section-title pc-left">Causes for Product Complaints</h2>
            </div>
            <div className="pc-causes-cards">
              {[
                { title: "Poor Quality Control", desc: "Products manufactured without proper quality checks can result in defects or low-quality products reaching customers." },
                { title: "Weak Return & Replacement Policies", desc: "Unclear or restrictive return policies make it difficult for customers to resolve issues with defective products." },
                { title: "Logistics & Handling Issues", desc: "Improper packaging or mishandling during transit can lead to product damage or missing components on delivery." },
                { title: "Misleading Product Information", desc: "Inaccurate descriptions, inflated ratings, or missing details can create a misaligned experience and lead to complaints." },
              ].map((c, i) => (
                <div key={i} className={`pc-cause-card causes-card-${i + 1}`}>
                  <div className="pc-cause-dot" />
                  <h4>{c.title}</h4>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ TYPES OF PRODUCT COMPLAINTS ══ */}
        <section ref={typesRef} className={`pc-types${typesVisible ? " types-animate" : ""}`}>
          <div className="pc-container">
            <p className="pc-eyebrow">CONSUMER DISPUTES</p>
            <h2 className="pc-section-title">Types of Product Complaints</h2>
            <p className="pc-section-sub">
              Addressing common product complaints so that they can get resolved in a fast and secure manner.
            </p>
            <div className="pc-types-list">
              {disputeTypes.map((item, i) => (
                <div key={i} className={`pc-type-row${item.reverse ? " pc-type-row-rev" : ""} type-row-${i + 1}`}>
                  <div className="pc-type-num-col">
                    <span className="pc-type-num">{item.num}</span>
                  </div>
                  <div className="pc-type-content">
                    <h3 className="pc-type-title">{item.title}</h3>
                    <p className="pc-type-desc">{item.desc}</p>
                    <ul className="pc-type-tags">
                      {item.tags.map((t, ti) => (
                        <li key={ti}><span className="pc-tag-dot" />{t}</li>
                      ))}
                    </ul>
                    <button className="pc-btn-outline" onClick={() => navigateToApp("/user/file-new-case/step1")}>
                      Learn More
                    </button>
                  </div>
                  <div className="pc-type-img-col">
                    <div className="pc-type-img-wrap">
                      <img src={item.img} alt={item.alt} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW TO RESOLVE PRODUCT COMPLAINTS ══ */}
        <section ref={resolveRef} className={`pc-resolve${resolveVisible ? " resolve-animate" : ""}`}>
          <div className="pc-container">
            <p className="pc-eyebrow">MULTILEVEL DISPUTE</p>
            <h2 className="pc-section-title">How to Resolve Product Complaints</h2>
            <p className="pc-section-sub">
              Follow a simple and structured approach to handle product complaints
              peacefully and reach a fair resolution.
            </p>
            <div className="pc-resolve-grid">
              <div className="pc-resolve-card resolve-card-1">
                <h4 className="pc-resolve-card-title">Stay Calm &amp; Be Willing to Talk</h4>
                <ul className="pc-resolve-list">
                  {resolveTips[0].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="pc-resolve-img-wrap">
                  <img src={resolveTips[0].img} alt="Stay Calm" />
                </div>
              </div>
              <div className="pc-resolve-card resolve-card-2">
                <h4 className="pc-resolve-card-title">Listen &amp; Communicate Clearly</h4>
                <ul className="pc-resolve-list">
                  {resolveTips[1].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="pc-resolve-img-wrap">
                  <img src={resolveTips[1].img} alt="Listen and Communicate" />
                </div>
              </div>
              <div className="pc-resolve-card resolve-card-3">
                <h4 className="pc-resolve-card-title">Set Clear Agreements</h4>
                <ul className="pc-resolve-list">
                  {resolveTips[2].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="pc-resolve-img-wrap">
                  <img src={resolveTips[2].img} alt="Set Clear Agreements" />
                </div>
              </div>
              <div className="pc-resolve-card resolve-card-4">
                <h4 className="pc-resolve-card-title">Work Together to Find a Solution</h4>
                <ul className="pc-resolve-list">
                  {resolveTips[3].tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <div className="pc-resolve-img-wrap">
                  <img src={resolveTips[3].img} alt="Work Together" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ══ */}
        <section ref={hiwRef} className={`pc-hiw-wrap hiw-section${hiwVisible ? " hiw-animate" : ""}`}>
          <div className="hiw-header">
            <p className="hiw-eyebrow">3 SIMPLE STEPS</p>
            <h2 className="hiw-title">Still Not Resolved? Try Product Complaint Mediation</h2>
            <p className="hiw-sub">Our mediation process is quick, confidential, and legally recognised.</p>
          </div>
          <div className="hiw-stage">
            <svg className="hiw-wave" viewBox="0 0 1200 260" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path className="hiw-wave-path" d="M-60,130 C120,260 240,260 400,130 C560,0 680,0 840,130 C1000,260 1120,260 1260,130" fill="none" stroke="#7c5cbf" strokeWidth="2.2" strokeDasharray="7 10" strokeLinecap="round" />
            </svg>
            <div className="hiw-dot hiw-dot-1" aria-hidden="true"><img src="/assets/icons/1.png" alt="" /></div>
            <div className="hiw-dot hiw-dot-2" aria-hidden="true"><img src="/assets/icons/2.png" alt="" /></div>
            <div className="hiw-dot hiw-dot-3" aria-hidden="true"><img src="/assets/icons/3.png" alt="" /></div>
            <div className="hiw-step hiw-step-1">
              <div className="hiw-ghost" aria-hidden="true">1</div>
              <h4>Submit Your Case</h4>
              <p>Provide your dispute details and upload necessary documents securely.</p>
            </div>
            <div className="hiw-step hiw-step-2">
              <div className="hiw-ghost" aria-hidden="true">2</div>
              <h4>Mediation &amp; Discussion</h4>
              <p>The other party is notified and a mediator facilitates discussion between both sides.</p>
            </div>
            <div className="hiw-step hiw-step-3">
              <div className="hiw-ghost" aria-hidden="true">3</div>
              <h4>Resolution</h4>
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
            <p className="svc-section-sub">See how consumers are resolving product disputes quickly and securely with our platform.</p>
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