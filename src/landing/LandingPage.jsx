import { useState } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { heroItemVariants, viewportRevealVariants, staggerContainerVariants, listItemVariants } from '../lib/motion';
import BrandLogo from '../components/BrandLogo';
import './LandingPage.css';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const faqs = [
    {
      q: "What is HireTrack?",
      a: "HireTrack helps you keep your job search in one place: browse campus placement openings, track your applications and interviews, and get AI help that already knows your resume."
    },
    {
      q: "How does placement opening discovery work?",
      a: "Your placement cell posts openings in HireTrack. Browse eligibility, stipend and deadline, then choose 'Track in HireTrack' to start an application with the details filled in."
    },
    {
      q: "Is HireTrack free?",
      a: "Yes, HireTrack is free to use."
    },
    {
      q: "How does the AI assistant help me?",
      a: "The assistant uses your saved resume, experience, job descriptions and interview notes to help you prepare, check your fit for a role and plan follow-ups, so you never re-upload anything. Your messages and the context they need are sent to an AI provider to generate each reply."
    },
    {
      q: "Are my applications private?",
      a: "Yes. Only you can see your applications, interviews and resume. Other students and placement admins cannot see them."
    }
  ];

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <header className="landing-nav">
        <div className="landing-nav__container">
          <button type="button" className="landing-brand" onClick={scrollToTop} aria-label="HireTrack Home">
            <BrandLogo size="md" />
          </button>

          <nav className="landing-nav__links">
            <button type="button" className="landing-nav__link-btn" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" className="landing-nav__link-btn" onClick={() => scrollToSection('how-it-works')}>How it works</button>
            <button type="button" className="landing-nav__link-btn" onClick={() => scrollToSection('faq')}>FAQ</button>
          </nav>

          <div className="landing-nav__actions">
            <Link to="/login" className="landing-btn landing-btn--ghost">Sign in</Link>
            <Link to="/register" className="landing-btn landing-btn--primary">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero__container">
          <m.div
            className="landing-badge"
            custom={0}
            variants={heroItemVariants}
            initial="hidden"
            animate="visible"
          >
            Placement & application tracker
          </m.div>

          <m.h1
            className="landing-hero__title"
            custom={1}
            variants={heroItemVariants}
            initial="hidden"
            animate="visible"
          >
            Your job search, organized, from first opening to final offer.
          </m.h1>

          <m.p
            className="landing-hero__subtitle"
            custom={2}
            variants={heroItemVariants}
            initial="hidden"
            animate="visible"
          >
            Track applications and interviews, discover campus placement openings, and get AI help that already knows your resume, all in one calm workspace.
          </m.p>

          <m.div
            className="landing-hero__ctas"
            custom={3}
            variants={heroItemVariants}
            initial="hidden"
            animate="visible"
          >
            <Link to="/register" className="landing-btn landing-btn--hero">
              Get started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link to="/login" className="landing-btn landing-btn--secondary">
              Sign in
            </Link>
          </m.div>

          {/* Interactive UI Showcase Card */}
          <m.div
            className="landing-hero__preview"
            custom={4}
            variants={heroItemVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="preview-window">
              <div className="preview-window__bar">
                <span className="preview-dot red"></span>
                <span className="preview-dot yellow"></span>
                <span className="preview-dot green"></span>
                <span className="preview-title">HireTrack — Placement & application workspace</span>
              </div>
              <div className="preview-content">
                <div className="preview-stats">
                  <div className="preview-stat">
                    <span className="stat-label">Active applications</span>
                    <span className="stat-val">12</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-label">Interviews this week</span>
                    <span className="stat-val">3</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-label">Placement openings</span>
                    <span className="stat-val">8</span>
                  </div>
                </div>

                <div className="preview-tickets">
                  <div className="preview-ticket">
                    <div className="ticket-left">
                      <span className="company">Acme Corp</span>
                      <span className="role">Software Engineer • Bengaluru (Hybrid)</span>
                    </div>
                    <div className="ticket-dates">Oct 5 → Nov 2</div>
                    <span className="badge badge-interview">INTERVIEW</span>
                  </div>
                  <div className="preview-ticket">
                    <div className="ticket-left">
                      <span className="company">Google</span>
                      <span className="role">Frontend Engineer • Remote</span>
                    </div>
                    <div className="ticket-dates">Sep 28 → Oct 12</div>
                    <span className="badge badge-applied">APPLIED</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="preview-caption">Sample data</div>
          </m.div>
        </div>
      </section>

      {/* Problem Section */}
      <m.section
        className="landing-problem"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={viewportRevealVariants}
      >
        <div className="landing-container">
          <h2 className="landing-section__title">Placement season gets messy fast</h2>
          <p className="landing-section__subtitle">
            Tracking applications across messy spreadsheets, emails, and sticky notes leads to missed follow-ups and lost opportunities.
          </p>

          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
                </svg>
              </div>
              <h3>Spreadsheet overload</h3>
              <p>Cluttered tables make it hard to see which roles are progressing and where you stand.</p>
            </div>

            <div className="problem-card">
              <div className="problem-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3>Missed follow-ups</h3>
              <p>Follow-up dates and interview rounds slip past when they are scattered across places.</p>
            </div>

            <div className="problem-card">
              <div className="problem-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                </svg>
              </div>
              <h3>Fragmented prep</h3>
              <p>Re-copying job descriptions and resumes for every interview prep session wastes valuable time.</p>
            </div>
          </div>
        </div>
      </m.section>

      {/* Core Features */}
      <m.section
        id="features"
        className="landing-features"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={viewportRevealVariants}
      >
        <div className="landing-container">
          <h2 className="landing-section__title">Core capabilities</h2>
          <p className="landing-section__subtitle">
            Everything you need to discover placement opportunities and manage your job search efficiently.
          </p>

          <m.div
            className="features-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainerVariants}
          >
            <m.div className="feature-card" variants={listItemVariants}>
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                  <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                  <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                  <path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>
                </svg>
              </div>
              <h3>Campus placement discovery</h3>
              <p>Browse openings from your placement cell with eligibility, package and deadline, and pre-fill an application in one click.</p>
            </m.div>

            <m.div className="feature-card" variants={listItemVariants}>
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="7" rx="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <h3>Application tracking</h3>
              <p>See every application and its status at a glance, from Applied to Offer.</p>
            </m.div>

            <m.div className="feature-card" variants={listItemVariants}>
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              <h3>Interview timeline</h3>
              <p>Log each round with date, type, notes and outcome, and see upcoming and past interviews in one place.</p>
            </m.div>

            <m.div className="feature-card" variants={listItemVariants}>
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                </svg>
              </div>
              <h3>AI assistant</h3>
              <p>Ask about a specific application. It uses your saved resume, experience and the job description to prepare you and check your fit.</p>
            </m.div>
          </m.div>
        </div>
      </m.section>

      {/* How It Works */}
      <m.section
        id="how-it-works"
        className="landing-workflow"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={viewportRevealVariants}
      >
        <div className="landing-container">
          <h2 className="landing-section__title">How HireTrack works</h2>

          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="step-num">01</div>
              <h3>Discover or add</h3>
              <p>Browse openings from your placement cell or add an application directly. Pre-fill company details, job role, and job description.</p>
            </div>
            <div className="workflow-step">
              <div className="step-num">02</div>
              <h3>Track progress</h3>
              <p>Update applications as they move through interview rounds, record notes, and keep track of key dates.</p>
            </div>
            <div className="workflow-step">
              <div className="step-num">03</div>
              <h3>Prepare with AI</h3>
              <p>Use the AI assistant to review interview notes, prepare for upcoming rounds, and check your fit for a role.</p>
            </div>
          </div>
        </div>
      </m.section>

      {/* FAQ Section */}
      <m.section
        id="faq"
        className="landing-faq"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={viewportRevealVariants}
      >
        <div className="landing-container">
          <h2 className="landing-section__title">Frequently asked questions</h2>

          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className={`faq-item ${openFaq === idx ? 'faq-item--open' : ''}`}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFaq(idx)}
                >
                  <span>{faq.q}</span>
                  <span className="faq-icon">{openFaq === idx ? '−' : '+'}</span>
                </button>
                {openFaq === idx && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </m.section>

      {/* Final CTA */}
      <m.section
        className="landing-cta-wrapper"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={viewportRevealVariants}
      >
        <div className="landing-container">
          <div className="landing-cta">
            <h2>Bring your whole job search into one place.</h2>
            <p>Get started with HireTrack today and keep your search focused.</p>
            <Link to="/register" className="landing-btn landing-btn--hero">
              Get started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </m.section>

      {/* Product-Only Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__container">
          <div className="landing-footer__grid">
            <div className="footer-col footer-col--brand">
              <div className="footer-brand">
                <BrandLogo size="md" />
              </div>
              <p className="footer-tagline">Your job search, organized.</p>
            </div>

            <div className="footer-col">
              <h4 className="footer-col__title">Product</h4>
              <ul className="footer-col__links">
                <li><button type="button" className="footer-link" onClick={() => scrollToSection('features')}>Features</button></li>
                <li><button type="button" className="footer-link" onClick={() => scrollToSection('how-it-works')}>How it works</button></li>
                <li><button type="button" className="footer-link" onClick={() => scrollToSection('faq')}>FAQ</button></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col__title">Account</h4>
              <ul className="footer-col__links">
                <li><Link to="/login" className="footer-link">Sign in</Link></li>
                <li><Link to="/register" className="footer-link">Get started</Link></li>
              </ul>
            </div>
          </div>

          <div className="landing-footer__bottom">
            <p>© 2026 HireTrack</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
