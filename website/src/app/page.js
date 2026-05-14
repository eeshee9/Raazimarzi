"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { APP_BASE_PATH } from "@/config/appConfig";
import "@/styles/home.css";

export default function HomePage() {
  const [animate, setAnimate] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [whyVisible, setWhyVisible] = useState(false);
  const [expertiseState, setExpertiseState] = useState("stacked");

  const whyRef = useRef(null);
  const expertiseRef = useRef(null);

  useEffect(() => { setAnimate(true); }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setWhyVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    if (whyRef.current) observer.observe(whyRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setExpertiseState("spread"); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    if (expertiseRef.current) observer.observe(expertiseRef.current);
    return () => observer.disconnect();
  }, []);

  const navigateToApp = useCallback((path = "/login", queryParams = {}) => {
    try {
      const searchParams = new URLSearchParams(queryParams);
      const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
      window.location.href = `${APP_BASE_PATH}${path}${query}`;
    } catch (error) {
      console.error("Navigation error:", error);
      window.location.href = `${APP_BASE_PATH}/login`;
    }
  }, []);

  const toggleFaq = (index) => setOpenFaqIndex(openFaqIndex === index ? null : index);

  const getIndex = (offset) => {
    const len = TESTIMONIALS.length;
    return ((activeTestimonial + offset) % len + len) % len;
  };
  const prevT = () => setActiveTestimonial(p => (p === 0 ? TESTIMONIALS.length - 1 : p - 1));
  const nextT = () => setActiveTestimonial(p => (p === TESTIMONIALS.length - 1 ? 0 : p + 1));
  const slots = [-2, -1, 0, 1, 2];

  const faqData = [
    { q: "Is my privacy protected during the process?", a: "Yes, absolutely. All discussions are kept strictly confidential and cannot be used in court of law. This allows both parties to speak freely without fear of legal prejudice." },
    { q: "Can I bring my own lawyer to the session?", a: "Yes, you are welcome to bring legal representation to any mediation or arbitration session. Having a lawyer can help ensure your rights and interests are properly represented." },
    { q: "What happens if the other party refuses to join?", a: "If the other party declines to participate, we will guide you through alternative legal options and next steps available to protect your rights and resolve the matter." },
    { q: "How long does the average case take?", a: "Most commercial disputes are resolved within 2–6 weeks, depending on the complexity of the matter and the willingness of both parties to engage in good faith." },
  ];

  const whyIcons = [
    { src: "/assets/icons/fastresol.png", label: "Fast Resolution" },
    { src: "/assets/icons/legallycom.png", label: "Legally Compliant" },
    { src: "/assets/icons/s&c.png", label: "Secure & Confidential" },
    { src: "/assets/icons/neutralexp.png", label: "Neutral Experts" },
    { src: "/assets/icons/247.png", label: "24/7 Access" },
  ];

  return (
    <>
      <Header />

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="hero-wrapper">
        <svg className="hero-connectors" aria-hidden="true" viewBox="0 0 1440 820" preserveAspectRatio="none">
          <path d="M 296 195 C 420 195, 520 290, 620 340" fill="none" stroke="rgba(119,138,255,0.45)" strokeWidth="1.8" strokeDasharray="8 6" strokeLinecap="round" />
          <path d="M 296 415 C 390 415, 500 390, 610 375" fill="none" stroke="rgba(119,138,255,0.45)" strokeWidth="1.8" strokeDasharray="8 6" strokeLinecap="round" />
          <path d="M 1144 195 C 1020 195, 920 290, 820 340" fill="none" stroke="rgba(119,138,255,0.45)" strokeWidth="1.8" strokeDasharray="8 6" strokeLinecap="round" />
          <path d="M 1144 415 C 1050 415, 940 390, 830 375" fill="none" stroke="rgba(119,138,255,0.45)" strokeWidth="1.8" strokeDasharray="8 6" strokeLinecap="round" />
        </svg>

        <div className="hero-cards">
          <div className="hero-card hero-card-1">
            <div className="hero-card-top">
              <div className="hero-card-icon"><img src="/assets/icons/home-i1.png" alt="" /></div>
              <div className="hero-card-text"><strong>Family Disputes</strong><span>Resolve conflicts<br />with understanding</span></div>
            </div>
            <div className="hero-card-arrow">→</div>
          </div>
          <div className="hero-card hero-card-2">
            <div className="hero-card-top">
              <div className="hero-card-icon"><img src="/assets/icons/home-i2.png" alt="" /></div>
              <div className="hero-card-text"><strong>Individual Disputes</strong><span>Fair solutions for<br />peace of mind</span></div>
            </div>
            <div className="hero-card-arrow">→</div>
          </div>
          <div className="hero-card hero-card-3">
            <div className="hero-card-top">
              <div className="hero-card-icon"><img src="/assets/icons/home-i3.png" alt="" /></div>
              <div className="hero-card-text"><strong>Consumer Disputes</strong><span>Your rights.<br />Our priority.</span></div>
            </div>
            <div className="hero-card-arrow">→</div>
          </div>
          <div className="hero-card hero-card-4">
            <div className="hero-card-top">
              <div className="hero-card-icon"><img src="/assets/icons/home-i4.png" alt="" /></div>
              <div className="hero-card-text"><strong>Commercial Disputes</strong><span>Helping businesses<br />move forward</span></div>
            </div>
            <div className="hero-card-arrow">→</div>
          </div>
        </div>

        <div className="hero-content">
          <span className="hero-badge">🛡️ India's Trusted Online Dispute Resolution Platform</span>
          <h1 className="hero-title">Alternative Dispute<br /><span className="blue">Resolution</span></h1>
          <p className="hero-desc">Fast, affordable and confidential mediation for personal, consumer and commercial disputes</p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigateToApp("/user/file-new-case/step1")}>File a Case →</button>
            <button className="btn-dark" onClick={() => navigateToApp("/user/chats")}>How It Works 👁</button>
          </div>
        </div>

       </section>

      {/* ══════════════════════════════════════════════
          STATUE
      ══════════════════════════════════════════════ */}
      <section className="statue-section">
        <span className={`raazi ${animate ? "show" : ""}`} aria-hidden="true">RAAZI</span>
        <img src="/assets/images/statue.png" className={`statue ${animate ? "drop" : ""}`} alt="Justice statue" />
        <span className={`marzi ${animate ? "show" : ""}`} aria-hidden="true">MARZI</span>
      </section>

      {/* ══════════════════════════════════════════════
          WHY CHOOSE US
      ══════════════════════════════════════════════ */}
      <section ref={whyRef} className={`why-section${whyVisible ? " why-animate" : ""}`}>
        <div className="why-inner">
          <div className="why-header">
            <p className="why-eyebrow">WHY CHOOSE US</p>
            <h2 className="why-title">Why Choose RaaziMarzi</h2>
            <p className="why-sub">A faster, secure, and reliable way to resolve disputes without lengthy court procedures.</p>
          </div>
          <div className="why-grid">
            {whyIcons.map((item, i) => (
              <div key={i} className="why-card">
                <div className="why-circle"><img src={item.src} alt={item.label} /></div>
                <h4 className="why-label">{item.label}</h4>
                <p className="why-desc">Resolve business, customer, or personal conflicts through a secure platform.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════ */}
      <section className="hiw-section">
        <div className="hiw-header">
          <p className="hiw-eyebrow">3 SIMPLE STEPS</p>
          <h2 className="hiw-title">How It Works</h2>
          <p className="hiw-sub">A simple and secure process to resolve disputes online.</p>
        </div>
        <div className="hiw-stage">
          <svg className="hiw-wave" viewBox="0 0 1440 260" preserveAspectRatio="none">
            <path className="hiw-wave-shadow" d="M0,160 C200,260 300,260 500,160 C700,60 800,60 1000,160 C1200,260 1300,260 1440,160" />
            <path className="hiw-wave-dotted" d="M0,160 C200,260 300,260 500,160 C700,60 800,60 1000,160 C1200,260 1300,260 1440,160" />
          </svg>
          <div className="hiw-dot hiw-dot-1"><img src="/assets/icons/1.png" alt="" /></div>
          <div className="hiw-dot hiw-dot-2"><img src="/assets/icons/2.png" alt="" /></div>
          <div className="hiw-dot hiw-dot-3"><img src="/assets/icons/3.png" alt="" /></div>
          <div className="hiw-step hiw-step-1">
            <div className="hiw-ghost">1</div>
            <h4>Submit Your Case</h4>
            <p>Provide your dispute details and upload necessary documents securely.</p>
          </div>
          <div className="hiw-step hiw-step-2">
            <div className="hiw-ghost">2</div>
            <h4>Mediation &amp; Discussion</h4>
            <p>The other party is notified and a mediator facilitates discussion between both sides.</p>
          </div>
          <div className="hiw-step hiw-step-3">
            <div className="hiw-ghost">3</div>
            <h4>Resolution</h4>
            <p>Reach a fair agreement or get a final decision through arbitration.</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          OUR LEGAL EXPERTISE
      ══════════════════════════════════════════════ */}
      <section ref={expertiseRef} className={`svc-expertise exp-${expertiseState}`}>
        <div className="svc-container">
          <div className="exp-header">
            <p className="svc-eyebrow">SPECIALIZED AREAS</p>
            <h2 className="svc-section-title">Our Legal Expertise</h2>
            <p className="svc-section-sub">Providing specialized ODR solutions across diverse sectors to ensure comprehensive legal support.</p>
          </div>
          <div className="exp-deck">
            <div className="svc-expertise-card exp-card exp-card-1">
              <Link href="/Services/Property&RentalDisputes" className="svc-arrow-link" aria-label="Explore Individual Disputes">
                <img src="/assets/icons/ar.png" alt="" aria-hidden="true" />
              </Link>
              <div className="svc-expertise-icon"><img src="/assets/icons/sa-icon1.png" alt="" aria-hidden="true" /></div>
              <h3 className="svc-card-title">Individual Disputes</h3>
              <p className="svc-card-desc">Resolve personal disputes related to property, family matters, rental issues, and financial conflicts through secure online mediation.</p>
              <ul className="svc-card-list">
                <li>Property &amp; Rental Disputes</li>
                <li>Family Disputes</li>
                <li>Personal Loan &amp; Borrowing</li>
                <li>Construction Issues</li>
              </ul>
              <Link href="/Services/Property&RentalDisputes" className="svc-explore-link">EXPLORE DISPUTES &#8594;</Link>
            </div>

            <div className="svc-expertise-card exp-card exp-card-2">
              <Link href="/Services/ConsumerDisputes" className="svc-arrow-link" aria-label="Explore Consumer Disputes">
                <img src="/assets/icons/ar.png" alt="" aria-hidden="true" />
              </Link>
              <div className="svc-expertise-icon"><img src="/assets/icons/sa-icon2.png" alt="" aria-hidden="true" /></div>
              <h3 className="svc-card-title">Consumer Disputes</h3>
              <p className="svc-card-desc">Resolve issues related to defective products, poor services, delivery problems, and refund disputes quickly and efficiently.</p>
              <ul className="svc-card-list">
                <li>Product Complaints</li>
                <li>Service Complaints</li>
                <li>Delivery Issues</li>
                <li>Refunds &amp; Billing Disputes</li>
              </ul>
              <Link href="/Services/ConsumerDisputes" className="svc-explore-link">EXPLORE DISPUTES &#8594;</Link>
            </div>

            <div className="svc-expertise-card exp-card exp-card-3">
              <Link href="/Services/ContractDisputes" className="svc-arrow-link" aria-label="Explore Commercial Disputes">
                <img src="/assets/icons/ar.png" alt="" aria-hidden="true" />
              </Link>
              <div className="svc-expertise-icon"><img src="/assets/icons/sa-icon3.png" alt="" aria-hidden="true" /></div>
              <h3 className="svc-card-title">Commercial Disputes</h3>
              <p className="svc-card-desc">Address business conflicts including contract disputes, payment recovery, partnership issues, and vendor disputes.</p>
              <ul className="svc-card-list">
                <li>Contract Disputes</li>
                <li>Partnership Disputes</li>
                <li>Employment Disputes</li>
                <li>Vendor &amp; Supplier Disputes</li>
              </ul>
              <Link href="/Services/ContractDisputes" className="svc-explore-link">EXPLORE DISPUTES &#8594;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PLATFORM CAPABILITIES
      ══════════════════════════════════════════════ */}
      <section className="resolve-section">
        <p className="resolve-eyebrow">PLATFORM CAPABILITIES</p>
        <h2 className="resolve-title">Everything You Need to Resolve Disputes</h2>
        <p className="resolve-sub">From case tracking to mediation. The help you need, you can seamlessly in a secure platform.</p>
        <div className="resolve-diagram">
          <img src="/assets/images/resolve.png" alt="Platform capabilities diagram" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════ */}
      <section className="testimonials-section">
        <div className="testi-container">
          <span className="testi-eyebrow">TESTIMONIALS</span>
          <h2 className="testi-title">What Our Clients Say?</h2>
          <p className="testi-sub">See how people are resolving disputes quickly and securely with our platform.</p>
          <div className="testi-avatars">
            {slots.map((offset) => {
              const idx = getIndex(offset);
              const isCenter = offset === 0;
              const isNear = Math.abs(offset) === 1;
              const cls = isCenter ? "testi-avatar av-active" : isNear ? "testi-avatar av-near" : "testi-avatar av-far";
              return (
                <button key={offset} className={cls} onClick={() => setActiveTestimonial(idx)} aria-label={`View testimonial from ${TESTIMONIALS[idx].name}`} aria-pressed={isCenter}>
                  <img src={TESTIMONIALS[idx].img} alt={TESTIMONIALS[idx].name} />
                </button>
              );
            })}
          </div>
          <div className="testi-wrap">
            <button className="testi-arrow" onClick={prevT} aria-label="Previous testimonial">&#8249;</button>
            <div className="testi-card" key={activeTestimonial}>
              <h4 className="testi-name">{TESTIMONIALS[activeTestimonial].name}</h4>
              <div className="testi-stars">★★★★★</div>
              <p className="testi-text">&ldquo;{TESTIMONIALS[activeTestimonial].text}&rdquo;</p>
            </div>
            <button className="testi-arrow" onClick={nextT} aria-label="Next testimonial">&#8250;</button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════ */}
      <section className="svc-faq">
        <div className="svc-container">
          <p className="svc-eyebrow">FAQS</p>
          <h2 className="svc-section-title">Frequently Asked Questions</h2>
          <p className="svc-section-sub">Find answers to common questions about online dispute resolution process.</p>
          <div className="svc-faq-list">
            {faqData.map((faq, i) => (
              <div key={i} className="svc-faq-box">
                <button className="svc-faq-item" onClick={() => toggleFaq(i)} aria-expanded={openFaqIndex === i}>
                  <span>{faq.q}</span>
                  <span className="svc-faq-toggle">{openFaqIndex === i ? "−" : "+"}</span>
                </button>
                {openFaqIndex === i && <div className="svc-faq-answer">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CTA
      ══════════════════════════════════════════════ */}
      <section className="cd-cta">
        <div className="cd-cta-overlay">
          <div className="cd-cta-inner">
            <h2 className="cd-cta-title">Ready to find a peaceful resolution?</h2>
            <p className="cd-cta-text">Join thousands of individuals who have resolved their disputes with dignity and legal certainty.</p>
            <button className="cd-cta-btn" onClick={() => window.location.href = "/user/file-new-case/step1"}>File a Case</button>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

const TESTIMONIALS = [
  { name: "Riya Sharma, Mumbai", img: "/assets/images/t1.png", stars: 5, text: "RaaziMarzi helped me resolve a defective product complaint quickly. The entire process was smooth and the mediator was very professional." },
  { name: "Amit Verma, Delhi", img: "/assets/images/t2.png", stars: 5, text: "I had a billing dispute with an online retailer for months. RaaziMarzi resolved it in just 2 sessions. Highly recommend!" },
  { name: "Priya Nair, Bangalore", img: "/assets/images/t3.png", stars: 5, text: "The platform made it easy to handle a delivery issue with a vendor. Everything was managed online without any hassle." },
  { name: "Suresh Kumar, Chennai", img: "/assets/images/t4.png", stars: 5, text: "Professional, fast, and legally sound. RaaziMarzi gave me confidence that my consumer rights were being protected." },
  { name: "Tenant, Hyderabad", img: "/assets/images/t5.png", stars: 5, text: "This platform made it easy to handle a payment dispute with a client. The mediation process was smooth, and everything was managed online without any hassle." },
];