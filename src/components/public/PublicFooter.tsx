import Link from "next/link";
import { Volume2, Mail, Phone, MapPin } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-gray-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Volume2 className="w-5 h-5 text-white" />
              <span className="font-bold text-white">DSD Management</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Professionelle Eventtechnik zur Miete. Zuverlaessig, flexibel und 
              immer für Sie da.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/katalog/" className="hover:text-white transition-colors">Katalog</Link></li>
              <li><Link href="/anfrage/" className="hover:text-white transition-colors">Anfrage</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-4">Kontakt</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> info@dsdmanagement.ch</li>
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +41 44 123 45 67</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Zürich, Schweiz</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-xs text-gray-500 text-center">
          &copy; {new Date().getFullYear()} DSD Management. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  );
}
