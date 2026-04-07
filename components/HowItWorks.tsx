const steps = [
  { step: "01", title: "Browse and submit intent", desc: "User lands on an offer, portfolio, or coin page and submits Invest or Apply." },
  { step: "02", title: "Telegram qualification", desc: "The bot collects structured suitability and channel-preference responses." },
  { step: "03", title: "Advisor handoff", desc: "Routing selects WhatsApp or email, then creates a complete context packet for follow-up." },
];

export default function HowItWorks() {
  return (
    <section className="bg-muted px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-black text-primary md:text-4xl">How qualification and routing works</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-primary/70 md:text-base">
          We do not run an exchange engine in this phase. The product is discovery, qualification, and advisor routing with traceable backend history.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="rounded-2xl bg-surface p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-black text-white">
                {s.step}
              </div>
              <h3 className="text-xl font-bold text-primary">{s.title}</h3>
              <p className="mt-3 text-sm leading-6 text-primary/75">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
