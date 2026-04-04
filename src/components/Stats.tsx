"use client";
import { useEffect, useState } from "react";
import { Users, CreditCard, Activity } from "lucide-react";

const stats = [
  { label: "Active Users", target: 5.2, suffix: "M", icon: Users, unit: "M" },
  { label: "Daily Transactions", target: 1.25, suffix: "M", icon: CreditCard, unit: "M" },
  { label: "Uptime", target: 99.99, suffix: "%", icon: Activity, unit: "" },
];

export default function Stats() {
  const [counts, setCounts] = useState(stats.map(() => 0));

  useEffect(() => {
    const timers = stats.map((stat, idx) => {
      const target = stat.target;
      if (target === 0) return null;
      let current = 0;
      const step = target / 50;
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
    <section className="py-16 md:py-24 px-4 bg-white">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, idx) => (
            <div key={idx} className="p-6">
              <stat.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <div className="text-4xl md:text-5xl font-bold text-blue-600">
                {stat.unit === "M" ? counts[idx].toFixed(1) : counts[idx].toFixed(2)}{stat.suffix}
              </div>
              <div className="text-gray-600 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
