import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Checker' },
  { to: '/browse', label: 'Browse foods' },
  { to: '/docs', label: 'API docs' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-20 bg-brand-700 text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span aria-hidden="true">🐾</span>
          <span>PetPal</span>
        </NavLink>

        <nav aria-label="Main">
          <ul className="flex items-center gap-1 sm:gap-2">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-brand-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
