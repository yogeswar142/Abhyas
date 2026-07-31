'use client'

import { useEffect, useRef, useState } from 'react'
import { useReveal } from '@/hooks/useReveal'
import { useCountUp } from '@/hooks/useCountUp'

// Reusable components for animations
const ScrollProgress = () => {
  const [width, setWidth] = useState('0%')

  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      if (total <= 0) return
      const pct = (window.scrollY / total) * 100
      setWidth(`${pct}%`)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      style={{ width }}
      className="fixed top-[64px] left-0 h-[1px] bg-[rgba(255,255,255,0.15)] z-[101] transition-[width] duration-75 ease-out"
    />
  )
}

const Magnetic = ({
  children,
  className = '',
  id = '',
  href = '#',
}: {
  children: React.ReactNode
  className?: string
  id?: string
  href?: string
}) => {
  const ref = useRef<HTMLAnchorElement>(null)

  const onMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) * 0.3
    const dy = (e.clientY - cy) * 0.3
    if (ref.current) {
      ref.current.style.transform = `translate(${dx}px, ${dy}px)`
    }
  }

  const onMouseLeave = () => {
    if (ref.current) {
      ref.current.style.transform = ''
    }
  }

  return (
    <a
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={className}
      id={id}
      href={href}
      style={{ display: 'inline-flex', position: 'relative', transition: 'transform 0.2s' }}
    >
      {children}
    </a>
  )
}

const TiltCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    if (ref.current) {
      ref.current.style.transform = `perspective(700px) rotateY(${x * 5}deg) rotateX(${-y * 3}deg) translateY(-3px)`
    }
  }

  const onMouseLeave = () => {
    if (ref.current) {
      ref.current.style.transform = ''
    }
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={className}
      style={{ transition: 'transform 0.3s var(--ease-smooth), border-color 0.3s' }}
    >
      {children}
    </div>
  )
}

const SpotlightCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    if (ref.current) {
      const baseColor = className.includes('pricing-card-pro') ? 'var(--bg-2)' : 'var(--bg-1)'
      ref.current.style.background = `radial-gradient(280px circle at ${x}px ${y}px, rgba(255,255,255,0.04), transparent 70%), ${baseColor}`
    }
  }

  const onMouseLeave = () => {
    if (ref.current) {
      ref.current.style.background = ''
    }
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={className}
      style={{ transition: 'transform 0.3s, border-color 0.3s' }}
    >
      {children}
    </div>
  )
}

