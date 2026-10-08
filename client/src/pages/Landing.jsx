import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import Globe from '../components/Globe.jsx'
import Reveal, { useInView } from '../components/Reveal.jsx'
import Icon, { Mark } from '../components/Icon.jsx'

const BELT = [
  ['Deep sleep', '+11 min, 80% interval 2 to 20'],
  ['Resting HR', 'no clear effect, drop it'],
  ['HRV', '+4 ms, keep it'],
  ['Fasting glucose', '-6 mg/dL after 3 blocks'],
  ['Mood', 'run 6 more days'],
  ['Systolic BP', '-5 mmHg, evening dose'],
]

const STEPS = [
  ['Randomize', 'Pairs of blocks run in a random order, A then B or B then A, with washout days between them so one condition does not bleed into the next.'],
  ['Log', 'Type the day in, or drop in a wearable CSV. The test reads the metric you picked straight from your log.'],
  ['Model', 'A Bayesian model fits the effect and the day-to-day carry-over together. Nights next to each other are not independent and it does not pretend they are.'],
  ['Decide', 'Keep it, drop it, or extend it. The verdict says how many more days it would take to know.'],
]

function Line({ i, children }) {
  return <span className="ln"><span style={{ '--i': i }}>{children}</span></span>
}

export default function Landing() {
  const { user } = useAuth()
  const [trackRef, trackOn] = useInView(0.4)
  const [bandRef, bandOn] = useInView(0.5)
  const belt = [...BELT, ...BELT]

  return (
    <>
      <header className="land-nav">
        <Link to="/" className="brand" style={{ padding: 0 }}><Mark /> N1 Lab</Link>
        <div className="links">
          {user ? (
            <Link to="/app" className="btn primary sm">Open the lab</Link>
          ) : (
            <>
              <Link to="/login" className="btn sm hide-s">Sign in</Link>
              <Link to="/register" className="btn primary sm">Create account</Link>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <Globe />
        <div className="hero-copy">
          <h1>
            <Line i={0}>Run the</Line>
            <Line i={1}>trial on</Line>
            <Line i={2}>one person.</Line>
          </h1>
          <p className="hero-sub">
            A crew of six cannot run a population study, and what helps one astronaut sleep does nothing for the next.
            So each person runs their own randomized experiment and gets their own answer.
          </p>
          <div className="hero-cta">
            <Link to={user ? '/app' : '/register'} className="btn primary">Start a test <Icon n="go" className="ico go" /></Link>
            <Link to={user ? '/app' : '/login'} className="btn">{user ? 'Go to board' : 'Sign in'}</Link>
          </div>
        </div>
      </section>

      <div className="belt" aria-hidden="true">
        <div className="belt-in">
          {belt.map(([k, v], i) => <span key={i}><b>{k}</b>{v}</span>)}
        </div>
      </div>

      <section className="sect">
        <Reveal as="h2">Four steps from a hunch to a decision</Reveal>
        <div ref={trackRef} className={`track ${trackOn ? 'in' : ''}`}>
          {STEPS.map(([h, p], i) => (
            <Reveal key={h} className="station" delay={200 + i * 260}>
              <h3>{h}</h3>
              <p>{p}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sect" style={{ paddingTop: 0 }}>
        <div className="show">
          <Reveal className="panel sample">
            <span className="plate">Sample verdict</span>
            <p className="big">Evening light filtering improved deep sleep by about 11 min, 80% interval 3 to 19, not conclusive yet, run 5 more days.</p>
            <div ref={bandRef} className={`band ${bandOn ? 'in' : ''}`}>
              <div className="axis" />
              <div className="zero" style={{ left: '14%' }} />
              <div className="range" style={{ left: '29%', width: '47%' }} />
              <div className="dot" style={{ left: '49%' }} />
            </div>
            <div className="band-lab"><span>worse</span><span>0</span><span>better</span></div>
          </Reveal>
          <div className="points">
            <Reveal as="p" delay={100}><b>A range, not a verdict by gut</b>The interval shows what the data allows. A narrow band clear of zero is a real effect. A wide one means keep going.</Reveal>
            <Reveal as="p" delay={220}><b>One call per person</b>Keep it, drop it, or extend the test. Extending adds another randomized pair so the design stays fair.</Reveal>
            <Reveal as="p" delay={340}><b>Your own threshold</b>You set the smallest change worth living with. Eleven minutes of deep sleep matters. Eleven seconds does not.</Reveal>
          </div>
        </div>
      </section>

      <section className="sect" style={{ paddingTop: 0 }}>
        <Reveal as="h2">It works on Earth too</Reveal>
        <div className="earth">
          <Reveal as="p" delay={80}>Someone managing a chronic condition has the same problem as the crew: a sample of one. Does the low-carb week really move fasting glucose? Does taking the pill at night beat taking it in the morning?</Reveal>
          <Reveal as="p" delay={200}>Same design, same model, same three outcomes. Log the number you already measure and let the randomized blocks do the arguing.</Reveal>
        </div>
      </section>

      <footer className="foot">
        <span>N1 Lab, a countermeasure testing tool for small crews.</span>
        <span>Not medical advice. Talk to your flight surgeon or doctor before changing treatment.</span>
      </footer>
    </>
  )
}
