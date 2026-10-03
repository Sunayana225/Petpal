export default function Footer() {
  return (
    <footer className="mt-24 border-t border-slate bg-parchment">
      <div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-10">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="font-display text-2xl tracking-tight text-ink">PetPal</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-stone">
              General information only — always consult your veterinarian before changing
              your pet&apos;s diet.
            </p>
          </div>

          <div>
            <p className="eyebrow">Emergency</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a href="tel:+18557647661" className="link-line text-charcoal">
                  Pet Poison Helpline
                  <span className="ml-2 text-mist">(855) 764-7661</span>
                </a>
              </li>
              <li>
                <a href="tel:+18884264435" className="link-line text-charcoal">
                  ASPCA Poison Control
                  <span className="ml-2 text-mist">(888) 426-4435</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow">Source</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="https://github.com/Sunayana225/Petpal"
                  className="link-line text-charcoal"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  GitHub
                </a>
              </li>
              <li className="text-mist">MIT licensed</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col justify-between gap-2 border-t border-slate pt-6 text-[11px] uppercase tracking-wide-cap text-mist sm:flex-row">
          <span>Veterinary-sourced · AI-assisted</span>
          <span>Not a substitute for professional veterinary care</span>
        </div>
      </div>
    </footer>
  );
}