const Waveform = () => {
  // Generate 20 animation-randomized bars
  const [bars, setBars] = useState<{ delay: number; duration: number }[]>([])

  useEffect(() => {
    const items = Array.from({ length: 20 }).map(() => ({
      delay: Math.random(),
      duration: Math.random() * 0.5 + 0.8,
    }))
    setBars(items)
  }, [])

  return (
    <div className="waveform">
      <div className="wave-bars">
        {bars.map((bar, idx) => (
          <span
            key={idx}
            style={{
              animation: `wave ${bar.duration}s ease-in-out infinite ${bar.delay}s`,
            }}
          />
        ))}
      </div>
      <span className="wave-label">Listening…</span>
    </div>
  )
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [isMarqueePaused, setIsMarqueeMarqueePaused] = useState(false)

  // Navigation scroll observer
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Floating Dashboard typing state
  const questions = [
    "Tell me about a time you led a cross-functional team through ambiguity...",
    "How would you design a real-time collaborative editing system?",
    "Walk me through your most impactful product decision.",
    "Describe a situation where data changed your strategy.",
    "How do you approach mentoring junior engineers?",
  ]
  const [questionIndex, setQuestionIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTyping(true)
      setTimeout(() => {
        setQuestionIndex((prev) => (prev + 1) % questions.length)
        setIsTyping(false)
      }, 2000)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // 3D Tilt for Hero dashboard container
  const heroFloatRef = useRef<HTMLDivElement>(null)
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    if (heroFloatRef.current) {
      heroFloatRef.current.style.transform = `perspective(1200px) rotateY(${dx * 5}deg) rotateX(${-dy * 3}deg)`
    }
  }
  const handleHeroMouseLeave = () => {
    if (heroFloatRef.current) {
      heroFloatRef.current.style.transform = ''
    }
  }

  // Parallax background offset
  const [scrollYOffset, setScrollYOffset] = useState(0)
  useEffect(() => {
    const handleScroll = () => {
      setScrollYOffset(window.scrollY * 0.25)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll reveal tags
  const revealHeroLeft = useReveal()
  const revealStep1 = useReveal()
  const revealStep2 = useReveal()
  const revealStep3 = useReveal()
  const revealMetricsText = useReveal()
  const revealStat1 = useReveal()
  const revealStat2 = useReveal()
  const revealStat3 = useReveal()
  const revealStat4 = useReveal()
  const revealSessionsTitle = useReveal()
  const revealSession1 = useReveal()
  const revealSession2 = useReveal()
  const revealSession3 = useReveal()
  const revealSession4 = useReveal()
  const revealSession5 = useReveal()
  const revealTestimonialsTitle = useReveal()
  const revealTesti1 = useReveal()
  const revealTesti2 = useReveal()
  const revealTesti3 = useReveal()
  const revealPricingTitle = useReveal()
  const revealPrice1 = useReveal()
  const revealPrice2 = useReveal()
  const revealPrice3 = useReveal()
  const revealFinalCta = useReveal()

  // Score target triggers
  const scoreCardRef = useRef<HTMLDivElement>(null)
  const [scorePercent, setScorePercent] = useState('0%')
  useEffect(() => {
    const el = scoreCardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setScorePercent('87%'), 300)
          observer.unobserve(el)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Count up hook instantiations
  const scoreCount = useCountUp(87)
  const stat1Count = useCountUp(89)
  const stat2Count = useCountUp(12)
  const stat3Count = useCountUp(97)

  // Session card stagger entries
  const session1Reveal = useReveal()
  const session2Reveal = useReveal()
  const session3Reveal = useReveal()
  const session4Reveal = useReveal()
  const session5Reveal = useReveal()

  return (
    <>
      <ScrollProgress />

      {/* Navigation */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`} id="nav">
        <div className="nav-inner">
          <a href="#" className="nav-logo" id="navLogo">
            <span className="logo-mark">A</span>
            <span className="logo-text">bhyas</span>
          </a>
          <div className="nav-links">
            <a href="#process" className="nav-link">
              How it works
            </a>
            <a href="#metrics" className="nav-link">
              Results
            </a>
            <a href="#sessions" className="nav-link">
              Sessions
            </a>
            <a href="#pricing" className="nav-link">
              Pricing
            </a>
          </div>
          <div className="nav-cta">
            <a href="#" className="btn-ghost">
              Sign in
            </a>
            <Magnetic className="btn-primary magnetic" id="navCta">
              Start practicing
            </Magnetic>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="hero"
        id="hero"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        <div
          className="hero-bg"
          style={{ transform: `translateY(${scrollYOffset}px)` }}
        >
          <div className="hero-grid"></div>
          <div className="hero-radial"></div>
        </div>

        <div className="hero-content">
          <div
            className="hero-left transition-all duration-1000"
            ref={revealHeroLeft.ref}
            style={{
              opacity: revealHeroLeft.visible ? 1 : 0,
              transform: revealHeroLeft.visible ? 'translateY(0)' : 'translateY(24px)',
            }}
          >
            <div className="hero-badge">
              <span className="badge-dot animate-pulse-dot"></span>
              <span>Practice. Improve. Land the role.</span>
            </div>

            <h1 className="hero-headline">
              <span className="headline-line">The way you</span>
              <span className="headline-line headline-italic">prepare</span>
              <span className="headline-line">defines the</span>
              <span className="headline-line">outcome.</span>
            </h1>

            <p className="hero-sub">
              Abhyas puts an AI interviewer across the table.
              <br />
              Real questions. Instant feedback. No judgment.
            </p>

            <div className="hero-actions">
              <Magnetic className="btn-hero magnetic" id="heroCta">
                <span>Begin your practice</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Magnetic>
              <a href="#" className="btn-watch">
                <div className="watch-icon">
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                    <path d="M1 1.5l10 5.5-10 5.5V1.5z" fill="currentColor" />
                  </svg>
                </div>
                Watch demo
              </a>
            </div>

            <div className="hero-social-proof">
              <div className="proof-avatars">
                <div className="proof-avatar" style={{ background: '#333333' }}></div>
                <div className="proof-avatar" style={{ background: '#555555' }}></div>
                <div className="proof-avatar" style={{ background: '#777777' }}></div>
                <div className="proof-avatar" style={{ background: '#999999' }}></div>
              </div>
              <p>
                Trusted by <strong>12,000+</strong> candidates at Google, Meta, Amazon
              </p>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-float-container" ref={heroFloatRef} id="heroFloat">
              {/* Floating Interview Dashboard */}
              <div className="float-card float-main" id="floatMain">
                <div className="card-header">
                  <div className="card-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="card-title">Live Interview Session</span>
                  <div className="card-status">
                    <span className="status-dot animate-pulse-dot"></span>
                    <span>Active</span>
                  </div>
                </div>
                <div className="card-body">
                  <div className="interview-scene">
                    <div className="ai-orb-container">
                      <div className="ai-orb" id="aiOrb">
                        <div className="orb-ring orb-ring-1 animate-orb-r1"></div>
                        <div className="orb-ring orb-ring-2 animate-orb-r2"></div>
                        <div className="orb-ring orb-ring-3 animate-orb-r3"></div>
                        <div className="orb-core animate-orb-core">
                          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <circle cx="14" cy="14" r="6" fill="white" opacity="0.9" />
                            <circle cx="14" cy="14" r="10" stroke="white" strokeWidth="1" opacity="0.3" />
                            <circle cx="14" cy="14" r="13" stroke="white" strokeWidth="0.5" opacity="0.15" />
                          </svg>
                        </div>
                      </div>
                      <div className="ai-label">Abhyas AI</div>
                    </div>
                    <div className="question-bubble">
                      <div className={`bubble-typing ${!isTyping ? 'hidden' : ''}`} id="typingIndicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <p className={`bubble-text ${!isTyping ? 'visible' : ''}`} id="bubbleText">
                        {questions[questionIndex]}
                      </p>
                    </div>
                  </div>
                  <Waveform />
                </div>
              </div>

              {/* Floating Score Card */}
              <div className="float-card float-score animate-float-a" ref={scoreCardRef} id="floatScore">
                <div className="score-label">Confidence Score</div>
                <div className="score-value">
                  <span className="score-num" ref={scoreCount.ref}>
                    {scoreCount.count}
                  </span>
                  <span className="score-pct">%</span>
                </div>
                <div className="score-bar">
                  <div className="score-fill" style={{ width: scorePercent }} id="scoreFill"></div>
                </div>
                <div className="score-delta">↑ 14% from last session</div>
              </div>

              {/* Floating Feedback Card */}
              <div className="float-card float-feedback animate-float-b" id="floatFeedback">
                <div className="feedback-header">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1" />
                    <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <span>AI Feedback</span>
                </div>
                <p className="feedback-text">
                  Strong opening. Add a quantified outcome to make the impact memorable.
                </p>
              </div>

              {/* Floating Metric Cards */}
              <div className="float-card float-metric float-metric-1 animate-float-d" id="floatMetric1">
                <div className="metric-val">4.8s</div>
                <div className="metric-key">Avg response time</div>
              </div>

              <div className="float-card float-metric float-metric-2 animate-float-c" id="floatMetric2">
                <div className="metric-val">
                  <span className="metric-live" ref={stat2Count.ref}>
                    {stat2Count.count}
                  </span>
                </div>
                <div className="metric-key">Sessions today</div>
              </div>

              {/* Glow */}
              <div className="float-glow"></div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="scroll-indicator">
          <div className="scroll-line animate-scroll-line"></div>
          <span>Scroll</span>
        </div>
      </section>

      {/* Logos Bar */}
      <section className="logos-section">
        <p className="logos-label">Candidates hired at</p>
        <div className="logos-track">
          <div
            className="logos-inner animate-logos"
            style={{ animationPlayState: isMarqueePaused ? 'paused' : 'running' }}
            onMouseEnter={() => setIsMarqueeMarqueePaused(true)}
            onMouseLeave={() => setIsMarqueeMarqueePaused(false)}
            id="logosInner"
          >
            <span className="logo-company">Google</span>
            <span className="logo-company">Meta</span>
            <span className="logo-company">Amazon</span>
            <span className="logo-company">Microsoft</span>
            <span className="logo-company">Apple</span>
            <span className="logo-company">Netflix</span>
            <span className="logo-company">Stripe</span>
            <span className="logo-company">Figma</span>
            <span className="logo-company">Linear</span>
            <span className="logo-company">Notion</span>
            <span className="logo-company">Google</span>
            <span className="logo-company">Meta</span>
            <span className="logo-company">Amazon</span>
            <span className="logo-company">Microsoft</span>
            <span className="logo-company">Apple</span>
            <span className="logo-company">Netflix</span>
            <span className="logo-company">Stripe</span>
            <span className="logo-company">Figma</span>
            <span className="logo-company">Linear</span>
            <span className="logo-company">Notion</span>
          </div>
        </div>
      </section>

      {/* Process Section — "How Abhyas Works" */}
      <section className="process-section" id="process">
        <div className="section-container">
          <div className="section-eyebrow">The Practice Loop</div>
          <h2 className="section-headline">
            Three steps.
            <br />
            Infinite improvement.
          </h2>

          <div className="process-grid mt-20">
            <div
              className={`process-step reveal-item reveal ${revealStep1.visible ? 'is-visible' : ''}`}
              ref={revealStep1.ref}
              id="step1"
            >
              <div className="step-number">01</div>
              <div className="step-content">
                <div className="step-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <h3 class="step-title">Choose your arena</h3>
                <p className="step-desc">
                  Select from 30+ interview types — behavioral, system design, product sense, coding.
                  Tailored to your target role and company.
                </p>
              </div>
              <div className="step-visual">
                <div className="step-vis-card">
                  <div
                    className="vis-row"
                    style={{
                      transitionDelay: '0s',
                      opacity: revealStep1.visible ? 1 : 0,
                      transform: revealStep1.visible ? 'translateX(0)' : 'translateX(-8px)',
                    }}
                  >
                    <div className="vis-tag active">Software Engineer</div>
                    <div className="vis-tag">Product Manager</div>
                  </div>
                  <div
                    className="vis-row"
                    style={{
                      transitionDelay: '0.1s',
                      opacity: revealStep1.visible ? 1 : 0,
                      transform: revealStep1.visible ? 'translateX(0)' : 'translateX(-8px)',
                    }}
                  >
                    <div className="vis-tag">Data Scientist</div>
                    <div className="vis-tag active">System Design</div>
                  </div>
                  <div
                    className="vis-row"
                    style={{
                      transitionDelay: '0.2s',
                      opacity: revealStep1.visible ? 1 : 0,
                      transform: revealStep1.visible ? 'translateX(0)' : 'translateX(-8px)',
                    }}
                  >
                    <div className="vis-tag">Leadership</div>
                    <div className="vis-tag">Behavioral</div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`process-step reveal-item reveal ${revealStep2.visible ? 'is-visible' : ''}`}
              ref={revealStep2.ref}
              id="step2"
            >
              <div className="step-number">02</div>
              <div className="step-content">
                <div className="step-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M12 3v3M12 18v3M3 12h3M18 12h3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <h3 className="step-title">Practice with AI</h3>
                <p className="step-desc">
                  A sophisticated AI interviewer adapts in real-time. It follows up on vague answers,
                  pushes back when needed, and simulates a real panel.
                </p>
              </div>
              <div className="step-visual">
                <div className="step-vis-convo">
                  <div className="convo-bubble ai">
                    <span className="convo-who">Abhyas AI</span>
                    How would you design a notification system for 1 billion users?
                  </div>
                  <div className="convo-bubble user">
                    <span className="convo-who">You</span>
                    I'd start by defining the scale requirements...
                  </div>
                  <div className="convo-bubble ai">
                    <span className="convo-who">Abhyas AI</span>
                    Good. Now, how do you handle message ordering?
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`process-step reveal-item reveal ${revealStep3.visible ? 'is-visible' : ''}`}
              ref={revealStep3.ref}
              id="step3"
            >
              <div className="step-number">03</div>
              <div className="step-content">
                <div className="step-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 17l4-4 4 3 5-7 5 5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M21 21H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="step-title">Receive deep analysis</h3>
                <p className="step-desc">
                  After every session, receive a structured breakdown — clarity, structure, confidence,
                  technical depth. Then a precision roadmap to improve.
                </p>
              </div>
              <div className="step-visual">
                <div className="step-vis-metrics">
                  <div className="vis-metric-row">
                    <span>Clarity</span>
                    <div className="vis-metric-bar">
                      <div
                        className="vis-metric-fill"
                        style={{
                          width: revealStep3.visible ? '82%' : '0%',
                          transitionDelay: '0.2s',
                        }}
                      ></div>
                    </div>
                    <span>82</span>
                  </div>
                  <div className="vis-metric-row">
                    <span>Structure</span>
                    <div className="vis-metric-bar">
                      <div
                        className="vis-metric-fill"
                        style={{
                          width: revealStep3.visible ? '74%' : '0%',
                          transitionDelay: '0.4s',
                        }}
                      ></div>
                    </div>
                    <span>74</span>
                  </div>
                  <div className="vis-metric-row">
                    <span>Confidence</span>
                    <div className="vis-metric-bar">
                      <div
                        className="vis-metric-fill"
                        style={{
                          width: revealStep3.visible ? '91%' : '0%',
                          transitionDelay: '0.6s',
                        }}
                      ></div>
                    </div>
                    <span>91</span>
                  </div>
                  <div className="vis-metric-row">
                    <span>Depth</span>
                    <div className="vis-metric-bar">
                      <div
                        className="vis-metric-fill"
                        style={{
                          width: revealStep3.visible ? '68%' : '0%',
                          transitionDelay: '0.8s',
                        }}
                      ></div>
                    </div>
                    <span>68</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics / Results Section */}
      <section className="metrics-section" id="metrics">
        <div className="section-container">
          <div className="metrics-inner">
            <div
              className={`metrics-text reveal-item reveal ${revealMetricsText.visible ? 'is-visible' : ''}`}
              ref={revealMetricsText.ref}
            >
              <div className="section-eyebrow">The Numbers</div>
              <h2 className="section-headline">
                Practice compounds.
                <br />
                Results speak.
              </h2>
              <p className="metrics-sub">
                Every session teaches the AI more about your unique weaknesses. The feedback gets sharper.
                You get better. Fast.
              </p>
            </div>
            <div className="metrics-stats">
              <div
                className={`stat-card reveal-item reveal ${revealStat1.visible ? 'is-visible' : ''}`}
                ref={revealStat1.ref}
              >
                <div className="stat-number" ref={stat1Count.ref}>
                  {stat1Count.count}%
                </div>
                <div className="stat-label">offer rate after 10+ sessions</div>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={{ width: revealStat1.visible ? '89%' : '0%' }}
                  ></div>
                </div>
              </div>
              <div
                className={`stat-card reveal-item reveal ${revealStat2.visible ? 'is-visible' : ''}`}
                ref={revealStat2.ref}
              >
                <div className="stat-number">3.2×</div>
                <div className="stat-label">faster improvement vs solo prep</div>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={{ width: revealStat2.visible ? '72%' : '0%' }}
                  ></div>
                </div>
              </div>
              <div
                className={`stat-card reveal-item reveal ${revealStat3.visible ? 'is-visible' : ''}`}
                ref={revealStat3.ref}
              >
                <div className="stat-number">
                  <span ref={stat3Count.ref}>{stat3Count.count}</span>k+
                </div>
                <div className="stat-label">candidates practice every month</div>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={{ width: revealStat3.visible ? '60%' : '0%' }}
                  ></div>
                </div>
              </div>
              <div
                className={`stat-card reveal-item reveal ${revealStat4.visible ? 'is-visible' : ''}`}
                ref={revealStat4.ref}
              >
                <div className="stat-number">97%</div>
                <div className="stat-label">would recommend to a friend</div>
                <div className="stat-bar">
                  <div
                    className="stat-bar-fill"
                    style={{ width: revealStat4.visible ? '97%' : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sessions / Features Showcase */}
      <section className="sessions-section" id="sessions">
        <div className="section-container">
          <div
            className={`reveal-item reveal ${revealSessionsTitle.visible ? 'is-visible' : ''}`}
            ref={revealSessionsTitle.ref}
          >
            <div className="section-eyebrow">Session Types</div>
            <h2 className="section-headline">
              Every interview.
              <br />
              One platform.
            </h2>
          </div>

          <div className="sessions-grid mt-16">
            <div
              className={`session-card session-large reveal-item reveal ${session1Reveal.visible ? 'is-visible' : ''}`}
              ref={session1Reveal.ref}
              id="sessionBehavioral"
            >
              <div className="session-tag">Most popular</div>
              <h3 className="session-name">Behavioral</h3>
              <p className="session-desc">
                Master the STAR method. Craft narratives that land with any interviewer at any company.
              </p>
              <div className="session-preview">
                <div className="preview-msg">Walk me through your greatest leadership challenge.</div>
                <div className="preview-response">Situation: Q3, 12-person team, deadline at risk...</div>
              </div>
              <div className="session-footer">
                <span>48 question banks</span>
                <span>FAANG-calibrated</span>
              </div>
            </div>

            <div
              className={`session-card reveal-item reveal ${session2Reveal.visible ? 'is-visible' : ''}`}
              ref={session2Reveal.ref}
              id="sessionSystem"
            >
              <div className="session-badge">⚙</div>
              <h3 className="session-name">System Design</h3>
              <p className="session-desc">
                From URL shorteners to distributed payment systems. Real scale. Real pressure.
              </p>
              <div className="session-chips">
                <span>Scalability</span>
                <span>Trade-offs</span>
                <span>Databases</span>
              </div>
            </div>

            <div
              className={`session-card reveal-item reveal ${session3Reveal.visible ? 'is-visible' : ''}`}
              ref={session3Reveal.ref}
              id="sessionCoding"
            >
              <div className="session-badge">&#123; &#125;</div>
              <h3 className="session-name">Technical Coding</h3>
              <p className="session-desc">
                Voice-driven code walkthroughs. Explain your thinking out loud as you solve.
              </p>
              <div className="session-chips">
                <span>DSA</span>
                <span>Complexity</span>
                <span>Optimization</span>
              </div>
            </div>

            <div
              className={`session-card reveal-item reveal ${session4Reveal.visible ? 'is-visible' : ''}`}
              ref={session4Reveal.ref}
              id="sessionProduct"
            >
              <div className="session-badge">◈</div>
              <h3 className="session-name">Product Sense</h3>
              <p className="session-desc">
                Metrics, user empathy, trade-off frameworks. Be the PM who thinks in systems.
              </p>
              <div className="session-chips">
                <span>Root cause</span>
                <span>Metrics</span>
                <span>Prioritization</span>
              </div>
            </div>

            <div
              className={`session-card session-wide reveal-item reveal ${session5Reveal.visible ? 'is-visible' : ''}`}
              ref={session5Reveal.ref}
              id="sessionCustom"
            >
              <div className="session-badge">✦</div>
              <h3 className="session-name">Custom Interview</h3>
              <p className="session-desc">
                Upload your JD. Paste the job description. Abhyas generates a full mock tailored to that
                exact role in seconds.
              </p>
              <div className="custom-upload">
                <div className="upload-zone">
                  <span>Drop your job description</span>
                  <span className="upload-sub">Paste · Upload · Link</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="testimonials-section" id="testimonials">
        <div className="section-container">
          <div
            className={`reveal-item reveal ${revealTestimonialsTitle.visible ? 'is-visible' : ''}`}
            ref={revealTestimonialsTitle.ref}
          >
            <div className="section-eyebrow">Voices</div>
            <h2 className="section-headline">
              They practiced.
              <br />
              They landed.
            </h2>
          </div>

          <div className="testimonials-grid mt-16">
            <TiltCard
              className={`testi-card reveal-item reveal ${revealTesti1.visible ? 'is-visible' : ''}`}
            >
              <div ref={revealTesti1.ref}>
                <div className="testi-quote">
                  &ldquo;Abhyas made me feel like I was already inside the Google interview. The AI didn't
                  let me be vague — it pushed until I articulated my impact.&rdquo;
                </div>
                <div className="testi-author">
                  <div className="testi-avatar">R</div>
                  <div>
                    <div className="testi-name">Riya Kapoor</div>
                    <div className="testi-role">SWE @ Google · ex-Flipkart</div>
                  </div>
                </div>
              </div>
            </TiltCard>

            <TiltCard
              className={`testi-card reveal-item reveal ${revealTesti2.visible ? 'is-visible' : ''}`}
            >
              <div ref={revealTesti2.ref}>
                <div className="testi-quote">
                  &ldquo;I bombed 4 interviews before Abhyas. After 15 sessions, I cracked Meta PM. The
                  feedback reports are surgical.&rdquo;
                </div>
                <div className="testi-author">
                  <div className="testi-avatar">A</div>
                  <div>
                    <div className="testi-name">Arjun Mehta</div>
                    <div className="testi-role">PM @ Meta · ex-Razorpay</div>
                  </div>
                </div>
              </div>
            </TiltCard>

            <TiltCard
              className={`testi-card testi-card-highlight reveal-item reveal ${revealTesti3.visible ? 'is-visible' : ''}`}
            >
              <div ref={revealTesti3.ref}>
                <div className="testi-quote">
                  &ldquo;The closest thing I've found to practicing with an actual senior engineer. Zero
                  fluff. Pure signal.&rdquo;
                </div>
                <div className="testi-author">
                  <div className="testi-avatar">S</div>
                  <div>
                    <div className="testi-name">Sara Chen</div>
                    <div className="testi-role">Staff Engineer @ Stripe</div>
                  </div>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section class="pricing-section" id="pricing">
        <div className="section-container">
          <div
            className={`reveal-item reveal ${revealPricingTitle.visible ? 'is-visible' : ''}`}
            ref={revealPricingTitle.ref}
          >
            <div className="section-eyebrow">Pricing</div>
            <h2 className="section-headline">Simple. Honest.</h2>
          </div>

          <div className="pricing-grid mt-16">
            <SpotlightCard
              className={`pricing-card reveal-item reveal ${revealPrice1.visible ? 'is-visible' : ''}`}
            >
              <div ref={revealPrice1.ref}>
                <div className="plan-name">Starter</div>
                <div className="plan-price">
                  <span className="price-amount">Free</span>
                </div>
                <div className="plan-desc">Get a feel for what Abhyas can do.</div>
                <ul className="plan-features">
                  <li>
                    <span className="feat-check">✓</span> 3 free sessions / month
                  </li>
                  <li>
                    <span className="feat-check">✓</span> Basic feedback reports
                  </li>
                  <li>
                    <span className="feat-check">✓</span> Behavioral & coding tracks
                  </li>
                  <li className="feat-muted">
                    <span>—</span> Custom JD upload
                  </li>
                  <li className="feat-muted">
                    <span>—</span> Company-specific prep
                  </li>
                </ul>
                <Magnetic className="plan-btn plan-btn-ghost magnetic">Get started free</Magnetic>
              </div>
            </SpotlightCard>

            <SpotlightCard
              className={`pricing-card pricing-card-pro reveal-item reveal ${revealPrice2.visible ? 'is-visible' : ''}`}
            >
              <div ref={revealPrice2.ref}>
                <div className="plan-badge">Most popular</div>
                <div className="plan-name">Pro</div>
                <div className="plan-price">
                  <span className="price-amount">₹999</span>
                  <span className="price-period">/ month</span>
                </div>
                <div className="plan-desc">For serious candidates targeting top-tier roles.</div>
                <ul className="plan-features">
                  <li>
                    <span className="feat-check">✓</span> Unlimited sessions
                  </li>
                  <li>
                    <span className="feat-check">✓</span> Deep AI feedback reports
                  </li>
                  <li>
                    <span className="feat-check">✓</span> All 5 interview tracks
                  </li>
                  <li>
                    <span className="feat-check">✓</span> Custom JD upload
                  </li>
                  <li>
                    <span className="feat-check">✓</span> Company-specific prep
                  </li>
                </ul>
                <Magnetic className="plan-btn plan-btn-primary magnetic">Start Pro trial</Magnetic>
              </div>
            </SpotlightCard>

            <SpotlightCard
              className={`pricing-card reveal-item reveal ${revealPrice3.visible ? 'is-visible' : ''}`}
            >
              <div ref={revealPrice3.ref}>
                <div className="plan-name">Teams</div>
                <div className="plan-price">
                  <span className="price-amount">Custom</span>
                </div>
                <div className="plan-desc">For placement cells, bootcamps, and enterprises.</div>
                <ul className="plan-features">
                  <li>
                    <span className="feat-check">✓</span> Everything in Pro
                  </li>
                  <li>
                    <span className="feat-check">✓</span> Admin dashboard
                  </li>
                  <li>
                    <span className="feat-check">✓</span> Cohort analytics
                  </li>
                  <li>
                    <span className="feat-check">✓</span> Branded experience
                  </li>
                  <li>
                    <span className="feat-check">✓</span> Dedicated support
                  </li>
                </ul>
                <Magnetic className="plan-btn plan-btn-ghost magnetic">Contact us</Magnetic>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <div className="section-container">
          <div
            className={`cta-inner reveal-item reveal ${revealFinalCta.visible ? 'is-visible' : ''}`}
            ref={revealFinalCta.ref}
          >
            <div className="cta-glow"></div>
            <div className="section-eyebrow">Ready?</div>
            <h2 className="cta-headline">
              The interview isn't
              <br />
              <em>someday.</em> It's next week.
            </h2>
            <p className="cta-sub">Start your first session in under 60 seconds. No resume needed.</p>
            <Magnetic className="btn-hero magnetic" id="finalCta">
              <span>Begin practicing now</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#" className="nav-logo">
                <span className="logo-mark">A</span>
                <span className="logo-text">bhyas</span>
              </a>
              <p className="footer-brand-desc">
                AI-Powered Mock Interview Platform.
                <br />
                Practice until it feels natural.
              </p>
            </div>
            <div className="footer-links-grid">
              <div className="footer-col">
                <div className="footer-col-title">Product</div>
                <a href="#">How it works</a>
                <a href="#">Session Types</a>
                <a href="#">Pricing</a>
                <a href="#">Changelog</a>
              </div>
              <div className="footer-col">
                <div className="footer-col-title">Resources</div>
                <a href="#">Interview Guide</a>
                <a href="#">Blog</a>
                <a href="#">Question Bank</a>
                <a href="#">Community</a>
              </div>
              <div className="footer-col">
                <div className="footer-col-title">Company</div>
                <a href="#">About</a>
                <a href="#">Careers</a>
                <a href="#">Press</a>
                <a href="#">Contact</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; 2026 Abhyas. All rights reserved.</span>
            <div className="footer-legal">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
