import Link from "next/link";
import {
  Volume2,
  Lightbulb,
  Package,
  Clock,
  Headphones,
  Award,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gray-950 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-gray-950" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              Professionelle Eventtechnik zur Miete
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
              Zuverlaessig und flexibel. Wir liefern hochwertige Sound- und Lichttechnik 
              für Ihr Event - von kleinen Feiern bis zu grossen Firmenevents.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/katalog/" className="btn-accent">
                Katalog ansehen <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link href="/anfrage/" className="btn-secondary bg-transparent text-white border-white/30 hover:bg-white/10">
                Anfrage stellen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Leistungen */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="page-header mb-4">Unsere Leistungen</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Alles aus einer Hand - von der Planung bis zur Umsetzung begleiten wir 
              Sie mit professioneller Eventtechnik.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Volume2 className="w-6 h-6 text-black" />
              </div>
              <h3 className="section-header mb-2">Soundtechnik</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Hochwertige Lautsprecher, Mischpulte, Mikrofone und Verstaerker für 
                beste Tonqualitaet bei jedem Event.
              </p>
            </div>
            <div className="card text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-6 h-6 text-black" />
              </div>
              <h3 className="section-header mb-2">Lichttechnik</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Scheinwerfer, Moving Heads, LED-Technik und Lichtsteuerung für 
                atemberaubende Lichtstimmungen.
              </p>
            </div>
            <div className="card text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-6 h-6 text-black" />
              </div>
              <h3 className="section-header mb-2">Komplettlösungen</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Individuell zusammengestellte Pakete aus Sound, Licht und Zubehör 
                für Ihr spezifisches Event.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vorteile */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="page-header mb-4">Warum DSD Management?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <Award className="w-8 h-8 text-accent mb-3" />
              <h3 className="font-semibold mb-1">Hochwertige Technik</h3>
              <p className="text-sm text-gray-600">
                Nur Markenprodukte von renommierten Herstellern in 
                einwandfreiem Zustand.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Clock className="w-8 h-8 text-accent mb-3" />
              <h3 className="font-semibold mb-1">Schnelle Verfügbarkeit</h3>
              <p className="text-sm text-gray-600">
                Grosse Lagerhaltung ermöglicht kurzfristige Mietungen 
                und flexible Termine.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Headphones className="w-8 h-8 text-accent mb-3" />
              <h3 className="font-semibold mb-1">Professioneller Support</h3>
              <p className="text-sm text-gray-600">
                Erfahrenes Team berät Sie und steht während des Events 
                jederzeit zur Verfuegung.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Bereit für Ihr nächstes Event?
          </h2>
          <p className="text-gray-300 mb-8">
            Kontaktieren Sie uns jetzt und erhalten Sie ein unverbindliches Angebot 
            für Ihre Eventtechnik.
          </p>
          <Link href="/anfrage/" className="btn-accent">
            Jetzt Anfrage stellen <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
}
