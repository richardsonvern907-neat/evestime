import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div><h3 className="text-xl font-bold mb-4">Evestime</h3><p className="text-gray-400">Modern banking for everyone.</p></div>
          <div><h4 className="font-semibold mb-3">Product</h4><ul className="space-y-2 text-gray-400"><li><Link href="#">Personal</Link></li><li><Link href="#">Business</Link></li><li><Link href="#">Pricing</Link></li></ul></div>
          <div><h4 className="font-semibold mb-3">Company</h4><ul className="space-y-2 text-gray-400"><li><Link href="#">About</Link></li><li><Link href="#">Careers</Link></li><li><Link href="#">Press</Link></li></ul></div>
          <div><h4 className="font-semibold mb-3">Legal</h4><ul className="space-y-2 text-gray-400"><li><Link href="#">Privacy</Link></li><li><Link href="#">Terms</Link></li><li><Link href="#">Security</Link></li></ul></div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} Evestime Bank. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
