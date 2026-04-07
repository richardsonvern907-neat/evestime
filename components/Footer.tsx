import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-primary px-4 py-14 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-xl font-black">Evestime</h3>
            <p className="mt-3 text-sm leading-6 text-white/75">
              Discovery and support-routing platform for crypto investment journeys.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/70">Explore</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/offers">All Offers</Link></li>
              <li><Link href="/offers?productTrack=core_investing">Core Investing</Link></li>
              <li><Link href="/offers?productTrack=pro_opportunities">Pro Opportunities</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/70">Catalog</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/coin-assets">Coin Assets</Link></li>
              <li><Link href="/login">Advisor Login</Link></li>
              <li><Link href="/signup">Create Account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/70">Compliance</h4>
            <p className="text-sm leading-6 text-white/75">
              Pro Opportunities are high-risk products and require suitability acknowledgment before final advisor routing.
            </p>
          </div>
        </div>
        <div className="border-t border-white/15 pt-8 text-center">
          <p className="text-xs text-white/65">&copy; {new Date().getFullYear()} Evestime. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
