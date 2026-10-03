import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './LandingPage.css';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

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
      a: "HireTrack is a placement and job search management platform. It helps students discover internally managed placement openings, track personal job applications, organize interview timelines, and receive context-aware guidance from an AI assistant."
    },
    {
      q: "How does placement opening discovery work?",
      a: "Placement administrators post verified company openings directly into HireTrack. Students can browse eligibility criteria, stipend details, and deadlines, and click 'Track in HireTrack' to instantly pre-fill an application in their personal pipeline."
    },
    {
      q: "Is HireTrack free for students?",
      a: "Yes! HireTrack is designed as a focused productivity system with zero cost for individual students and academic demo environments."
    },
    {
      q: "How does the AI Assistant help me?",
      a: "The AI assistant accesses your stored resume, job descriptions, and interview notes from MySQL to provide customized interview preparation, role fit evaluations, and follow-up strategies without needing you to re-upload files."
    },
    {
      q: "Are my applications private from other students?",
      a: "Yes. Your personal job applications, interview timelines, and resume remain completely private and isolated to your student account."
    }
  ];

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <header className="landing-nav">
        <div className="landing-nav__container">
          <button type="button" className="landing-brand" onClick={scrollToTop} aria-label="HireTrack Home">
            <span className="landing-brand__logo-mark">H</span>
            <span className="landing-brand__logo-text">HireTrack</span>
          </button>

          <nav className="landing-nav__links">
            <button type="button" className="landing-nav__link-btn" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" className="landing-nav__link-btn" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button type="button" className="landing-nav__link-btn" onClick={() => scrollToSection('faq')}>FAQ</button>
          </nav>

          <div className="landing-nav__actions">
            <Link to="/login" className="landing-btn landing-btn--ghost">Sign in</Link>
            <Link to="/register" className="landing-btn landing-btn--primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero__container">
          <div className="landing-badge">AI-POWERED PLACEMENT & APPLICATION MANAGEMENT</div>
          <h1 className="landing-hero__title">
            Streamline your job search from discovery to offer.
          </h1>
          <p className="landing-hero__subtitle">
            HireTrack unifies verified placement openings, personal application pipelines, interview timelines, and an AI career coach into one calm, organized workspace.
          </p>

          <div className="landing-hero__ctas">
            <Link to="/register" className="landing-btn landing-btn--hero">
              Get Started Free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link to="/login" className="landing-btn landing-btn--secondary">
              Sign In to Your Workspace
            </Link>
          </div>

          {/* Interactive UI Showcase Card */}
          <div className="landing-hero__preview">
            <div className="preview-window">
              <div className="preview-window__bar">
                <span className="preview-dot red"></span>
                <span className="preview-dot yellow"></span>
                <span className="preview-dot green"></span>
                <span className="preview-title">HireTrack — Placement & Application Workspace</span>
              </div>
              <div className="preview-content">
                <div className="preview-stats">
                  <div className="preview-stat">
                    <span className="stat-label">Active Applications</span>
                    <span className="stat-val">12</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-label">Upcoming Interviews</span>
                    <span className="stat-val">3</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-label">Placement Openings</span>
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
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="landing-problem">
        <div className="landing-container">
          <h2 className="landing-section__title">The Job Search Problem</h2>
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
              <h3>Spreadsheet Overload</h3>
              <p>Cluttered tables make it hard to see which roles are progressing and where you stand.</p>
            </div>

            <div className="problem-card">
              <div className="problem-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3>Missed Follow-ups</h3>
              <p>Without reminders, critical follow-up dates and interview round deadlines slip past unnoticed.</p>
            </div>

            <div className="problem-card">
              <div className="problem-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
                </svg>
              </div>
              <h3>Fragmented Prep</h3>
              <p>Re-copying job descriptions and resumes for every interview prep session wastes valuable time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="landing-features">
        <div className="landing-container">
          <h2 className="landing-section__title">Core Capabilities</h2>
          <p className="landing-section__subtitle">
            Everything you need to discover placement opportunities and manage your job hunt efficiently.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                  <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
                  <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                  <path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>
                </svg>
              </div>
              <h3>Campus Placement Discovery</h3>
              <p>Browse verified placement openings posted by your campus admin, complete with eligibility criteria, stipend details, and 1-click tracking.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="7" rx="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <h3>Ticket Pipeline Tracking</h3>
              <p>Organize applications into clear ticket rows with status stages (Applied, Screening, Interview, Offer, Rejected).</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2"/>
                  <path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
              </div>
              <h3>Interview Timeline</h3>
              <p>Schedule technical rounds, video interviews, and follow-ups with chronological date tracking and outcomes.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                </svg>
              </div>
              <h3>AI Career Assistant</h3>
              <p>Ask questions about specific applications. The AI analyzes your resume and job description stored in MySQL to deliver tailored advice.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-workflow">
        <div className="landing-container">
          <h2 className="landing-section__title">How HireTrack Works</h2>

          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="step-num">01</div>
              <h3>Discover & Pre-fill</h3>
              <p>Browse campus placement openings or create a new application. One click pre-fills company details, job role, and JD.</p>
            </div>
            <div className="workflow-step">
              <div className="step-num">02</div>
              <h3>Track & Update</h3>
              <p>Move applications through interview rounds, record notes, assign tags, and log key follow-up dates.</p>
            </div>
            <div className="workflow-step">
              <div className="step-num">03</div>
              <h3>Prepare & Succeed</h3>
              <p>Use the AI Assistant to run mock interview prep, evaluate candidate fit, and keep momentum going.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="landing-faq">
        <div className="landing-container">
          <h2 className="landing-section__title">Frequently Asked Questions</h2>

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
      </section>

      {/* Final CTA */}
      <section className="landing-cta-wrapper">
        <div className="landing-container">
          <div className="landing-cta">
            <h2>Ready to organize your placement hunt?</h2>
            <p>Get started with HireTrack today and keep your job search focused.</p>
            <Link to="/register" className="landing-btn landing-btn--hero">
              Get Started Now
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <p>© 2026 HireTrack — AI-Powered Job Application System.</p>
        </div>
      </footer>
    </div>
  );
}
