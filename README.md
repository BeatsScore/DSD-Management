# DSD Management

Vollstaendige Webanwendung fuer die Vermietung von Eventequipment (Sound- und Lichttechnik) fuer B2B- und B2C-Kunden.

## Technologie-Stack

- **Frontend/Backend:** Next.js 15 (App Router)
- **Hosting:** Vercel
- **Datenbank & Backend:** Supabase (PostgreSQL)
- **Authentifizierung:** Supabase Auth mit Rollen (admin, staff, customer)
- **Storage:** Supabase Storage
- **Realtime:** Supabase Realtime
- **Styling:** Tailwind CSS

## Features

### Oeffentliche Website
- Landingpage mit Hero, Leistungen, Vorteilen und Trust-Elementen
- Miet- und Verleihkatalog mit Filter
- Produktdetailseiten
- Anfrage-System

### Admin & Operations
- **Dashboard:** Uebersicht mit Statistiken
- **Inventarsystem:** CRUD, automatische Produkt-ID, Barcode-Generierung, Statusverwaltung
- **Auftragsmanagement:** Auftragserstellung, Kunden-/Produktzuweisung, Status-Workflow
- **Auftragsplaner:** Kalenderansicht, Barcode-Scan-Workflow fuer Abholungen
- **Kundenservice:** Kundenuebersicht, Auftragshistorie, interne Notizen
- **Dokumente:** Angebot, Rechnung, Mietvertrag, Auftragsbestaetigung, Ablehnung (PDF-Druck)

## Einrichtung

### 1. Supabase Projekt erstellen

1. Erstellen Sie ein neues Projekt auf [supabase.com](https://supabase.com)
2. Kopieren Sie die Projekt-URL und den Anon Key in die `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://ihr-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ihr-anon-key
SUPABASE_SERVICE_ROLE_KEY=ihr-service-role-key
```

### 2. Datenbank-Schema einspielen

Oeffnen Sie den SQL-Editor in der Supabase Console und fuehren Sie den Inhalt von `supabase/schema.sql` aus.

### 3. Ersten Admin-Benutzer erstellen

Registrieren Sie einen Benutzer ueber Supabase Auth (z. B. via Email) und setzen Sie die Rolle manuell auf `admin`:

```sql
update public.profiles set role = 'admin' where email = 'ihre-email@beispiel.ch';
```

### 4. Lokale Entwicklung

```bash
npm install
npm run dev
```

### 5. Deployment auf Vercel

1. Verbinden Sie das Repository mit Vercel
2. Fuegen Sie die Umgebungsvariablen in den Vercel-Projekteinstellungen hinzu
3. Deployen

## Rollen

- **admin:** Vollzugriff auf alle Funktionen
- **staff:** Zugriff auf Dashboard, Inventar, Auftraege, Planer, Kunden
- **customer:** Nur oeffentliche Seiten und Anfragen

## Barcode-System

Der Barcode-Scanner im Planer funktioniert mit:
- Hardware-Scannern (USB/Bluetooth) - senden Tastatureingaben
- Mobilen Kamerascannern - Barcode in das Eingabefeld scannen

## Wichtiger Hinweis

Da die Website in der Schweiz gehostet wird, wird durchgaengig "ss" anstelle des scharfen S (ß) verwendet.
