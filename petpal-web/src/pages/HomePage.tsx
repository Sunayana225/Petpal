import { motion, useReducedMotion } from 'framer-motion';

import CheckForm from '../components/CheckForm';
import { Reveal } from '../motion/primitives';
import { EASE } from '../motion/tokens';
import { PETS } from '../pets';

const HERO_LINES = ['Can my pet', 'eat this?'];

const STEPS = [
  {
    title: 'Veterinary data first',
    body: 'Every check begins with curated, species-specific safety records — instant, free, and the most trustworthy answer we have.',
  },
  {
    title: 'Then the open databases',
    body: 'Foods we have never seen are matched against Open Pet Food Facts before anything else is allowed to guess.',
  },
  {
    title: 'AI, clearly labelled',
    body: 'Only as a last resort does the model weigh in — and the verdict always tells you it was AI-assisted.',
  },
];

export default function HomePage() {
  const reduce = useReducedMotion();

  return (
    <div>
      {/* ---- Hero ---------------------------------------------------------- */}
      <section className="mx-auto max-w-[1600px] px-5 pt-16 pb-24 sm:px-10 sm:pt-24 lg:pt-32">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          Veterinary food safety · Ten species
        </motion.p>

        <h1 className="mt-8 font-display text-[clamp(3rem,10vw,8.5rem)] font-light leading-[0.9] tracking-[-0.02em] text-ink">
          {HERO_LINES.map((line, index) => (
            <span key={line} className="block overflow-hidden pb-1">
              <motion.span
                className="block"
                initial={reduce ? { opacity: 0 } : { y: '110%' }}
                animate={reduce ? { opacity: 1 } : { y: 0 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.15 + index * 0.12 }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h1>

        <div className="mt-12 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
          <motion.p
            className="max-w-xl text-base leading-relaxed text-stone"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.55 }}
          >
            Instant answers from veterinary-sourced safety data, with an AI fallback for
            the unusual stuff. No sign-up, no guessing — just the source, stated plainly.
          </motion.p>

          <motion.a
            href="#checker"
            className="link-line text-[12px] uppercase tracking-wide-cap text-charcoal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
          >
            Check a food ↓
          </motion.a>
        </div>
      </section>

      {/* ---- Checker ------------------------------------------------------- */}
      <section id="checker" className="border-t border-slate">
        <div className="mx-auto max-w-3xl px-5 py-24 sm:px-10">
          <Reveal>
            <CheckForm />
          </Reveal>
        </div>
      </section>

      {/* ---- Method (dark contrast band) ----------------------------------- */}
      <section className="bg-carbon text-parchment">
        <div className="mx-auto max-w-[1600px] px-5 py-28 sm:px-10">
          <Reveal>
            <p className="eyebrow text-sage">The method</p>
          </Reveal>
          <div className="mt-14 grid gap-12 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.1}>
                <div className="border-t border-parchment/25 pt-6">
                  <p className="font-display text-4xl font-light text-parchment/35">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-6 font-display text-2xl tracking-tight">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-parchment/70">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Species index ------------------------------------------------- */}
      <section className="mx-auto max-w-[1600px] px-5 py-28 sm:px-10">
        <Reveal>
          <p className="eyebrow">Species covered</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-5 font-display text-4xl font-light tracking-tight text-ink sm:text-5xl">
            Ten species, one answer.
          </h2>
        </Reveal>

        <div className="mt-16 border-t border-slate">
          {PETS.map((pet) => (
            <div
              key={pet.key}
              className="group grid grid-cols-[2rem_1fr] items-baseline gap-x-6 gap-y-1 border-b border-slate py-5 transition-colors duration-500 hover:bg-alabaster sm:grid-cols-[3rem_11rem_1fr] sm:px-2"
            >
              <span className="text-lg" aria-hidden="true">
                {pet.emoji}
              </span>
              <span className="font-display text-xl text-ink">{pet.label}</span>
              <span className="col-span-2 text-sm text-stone sm:col-span-1">{pet.blurb}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
