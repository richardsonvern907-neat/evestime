import { Shield, Zap, Globe, CreditCard, Phone, BarChart } from 'lucide-react';

const features = [
  { icon: Shield, title: "Secure & Safe", desc: "Bank-level encryption." },
  { icon: Zap, title: "Lightning Fast", desc: "Transfers in seconds." },
  { icon: Globe, title: "Global Access", desc: "Use anywhere." },
  { icon: CreditCard, title: "No Hidden Fees", desc: "$0 monthly fee." },
  { icon: Phone, title: "24/7 Support", desc: "Real humans." },
  { icon: BarChart, title: "Smart Insights", desc: "AI analytics." },
];

export default function Features() {
  return (
    <section className="py-16 md:py-24 px-4 bg-gray-50">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why choose Evestime?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition text-center">
              <f.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
