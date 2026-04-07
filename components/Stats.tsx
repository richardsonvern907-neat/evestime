"use client";
import { useEffect, useState } from "react";
import { Users, Compass, ShieldCheck } from "lucide-react";

const stats = [
  { label: "Qualified Leads Routed", target: 12.8, suffix: "K", icon: Users, precision: 1 },
  { label: "Offers Across Tracks", target: 64, suffix: "", icon: Compass, precision: 0 },
  { label: "Audit Event Coverage", target: 99.9, suffix: "%", icon: ShieldCheck, precision: 1 },
];

export default function Stats() {
  const [counts, setCounts] = useState(stats.map(() => 0));

  useEffect(() => {
    const timers = stats.map((stat, idx) => {
      const target = stat.target;
      if (target === 0) return null;
      let current = 0;
      const step = target / 45;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          setCounts(prev => { const newCounts = [...prev]; newCounts[idx] = target; return newCounts; });
          clearInterval(timer);
        } else {
          setCounts(prev => { const newCounts = [...prev]; newCounts[idx] = current; return newCounts; });
        }
      }, 30);
      return timer;
    });
    return () => timers.forEach(t => t && clearInterval(t));
  }, []);

  return (
    <section className="bg-primary px-4 py-16 text-white md:px-8 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((stat, idx) => (
            <div key={idx} className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <stat.icon className="mb-4 h-8 w-8 text-accent" />
              <div className="text-4xl font-black md:text-5xl">
                {counts[idx].toFixed(stat.precision)}{stat.suffix}
              </div>
              <div className="mt-2 text-sm font-semibold uppercase tracking-wider text-white/75">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
