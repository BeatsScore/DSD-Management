import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-lg text-gray-600 mb-8">
          Diese Seite wurde nicht gefunden.
        </p>
        <Link href="/" className="btn-primary">
          <ArrowLeft className="w-4 h-4 mr-2" /> Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
