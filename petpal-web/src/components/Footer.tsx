export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-sm text-slate-600 sm:px-6">
        <p>
          <strong>PetPal</strong> provides general information only — always
          consult your veterinarian before changing your pet's diet.
        </p>
        <p>
          Emergency? Call{' '}
          <a
            href="tel:+18557647661"
            className="font-medium text-brand-700 underline"
          >
            Pet Poison Helpline (855) 764-7661
          </a>{' '}
          or{' '}
          <a
            href="tel:+18884264435"
            className="font-medium text-brand-700 underline"
          >
            ASPCA Poison Control (888) 426-4435
          </a>
          .
        </p>
        <p className="pt-2 text-xs text-slate-400">
          MIT licensed ·{' '}
          <a
            href="https://github.com/Sunayana225/Petpal"
            className="underline hover:text-brand-700"
            rel="noreferrer noopener"
            target="_blank"
          >
            Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
