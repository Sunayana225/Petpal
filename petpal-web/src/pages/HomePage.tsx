import CheckForm from '../components/CheckForm';
import { PETS } from '../pets';

const HIGHLIGHTS = [
  {
    emoji: '🗄️',
    title: 'Vet data first',
    body: 'Answers come from a merged veterinary database — no AI call, no waiting, no cost.',
  },
  {
    emoji: '🤖',
    title: 'AI only as a fallback',
    body: 'Unknown foods fall through to Gemini, clearly labelled as AI analysis.',
  },
  {
    emoji: '🧾',
    title: 'Sources shown',
    body: 'Every verdict tells you where it came from and how long it took.',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Can my pet eat this?
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
          Instant answers from veterinary-sourced safety data for 10 species — with
          an AI fallback for the unusual stuff.
        </p>
      </section>

      <section aria-label="Food safety checker">
        <CheckForm />
      </section>

      <section aria-labelledby="supported-pets">
        <h2
          id="supported-pets"
          className="text-center text-sm font-semibold uppercase tracking-wide text-slate-500"
        >
          Supported pets
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PETS.map((pet) => (
            <li
              key={pet.key}
              className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm"
            >
              <div className="text-2xl" aria-hidden="true">
                {pet.emoji}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {pet.label}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">{pet.blurb}</div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="How PetPal works" className="grid gap-4 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xl" aria-hidden="true">
              {item.emoji}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              {item.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {item.body}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
