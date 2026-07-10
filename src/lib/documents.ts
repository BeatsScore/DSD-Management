import { formatCurrency, formatDate, getRentalDays } from "./utils";
import { companyInfo } from "./company";

function escapeHtml(text: string | null | undefined): string {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}



/**
 * Generate a PDF document and trigger a download.
 * Uses html2canvas + jspdf for client-side PDF generation.
 */
export async function generateDocument(
  type: string,
  order: any,
  items: any[],
  _window: Window
): Promise<boolean> {
  const titleMap: Record<string, string> = {
    angebot: "Angebot",
    rechnung: "Rechnung",
    mietvertrag: "Mietvertrag",
    auftragsbestaetigung: "Auftragsbestaetigung",
    ablehnung: "Ablehnung",
  };

  const docTitle = titleMap[type] || type;
  const today = new Date().toLocaleDateString("de-CH");
  const days = getRentalDays(order.start_date, order.end_date);

  // Calculate totals from actual line items
  let lineTotalSum = 0;
  const rows = items
    .map((item) => {
      const lineTotal = (item.price_per_day || 0) * item.quantity * days;
      lineTotalSum += lineTotal;
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;">
            <div style="font-weight:600;color:#111;">${escapeHtml(item.product?.name) || "-"}</div>
            <div style="font-size:11px;color:#888;">${escapeHtml(item.product?.manufacturer) || ""} ${item.product?.product_id ? "(" + escapeHtml(item.product.product_id) + ")" : ""}</div>
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:center;color:#444;">${item.quantity}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:right;color:#444;">${item.price_per_day != null ? formatCurrency(item.price_per_day) : "-"}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:right;font-weight:600;color:#111;">${lineTotal > 0 ? formatCurrency(lineTotal) : "-"}</td>
        </tr>
      `;
    })
    .join("");

  // Discount calculation
  const subtotal = lineTotalSum;
  const rawDiscount = order.discount_amount || 0;
  const discount = order.discount_type === "prozentual" ? subtotal * (rawDiscount / 100) : rawDiscount;
  const netAfterDiscount = Math.max(0, subtotal - discount);
  const total = netAfterDiscount;
  const deposit = subtotal * 0.25; // 25% of un-discounted net

  const discountRow = discount > 0
    ? `<div class="price-row" style="color:#c00;"><span>Rabatt${order.discount_reason ? " (" + escapeHtml(order.discount_reason) + ")" : ""}</span><span>-${formatCurrency(discount)}</span></div>`
    : "";

  const customer = order.customer || {};

  // Build HTML content
  let htmlContent = "";

  if (type === "mietvertrag") {
    const equipmentList = items
      .map(
        (item) =>
          `<tr>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;">${escapeHtml(item.product?.name) || "-"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:center;">${escapeHtml(item.product?.product_id) || "-"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:center;">${item.quantity}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:right;">${item.price_per_day != null ? formatCurrency(item.price_per_day) : "-"}</td>
          </tr>`
      )
      .join("");

    const contractStyles = `
      @page { margin: 0; size: A4; }
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #111;
        background: #fff;
        margin: 0;
        padding: 0;
        line-height: 1.6;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 18px 0 12px;
        border-bottom: 2px solid #000;
        background: #fff;
        margin-bottom: 18px;
      }
      .brand-sub {
        font-size: 11px;
        color: #666;
        margin-top: 6px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .doc-badge {
        background: #000;
        color: #fff;
        padding: 10px 24px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
      }
      h1 {
        font-size: 18px;
        font-weight: 700;
        margin: 22px 0 12px;
        padding-bottom: 6px;
        border-bottom: 2px solid #000;
        page-break-after: avoid;
      }
      h2 {
        font-size: 13px;
        font-weight: 700;
        margin: 16px 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        page-break-after: avoid;
      }
      p, li {
        font-size: 12px;
        color: #333;
        margin: 0 0 8px;
      }
      ul {
        margin: 0 0 12px;
        padding-left: 20px;
      }
      li {
        margin-bottom: 4px;
      }
      .parties {
        display: flex;
        gap: 30px;
        margin: 18px 0;
        page-break-inside: avoid;
      }
      .party {
        flex: 1;
        padding: 14px;
        background: #f9f9f9;
        border: 1px solid #e5e5e5;
      }
      .party-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #999;
        margin-bottom: 6px;
        font-weight: 700;
      }
      .party-name {
        font-size: 14px;
        font-weight: 700;
        color: #000;
        margin-bottom: 4px;
      }
      .party-detail {
        font-size: 12px;
        color: #555;
        line-height: 1.5;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        page-break-inside: avoid;
      }
      thead th {
        padding: 12px;
        text-align: left;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #999;
        font-weight: 700;
        border-bottom: 2px solid #000;
      }
      tbody td {
        font-size: 12px;
      }
      .price-box {
        background: #f5f5f5;
        padding: 14px;
        margin: 18px 0;
        border-left: 3px solid #000;
        page-break-inside: avoid;
      }
      .price-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 13px;
        color: #444;
      }
      .price-row.total {
        font-size: 16px;
        font-weight: 800;
        color: #000;
        border-top: 2px solid #000;
        padding-top: 12px;
        margin-top: 8px;
      }
      .signature-grid {
        display: flex;
        gap: 50px;
        margin-top: 40px;
        page-break-inside: avoid;
      }
      .signature-block {
        flex: 1;
      }
      .signature-line {
        border-bottom: 1px solid #000;
        height: 48px;
        margin-bottom: 6px;
      }
      .signature-label {
        font-size: 11px;
        color: #666;
      }
      .section-number {
        display: inline-block;
        position: relative;
        width: 24px;
        height: 24px;
        background: #000;
        color: #fff;
        border-radius: 50%;
        margin-right: 10px;
        vertical-align: middle;
      }
      .section-number-inner {
        position: absolute;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 12px;
        font-weight: 700;
        font-family: Arial, sans-serif;
        line-height: 1;
      }
      .footer {
        margin-top: 35px;
        padding-top: 12px;
        border-top: 1px solid #e5e5e5;
        font-size: 10px;
        color: #999;
        text-align: center;
      }
    `;

    const headerHtml = `
      <div class="header">
        <div>
          <img src="/logo.png" alt="${companyInfo.name}" style="height:90px;width:auto;object-fit:contain;" />
          <div class="brand-sub">Professionelle Eventtechnik</div>
        </div>
        <div class="doc-badge">Mietvertrag</div>
      </div>
    `;

    const sections = [
      {
        id: "meta",
        html: `<div style="font-size:12px;color:#666;margin-top:15px;margin-bottom:18px;">Auftragsnummer: <strong>${escapeHtml(order.order_number)}</strong> | Datum: ${today}</div>`,
      },
      {
        id: "parties",
        html: `<h1>Vertragsparteien</h1>
        <div class="parties">
          <div class="party">
            <div class="party-label">Vermieter</div>
            <div class="party-name">${companyInfo.legalName}</div>
            <div class="party-detail">
              ${companyInfo.address}<br>
              ${companyInfo.city}<br>
              ${companyInfo.country}<br>
              E-Mail: ${companyInfo.email}
            </div>
          </div>
          <div class="party">
            <div class="party-label">Mieter</div>
            <div class="party-name">${escapeHtml(customer.name) || "-"}</div>
            <div class="party-detail">
              ${customer.company ? escapeHtml(customer.company) + "<br>" : ""}
              ${customer.address ? escapeHtml(customer.address).replace(/\n/g, "<br>") + "<br>" : ""}
              ${customer.phone ? "Tel: " + escapeHtml(customer.phone) + "<br>" : ""}
              ${escapeHtml(customer.email) || ""}
            </div>
          </div>
        </div>`,
      },
      {
        id: "equipment",
        html: `<h1>Mietgegenstand</h1>
        <p>Der Vermieter überlässt dem Mieter folgende Gegenstände zur Miete:</p>
        <table>
          <thead>
            <tr>
              <th>Produkt</th>
              <th style="text-align:center;">Produkt-ID</th>
              <th style="text-align:center;">Menge</th>
              <th style="text-align:right;">Preis / Tag</th>
            </tr>
          </thead>
          <tbody>${equipmentList}</tbody>
        </table>`,
      },
      {
        id: "duration",
        html: `<h1>Mietdauer</h1>
        <p>Die Mietdauer beginnt am <strong>${formatDate(order.start_date)}</strong> und endet am <strong>${formatDate(order.end_date)}</strong>.</p>
        <p>Gesamtdauer: <strong>${days} Tag${days > 1 ? "e" : ""}</strong></p>`,
      },
      {
        id: "price",
        html: `<h1>Mietpreis und Kaution</h1>
        <div class="price-box">
          <div class="price-row"><span>Mietpreis gesamt</span><span>${formatCurrency(subtotal)}</span></div>
          ${discountRow}
          <div class="price-row total"><span>Gesamtbetrag</span><span>${formatCurrency(total)}</span></div>
        </div>
        <p>Der Mieter leistet vor Mietbeginn eine Kaution in Höhe von <strong>${formatCurrency(deposit)}</strong> (25% des unrabattierten Mietwertes). Die Kaution wird innerhalb von 10 Werktagen nach Rückgabe der unbeschädigten Gegenstände zurückerstattet.</p>`,
      },
      {
        id: "agb-header",
        html: `<h1>Allgemeine Geschäftsbedingungen</h1>`,
      },
      {
        id: "agb-1",
        html: `<h2><span class="section-number"><span class="section-number-inner">1</span></span> Übergabe und Rückgabe</h2>
        <p>Die Übergabe der Mietgegenstände erfolgt zu den vereinbarten Bürozeiten. Der Mieter verpflichtet sich, die Gegenstände termingerecht und im gleichen Zustand wie bei Übernahme zurückzugeben. Bei verspäteter Rückgabe werden zusätzliche Miettage in Rechnung gestellt.</p>`,
      },
      {
        id: "agb-2",
        html: `<h2><span class="section-number"><span class="section-number-inner">2</span></span> Transport und Montage</h2>
        <p>Transport, Aufbau und Abbau der Technik können auf Wunsch gegen gesonderte Vergütung durch den Vermieter durchgeführt werden. Sofern der Mieter den Transport selbst übernimmt, haftet er für Beschädigungen während des Transports.</p>`,
      },
      {
        id: "agb-3",
        html: `<h2><span class="section-number"><span class="section-number-inner">3</span></span> Haftung des Mieters</h2>
        <p>Der Mieter haftet für alle während der Mietdauer entstandenen Schäden, Verluste oder Diebstähle der überlassenen Gegenstände. Dies umfasst auch Schäden durch unsachgemässe Bedienung oder falsche Installation.</p>`,
      },
      {
        id: "agb-4",
        html: `<h2><span class="section-number"><span class="section-number-inner">4</span></span> Versicherung</h2>
        <p>Der Mieter ist verpflichtet, eine entsprechende Event-Versicherung abzuschliessen oder den Vermieter schriftlich von der Versicherungspflicht zu entbinden. Ohne Nachweis einer Versicherung wird der Vermieter keine Technik übergeben.</p>`,
      },
      {
        id: "agb-5",
        html: `<h2><span class="section-number"><span class="section-number-inner">5</span></span> Technischer Support</h2>
        <p>Ein technischer Support vor Ort ist auf Anfrage und gegen gesonderte Vergütung möglich. Der Vermieter garantiert die Funktionsfähigkeit der Technik bei ordnungsgemässer Nutzung.</p>`,
      },
      {
        id: "agb-6",
        html: `<h2><span class="section-number"><span class="section-number-inner">6</span></span> Stornierung</h2>
        <p>Stornierungen bis 14 Tage vor Mietbeginn sind kostenfrei. Bei Stornierung zwischen 14 und 7 Tagen vor Mietbeginn werden 50% des Mietpreises fällig. Bei Stornierung innerhalb von 7 Tagen vor Mietbeginn wird der volle Mietpreis fällig.</p>`,
      },
      {
        id: "agb-7",
        html: `<h2><span class="section-number"><span class="section-number-inner">7</span></span> Kaution</h2>
        <p>Die Kaution wird zur Sicherstellung der Rückgabe und des ordnungsgemässen Zustands der Mietgegenstände erhoben. Der Vermieter ist berechtigt, Schäden oder Verluste aus der Kaution zu begleichen.</p>`,
      },
      {
        id: "agb-8",
        html: `<h2><span class="section-number"><span class="section-number-inner">8</span></span> Gewährleistung</h2>
        <p>Der Vermieter übernimmt keine Gewährleistung für den Erfolg der Veranstaltung. Die Haftung des Vermieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.</p>`,
      },
      {
        id: "agb-9",
        html: `<h2><span class="section-number"><span class="section-number-inner">9</span></span> Anwendbares Recht und Gerichtsstand</h2>
        <p>Auf diesen Vertrag ist ausschliesslich schweizerisches Recht anwendbar. Gerichtsstand ist Basel.</p>`,
      },
      {
        id: "signatures",
        html: `<h1>Unterschriften</h1>
        <p style="margin-bottom:30px;">Mit ihrer Unterschrift bestätigen beide Parteien, dass sie die vorstehenden Bedingungen gelesen, verstanden und akzeptiert haben.</p>
        <div class="signature-grid">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Ort, Datum</strong><br>Unterschrift Vermieter</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label"><strong>Ort, Datum</strong><br>Unterschrift Mieter</div>
          </div>
        </div>`,
      },
      {
        id: "footer",
        html: `<div class="footer">${companyInfo.legalName} | ${companyInfo.address} | ${companyInfo.city} | ${companyInfo.email}<br>${companyInfo.bank} | IBAN: ${companyInfo.iban}</div>`,
      },
    ];

    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Mietvertrag - ${escapeHtml(order.order_number)}</title>
          <style>
            @page { margin: 0; size: A4; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111;
              background: #fff;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              padding: 40px 60px;
              position: relative;
              overflow: hidden;
              page-break-after: always;
              background: #fff;
              box-sizing: border-box;
            }
            .page:last-child { page-break-after: auto; }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 18px 0 12px;
              border-bottom: 2px solid #000;
              background: #fff;
              margin-bottom: 18px;
            }
            .brand-sub {
              font-size: 11px;
              color: #666;
              margin-top: 6px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .doc-badge {
              background: #000;
              color: #fff;
              padding: 10px 24px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1.5px;
            }
            h1 {
              font-size: 18px;
              font-weight: 700;
              margin: 22px 0 12px;
              padding-bottom: 6px;
              border-bottom: 2px solid #000;
              page-break-after: avoid;
            }
            h2 {
              font-size: 13px;
              font-weight: 700;
              margin: 16px 0 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              page-break-after: avoid;
            }
            p, li {
              font-size: 12px;
              color: #333;
              margin: 0 0 8px;
            }
            .parties {
              display: flex;
              gap: 30px;
              margin: 18px 0;
              page-break-inside: avoid;
            }
            .party {
              flex: 1;
              padding: 14px;
              background: #f9f9f9;
              border: 1px solid #e5e5e5;
            }
            .party-label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              color: #999;
              margin-bottom: 6px;
              font-weight: 700;
            }
            .party-name {
              font-size: 14px;
              font-weight: 700;
              color: #000;
              margin-bottom: 4px;
            }
            .party-detail {
              font-size: 12px;
              color: #555;
              line-height: 1.5;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            thead th {
              padding: 12px;
              text-align: left;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #999;
              font-weight: 700;
              border-bottom: 2px solid #000;
            }
            tbody td {
              font-size: 12px;
            }
            .price-box {
              background: #f5f5f5;
              padding: 14px;
              margin: 18px 0;
              border-left: 3px solid #000;
              page-break-inside: avoid;
            }
            .price-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: 13px;
              color: #444;
            }
            .price-row.total {
              font-size: 16px;
              font-weight: 800;
              color: #000;
              border-top: 2px solid #000;
              padding-top: 12px;
              margin-top: 8px;
            }
            .signature-grid {
              display: flex;
              gap: 50px;
              margin-top: 40px;
              page-break-inside: avoid;
            }
            .signature-block {
              flex: 1;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              height: 48px;
              margin-bottom: 6px;
            }
            .signature-label {
              font-size: 11px;
              color: #666;
            }
            .section-number {
              display: inline-block;
              position: relative;
              width: 24px;
              height: 24px;
              background: #000;
              color: #fff;
              border-radius: 50%;
              margin-right: 10px;
              vertical-align: middle;
            }
            .section-number-inner {
              position: absolute;
              top: 45%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 12px;
              font-weight: 700;
              font-family: Arial, sans-serif;
              line-height: 1;
            }
            .footer {
              margin-top: 35px;
              padding-top: 12px;
              border-top: 1px solid #e5e5e5;
              font-size: 10px;
              color: #999;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <!-- Seite 1: Vertragsparteien + Mietgegenstand + Mietdauer + Mietpreis -->
          <div class="page">
            ${headerHtml}
            ${sections.find(s => s.id === "meta")?.html || ""}
            ${sections.find(s => s.id === "parties")?.html || ""}
            ${sections.find(s => s.id === "equipment")?.html || ""}
            ${sections.find(s => s.id === "duration")?.html || ""}
            ${sections.find(s => s.id === "price")?.html || ""}
          </div>

          <!-- Seite 2: AGB Punkte 1-8 -->
          <div class="page">
            ${headerHtml}
            ${sections.find(s => s.id === "agb-header")?.html || ""}
            ${sections.find(s => s.id === "agb-1")?.html || ""}
            ${sections.find(s => s.id === "agb-2")?.html || ""}
            ${sections.find(s => s.id === "agb-3")?.html || ""}
            ${sections.find(s => s.id === "agb-4")?.html || ""}
            ${sections.find(s => s.id === "agb-5")?.html || ""}
            ${sections.find(s => s.id === "agb-6")?.html || ""}
            ${sections.find(s => s.id === "agb-7")?.html || ""}
            ${sections.find(s => s.id === "agb-8")?.html || ""}
          </div>

          <!-- Seite 3: AGB Punkt 9 + Unterschriften -->
          <div class="page">
            ${headerHtml}
            ${sections.find(s => s.id === "agb-9")?.html || ""}
            ${sections.find(s => s.id === "signatures")?.html || ""}
            ${sections.find(s => s.id === "footer")?.html || ""}
          </div>
        </body>
      </html>
    `;
  } else {
    // Default template for angebot, rechnung, auftragsbestaetigung, ablehnung
    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(docTitle)} - ${escapeHtml(order.order_number)}</title>
          <style>
            @page { margin: 0; size: A4; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111;
              background: #fff;
              margin: 0;
              padding: 0;
            }
            .page {
              max-width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 30px 60px 50px;
              position: relative;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 18px 0 12px;
              border-bottom: 2px solid #000;
              background: #fff;
              margin-bottom: 18px;
            }
            .brand-sub {
              font-size: 11px;
              color: #666;
              margin-top: 6px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .doc-badge {
              background: #000;
              color: #fff;
              padding: 10px 24px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1.5px;
            }
            .meta-grid {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              margin-bottom: 28px;
            }
            .meta-block {
              max-width: 280px;
            }
            .meta-label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              color: #999;
              margin-bottom: 6px;
              font-weight: 600;
            }
            .meta-value {
              font-size: 14px;
              line-height: 1.6;
              color: #333;
            }
            .meta-value strong {
              color: #000;
              font-size: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
              page-break-inside: avoid;
            }
            thead th {
              padding: 14px 12px;
              text-align: left;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #999;
              font-weight: 700;
              border-bottom: 2px solid #000;
            }
            thead th:last-child {
              text-align: right;
            }
            tbody tr:last-child td {
              border-bottom: 2px solid #000;
            }
            .summary {
              width: 280px;
              margin-left: auto;
              margin-top: 20px;
              page-break-inside: avoid;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 7px 0;
              font-size: 13px;
              color: #555;
              border-bottom: 1px solid #eee;
            }
            .summary-row:last-child {
              border-bottom: none;
              padding-top: 12px;
              margin-top: 4px;
              border-top: 2px solid #000;
            }
            .summary-row.total {
              font-size: 16px;
              font-weight: 800;
              color: #000;
            }
            .footer {
              margin-top: 45px;
              padding-top: 16px;
              border-top: 1px solid #e5e5e5;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #999;
              line-height: 1.7;
            }
            .footer strong {
              color: #333;
              font-size: 11px;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 80px;
              font-weight: 900;
              color: rgba(0,0,0,0.03);
              pointer-events: none;
              z-index: 0;
              text-transform: uppercase;
              letter-spacing: 8px;
            }
            .content { position: relative; z-index: 1; }
            .notice {
              margin-top: 25px;
              padding: 14px;
              background: #f9f9f9;
              border-left: 3px solid #000;
              font-size: 12px;
              color: #555;
              line-height: 1.5;
              page-break-inside: avoid;
            }
            .notice-title {
              font-weight: 700;
              color: #000;
              margin-bottom: 4px;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="watermark">${docTitle}</div>
            <div class="content">
              <div class="header">
                <div>
                  <img src="/logo.png" alt="${companyInfo.name}" style="height:90px;width:auto;object-fit:contain;" />
                  <div class="brand-sub">Professionelle Eventtechnik</div>
                </div>
                <div class="doc-badge">${docTitle}</div>
              </div>

              <div class="meta-grid">
                <div class="meta-block">
                  <div class="meta-label">Kunde</div>
                  <div class="meta-value">
                    <strong>${escapeHtml(customer.name) || "-"}</strong><br>
                    ${customer.company ? escapeHtml(customer.company) + "<br>" : ""}
                    ${customer.address ? escapeHtml(customer.address).replace(/\n/g, "<br>") + "<br>" : ""}
                    ${customer.phone ? "Tel: " + escapeHtml(customer.phone) + "<br>" : ""}
                    ${escapeHtml(customer.email) || ""}
                  </div>
                </div>
                <div class="meta-block" style="text-align:right;">
                  <div class="meta-label">Auftragsdetails</div>
                  <div class="meta-value">
                    <strong>${escapeHtml(order.order_number)}</strong><br>
                    Datum: ${today}<br>
                    Zeitraum: ${formatDate(order.start_date)} – ${formatDate(order.end_date)}<br>
                    Dauer: ${days} Tag${days > 1 ? "e" : ""}
                  </div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width:50%;">Produkt</th>
                    <th style="width:15%;text-align:center;">Menge</th>
                    <th style="width:20%;text-align:right;">Preis / Tag</th>
                    <th style="width:20%;text-align:right;">Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>

              <div class="summary">
                <div class="summary-row">
                  <span>Zwischensumme</span>
                  <span>${formatCurrency(subtotal)}</span>
                </div>
                ${discount > 0 ? `<div class="summary-row" style="color:#c00;"><span>Rabatt${order.discount_reason ? " (" + escapeHtml(order.discount_reason) + ")" : ""}</span><span>-${formatCurrency(discount)}</span></div>` : ""}
                <div class="summary-row total">
                  <span>Gesamtbetrag</span>
                  <span>${formatCurrency(total)}</span>
                </div>
              </div>

              <div class="notice">
                <div class="notice-title">Hinweis</div>
                ${type === "rechnung" ? "Zahlbar innerhalb von 14 Tagen ab Rechnungsdatum ohne Abzug. Bei Überschreitung des Zahlungstermins werden Verzugszinsen in Höhe von 5% berechnet." : type === "angebot" ? "Dieses Angebot ist 30 Tage gültig. Preisänderungen vorbehalten. Die Vermietung erfolgt nach Verfügbarkeit." : type === "auftragsbestaetigung" ? "Wir bestätigen hiermit Ihren Auftrag. Die Abholung erfolgt am vereinbarten Datum zu den Bürozeiten." : "Wir bedanken uns für Ihr Interesse. Bei Fragen stehen wir Ihnen gerne zur Verfügung."}
              </div>

              <div class="footer">
                <div>
                  <strong>${companyInfo.legalName}</strong><br>
                  ${companyInfo.address}<br>
                  ${companyInfo.city}, ${companyInfo.country}<br>
                  ${companyInfo.email}
                </div>
                <div style="text-align:center;">
                  <strong>Kontakt</strong><br>
                  ${companyInfo.email}
                </div>
                <div style="text-align:right;">
                  <strong>Bankverbindung</strong><br>
                  ${companyInfo.bank}<br>
                  IBAN: ${companyInfo.iban}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Create hidden iframe, render HTML, capture with html2canvas, generate PDF
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";
    document.body.appendChild(iframe);

    iframe.onload = async () => {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait for images to load
      const images = Array.from(iframeDoc.images);
      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((imgResolve) => {
              if (img.complete) {
                imgResolve();
              } else {
                img.onload = () => imgResolve();
                img.onerror = () => imgResolve();
              }
            })
        )
      );

      // Small delay to ensure rendering
      await new Promise((r) => setTimeout(r, 500));

      try {
        const { default: html2canvas } = await import("html2canvas");
        const { jsPDF } = await import("jspdf");

        const pageEls = iframeDoc.querySelectorAll(".page") as NodeListOf<HTMLElement>;
        if (!pageEls.length) {
          document.body.removeChild(iframe);
          resolve(false);
          return;
        }

        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();

        for (let i = 0; i < pageEls.length; i++) {
          const pageEl = pageEls[i];
          const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
          });

          const imgData = canvas.toDataURL("image/png");
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = pdfWidth / imgWidth;

          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight * ratio);
        }

        const fileName = `${type}_${order.order_number}_${new Date().toISOString().slice(0, 10)}.pdf`;
        pdf.save(fileName);

        document.body.removeChild(iframe);
        resolve(true);
      } catch (err) {
        console.error("PDF generation error:", err);
        document.body.removeChild(iframe);
        resolve(false);
      }
    };

    // Trigger load
    iframe.src = "about:blank";
  });
}

/**
 * Open a document in print preview (for the "Print" action in history).
 */
export function printDocument(
  type: string,
  order: any,
  items: any[],
  window: Window
): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const titleMap: Record<string, string> = {
    angebot: "Angebot",
    rechnung: "Rechnung",
    mietvertrag: "Mietvertrag",
    auftragsbestaetigung: "Auftragsbestaetigung",
    ablehnung: "Ablehnung",
  };

  const docTitle = titleMap[type] || type;
  const today = new Date().toLocaleDateString("de-CH");
  const days = getRentalDays(order.start_date, order.end_date);

  let lineTotalSum = 0;
  const rows = items
    .map((item) => {
      const lineTotal = (item.price_per_day || 0) * item.quantity * days;
      lineTotalSum += lineTotal;
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;">
            <div style="font-weight:600;color:#111;">${escapeHtml(item.product?.name) || "-"}</div>
            <div style="font-size:11px;color:#888;">${escapeHtml(item.product?.manufacturer) || ""} ${item.product?.product_id ? "(" + escapeHtml(item.product.product_id) + ")" : ""}</div>
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:center;color:#444;">${item.quantity}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:right;color:#444;">${item.price_per_day != null ? formatCurrency(item.price_per_day) : "-"}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:right;font-weight:600;color:#111;">${lineTotal > 0 ? formatCurrency(lineTotal) : "-"}</td>
        </tr>
      `;
    })
    .join("");

  const subtotal = lineTotalSum;
  const rawDiscount = order.discount_amount || 0;
  const discount = order.discount_type === "prozentual" ? subtotal * (rawDiscount / 100) : rawDiscount;
  const netAfterDiscount = Math.max(0, subtotal - discount);
  const total = netAfterDiscount;
  const deposit = subtotal * 0.25;
  const customer = order.customer || {};

  const discountRowPrint = discount > 0
    ? `<div class="price-row" style="color:#c00;"><span>Rabatt${order.discount_reason ? " (" + escapeHtml(order.discount_reason) + ")" : ""}</span><span>-${formatCurrency(discount)}</span></div>`
    : "";

  if (type === "mietvertrag") {
    const equipmentList = items
      .map(
        (item) =>
          `<tr>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;">${escapeHtml(item.product?.name) || "-"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:center;">${escapeHtml(item.product?.product_id) || "-"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:center;">${item.quantity}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:right;">${item.price_per_day != null ? formatCurrency(item.price_per_day) : "-"}</td>
          </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Mietvertrag - ${escapeHtml(order.order_number)}</title>
          <style>
            @page { margin: 0; size: A4; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111;
              background: #fff;
              margin: 0;
              padding: 0;
              line-height: 1.6;
            }
            .page {
              max-width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 155px 60px 50px;
              position: relative;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 18px 0 12px;
              border-bottom: 2px solid #000;
              background: #fff;
              margin-bottom: 18px;
            }
            .brand-sub {
              font-size: 11px;
              color: #666;
              margin-top: 6px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .doc-badge {
              background: #000;
              color: #fff;
              padding: 10px 24px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1.5px;
            }
            h1 {
              font-size: 18px;
              font-weight: 700;
              margin: 22px 0 12px;
              padding-bottom: 6px;
              border-bottom: 2px solid #000;
              page-break-after: avoid;
            }
            h2 {
              font-size: 13px;
              font-weight: 700;
              margin: 16px 0 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              page-break-after: avoid;
            }
            p, li {
              font-size: 12px;
              color: #333;
              margin: 0 0 8px;
            }
            ul {
              margin: 0 0 12px;
              padding-left: 20px;
            }
            li {
              margin-bottom: 4px;
            }
            .parties {
              display: flex;
              gap: 30px;
              margin: 18px 0;
              page-break-inside: avoid;
            }
            .party {
              flex: 1;
              padding: 14px;
              background: #f9f9f9;
              border: 1px solid #e5e5e5;
            }
            .party-label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              color: #999;
              margin-bottom: 6px;
              font-weight: 700;
            }
            .party-name {
              font-size: 14px;
              font-weight: 700;
              color: #000;
              margin-bottom: 4px;
            }
            .party-detail {
              font-size: 12px;
              color: #555;
              line-height: 1.5;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            thead th {
              padding: 12px;
              text-align: left;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #999;
              font-weight: 700;
              border-bottom: 2px solid #000;
            }
            tbody td {
              font-size: 12px;
            }
            .price-box {
              background: #f5f5f5;
              padding: 14px;
              margin: 18px 0;
              border-left: 3px solid #000;
              page-break-inside: avoid;
            }
            .price-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: 13px;
              color: #444;
            }
            .price-row.total {
              font-size: 16px;
              font-weight: 800;
              color: #000;
              border-top: 2px solid #000;
              padding-top: 12px;
              margin-top: 8px;
            }
            .signature-grid {
              display: flex;
              gap: 50px;
              margin-top: 40px;
              page-break-inside: avoid;
            }
            .signature-block {
              flex: 1;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              height: 48px;
              margin-bottom: 6px;
            }
            .signature-label {
              font-size: 11px;
              color: #666;
            }
            .section-number {
              display: inline-block;
              position: relative;
              width: 24px;
              height: 24px;
              background: #000;
              color: #fff;
              border-radius: 50%;
              margin-right: 10px;
              vertical-align: middle;
            }
            .section-number-inner {
              position: absolute;
              top: 45%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 12px;
              font-weight: 700;
              font-family: Arial, sans-serif;
              line-height: 1;
            }
            .footer {
              margin-top: 35px;
              padding-top: 12px;
              border-top: 1px solid #e5e5e5;
              font-size: 10px;
              color: #999;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div>
                <img src="/logo.png" alt="${companyInfo.name}" style="height:90px;width:auto;object-fit:contain;" />
                <div class="brand-sub">Professionelle Eventtechnik</div>
              </div>
              <div class="doc-badge">Mietvertrag</div>
            </div>

            <div style="font-size:12px;color:#666;margin-top:15px;margin-bottom:18px;">
              Auftragsnummer: <strong>${escapeHtml(order.order_number)}</strong> | Datum: ${today}
            </div>

            <h1>Vertragsparteien</h1>
            <div class="parties">
              <div class="party">
                <div class="party-label">Vermieter</div>
                <div class="party-name">${companyInfo.legalName}</div>
                <div class="party-detail">
                  ${companyInfo.address}<br>
                  ${companyInfo.city}<br>
                  ${companyInfo.country}<br>
                  E-Mail: ${companyInfo.email}
                </div>
              </div>
              <div class="party">
                <div class="party-label">Mieter</div>
                <div class="party-name">${escapeHtml(customer.name) || "-"}</div>
                <div class="party-detail">
                  ${customer.company ? escapeHtml(customer.company) + "<br>" : ""}
                  ${customer.address ? escapeHtml(customer.address).replace(/\n/g, "<br>") + "<br>" : ""}
                  ${customer.phone ? "Tel: " + escapeHtml(customer.phone) + "<br>" : ""}
                  ${escapeHtml(customer.email) || ""}
                </div>
              </div>
            </div>

            <h1>Mietgegenstand</h1>
            <p>Der Vermieter überlässt dem Mieter folgende Gegenstände zur Miete:</p>
            <table>
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th style="text-align:center;">Produkt-ID</th>
                  <th style="text-align:center;">Menge</th>
                  <th style="text-align:right;">Preis / Tag</th>
                </tr>
              </thead>
              <tbody>${equipmentList}</tbody>
            </table>

            <h1>Mietdauer</h1>
            <p>Die Mietdauer beginnt am <strong>${formatDate(order.start_date)}</strong> und endet am <strong>${formatDate(order.end_date)}</strong>.</p>
            <p>Gesamtdauer: <strong>${days} Tag${days > 1 ? "e" : ""}</strong></p>

            <h1>Mietpreis und Kaution</h1>
            <div class="price-box">
              <div class="price-row">
                <span>Mietpreis gesamt</span>
                <span>${formatCurrency(subtotal)}</span>
              </div>
              ${discountRowPrint}
              <div class="price-row total">
                <span>Gesamtbetrag</span>
                <span>${formatCurrency(total)}</span>
              </div>
            </div>
            <p>Der Mieter leistet vor Mietbeginn eine Kaution in Höhe von <strong>${formatCurrency(deposit)}</strong> (25% des unrabattierten Mietwertes). Die Kaution wird innerhalb von 10 Werktagen nach Rückgabe der unbeschädigten Gegenstände zurückerstattet.</p>

            <h1>Allgemeine Geschäftsbedingungen</h1>

            <h2><span class="section-number"><span class="section-number-inner">1</span></span> Übergabe und Rückgabe</h2>
            <p>Die Übergabe der Mietgegenstände erfolgt zu den vereinbarten Bürozeiten. Der Mieter verpflichtet sich, die Gegenstände termingerecht und im gleichen Zustand wie bei Übernahme zurückzugeben. Bei verspäteter Rückgabe werden zusätzliche Miettage in Rechnung gestellt.</p>

            <h2><span class="section-number"><span class="section-number-inner">2</span></span> Transport und Montage</h2>
            <p>Transport, Aufbau und Abbau der Technik können auf Wunsch gegen gesonderte Vergütung durch den Vermieter durchgeführt werden. Sofern der Mieter den Transport selbst übernimmt, haftet er für Beschädigungen während des Transports.</p>

            <h2><span class="section-number"><span class="section-number-inner">3</span></span> Haftung des Mieters</h2>
            <p>Der Mieter haftet für alle während der Mietdauer entstandenen Schäden, Verluste oder Diebstähle der überlassenen Gegenstände. Dies umfasst auch Schäden durch unsachgemässe Bedienung oder falsche Installation.</p>

            <h2><span class="section-number"><span class="section-number-inner">4</span></span> Versicherung</h2>
            <p>Der Mieter ist verpflichtet, eine entsprechende Event-Versicherung abzuschliessen oder den Vermieter schriftlich von der Versicherungspflicht zu entbinden. Ohne Nachweis einer Versicherung wird der Vermieter keine Technik übergeben.</p>

            <h2><span class="section-number"><span class="section-number-inner">5</span></span> Technischer Support</h2>
            <p>Ein technischer Support vor Ort ist auf Anfrage und gegen gesonderte Vergütung möglich. Der Vermieter garantiert die Funktionsfähigkeit der Technik bei ordnungsgemässer Nutzung.</p>

            <h2><span class="section-number"><span class="section-number-inner">6</span></span> Stornierung</h2>
            <p>Stornierungen bis 14 Tage vor Mietbeginn sind kostenfrei. Bei Stornierung zwischen 14 und 7 Tagen vor Mietbeginn werden 50% des Mietpreises fällig. Bei Stornierung innerhalb von 7 Tagen vor Mietbeginn wird der volle Mietpreis fällig.</p>

            <h2><span class="section-number"><span class="section-number-inner">7</span></span> Kaution</h2>
            <p>Die Kaution wird zur Sicherstellung der Rückgabe und des ordnungsgemässen Zustands der Mietgegenstände erhoben. Der Vermieter ist berechtigt, Schäden oder Verluste aus der Kaution zu begleichen.</p>

            <h2><span class="section-number"><span class="section-number-inner">8</span></span> Gewährleistung</h2>
            <p>Der Vermieter übernimmt keine Gewährleistung für den Erfolg der Veranstaltung. Die Haftung des Vermieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.</p>

            <h2><span class="section-number"><span class="section-number-inner">9</span></span> Anwendbares Recht und Gerichtsstand</h2>
            <p>Auf diesen Vertrag ist ausschliesslich schweizerisches Recht anwendbar. Gerichtsstand ist Basel.</p>

            <h1>Unterschriften</h1>
            <p style="margin-bottom:30px;">Mit ihrer Unterschrift bestätigen beide Parteien, dass sie die vorstehenden Bedingungen gelesen, verstanden und akzeptiert haben.</p>

            <div class="signature-grid">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">
                  <strong>Ort, Datum</strong><br>
                  Unterschrift Vermieter
                </div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-label">
                  <strong>Ort, Datum</strong><br>
                  Unterschrift Mieter
                </div>
              </div>
            </div>

            <div class="footer">
              ${companyInfo.legalName} | ${companyInfo.address} | ${companyInfo.city} | ${companyInfo.email}<br>
              ${companyInfo.bank} | IBAN: ${companyInfo.iban}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    return true;
  }

  // Default template for print preview
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(docTitle)} - ${escapeHtml(order.order_number)}</title>
        <style>
          @page { margin: 0; size: A4; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .page {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 30px 60px 50px;
            position: relative;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 18px 0 12px;
            border-bottom: 2px solid #000;
            background: #fff;
            margin-bottom: 18px;
          }
          .brand-sub {
            font-size: 11px;
            color: #666;
            margin-top: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .doc-badge {
            background: #000;
            color: #fff;
            padding: 10px 24px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .meta-grid {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            margin-bottom: 28px;
          }
          .meta-block {
            max-width: 280px;
          }
          .meta-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #999;
            margin-bottom: 6px;
            font-weight: 600;
          }
          .meta-value {
            font-size: 14px;
            line-height: 1.6;
            color: #333;
          }
          .meta-value strong {
            color: #000;
            font-size: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          thead th {
            padding: 14px 12px;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #999;
            font-weight: 700;
            border-bottom: 2px solid #000;
          }
          thead th:last-child {
            text-align: right;
          }
          tbody tr:last-child td {
            border-bottom: 2px solid #000;
          }
          .summary {
            width: 280px;
            margin-left: auto;
            margin-top: 20px;
            page-break-inside: avoid;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 7px 0;
            font-size: 13px;
            color: #555;
            border-bottom: 1px solid #eee;
          }
          .summary-row:last-child {
            border-bottom: none;
            padding-top: 12px;
            margin-top: 4px;
            border-top: 2px solid #000;
          }
          .summary-row.total {
            font-size: 16px;
            font-weight: 800;
            color: #000;
          }
          .footer {
            margin-top: 45px;
            padding-top: 16px;
            border-top: 1px solid #e5e5e5;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #999;
            line-height: 1.7;
          }
          .footer strong {
            color: #333;
            font-size: 11px;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px;
            font-weight: 900;
            color: rgba(0,0,0,0.03);
            pointer-events: none;
            z-index: 0;
            text-transform: uppercase;
            letter-spacing: 8px;
          }
          .content { position: relative; z-index: 1; }
          .notice {
            margin-top: 25px;
            padding: 14px;
            background: #f9f9f9;
            border-left: 3px solid #000;
            font-size: 12px;
            color: #555;
            line-height: 1.5;
            page-break-inside: avoid;
          }
          .notice-title {
            font-weight: 700;
            color: #000;
            margin-bottom: 4px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          @media print {
            .page { padding: 150px 50px 40px; }
            .header { padding: 16px 50px 14px; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="watermark">${docTitle}</div>
          <div class="content">
            <div class="header">
              <div>
                <img src="/logo.png" alt="${companyInfo.name}" style="height:90px;width:auto;object-fit:contain;" />
                <div class="brand-sub">Professionelle Eventtechnik</div>
              </div>
              <div class="doc-badge">${docTitle}</div>
            </div>

            <div class="meta-grid">
              <div class="meta-block">
                <div class="meta-label">Kunde</div>
                <div class="meta-value">
                  <strong>${escapeHtml(customer.name) || "-"}</strong><br>
                  ${customer.company ? escapeHtml(customer.company) + "<br>" : ""}
                  ${customer.address ? escapeHtml(customer.address).replace(/\n/g, "<br>") + "<br>" : ""}
                  ${customer.phone ? "Tel: " + escapeHtml(customer.phone) + "<br>" : ""}
                  ${escapeHtml(customer.email) || ""}
                </div>
              </div>
              <div class="meta-block" style="text-align:right;">
                <div class="meta-label">Auftragsdetails</div>
                <div class="meta-value">
                  <strong>${escapeHtml(order.order_number)}</strong><br>
                  Datum: ${today}<br>
                  Zeitraum: ${formatDate(order.start_date)} – ${formatDate(order.end_date)}<br>
                  Dauer: ${days} Tag${days > 1 ? "e" : ""}
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:50%;">Produkt</th>
                  <th style="width:15%;text-align:center;">Menge</th>
                  <th style="width:20%;text-align:right;">Preis / Tag</th>
                  <th style="width:20%;text-align:right;">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row">
                <span>Zwischensumme</span>
                <span>${formatCurrency(subtotal)}</span>
              </div>
              ${discount > 0 ? `<div class="summary-row" style="color:#c00;"><span>Rabatt${order.discount_reason ? " (" + escapeHtml(order.discount_reason) + ")" : ""}</span><span>-${formatCurrency(discount)}</span></div>` : ""}
              <div class="summary-row total">
                <span>Gesamtbetrag</span>
                <span>${formatCurrency(total)}</span>
              </div>
            </div>

            <div class="notice">
              <div class="notice-title">Hinweis</div>
              ${type === "rechnung" ? "Zahlbar innerhalb von 14 Tagen ab Rechnungsdatum ohne Abzug. Bei Überschreitung des Zahlungstermins werden Verzugszinsen in Höhe von 5% berechnet." : type === "angebot" ? "Dieses Angebot ist 30 Tage gültig. Preisänderungen vorbehalten. Die Vermietung erfolgt nach Verfügbarkeit." : type === "auftragsbestaetigung" ? "Wir bestätigen hiermit Ihren Auftrag. Die Abholung erfolgt am vereinbarten Datum zu den Bürozeiten." : "Wir bedanken uns für Ihr Interesse. Bei Fragen stehen wir Ihnen gerne zur Verfügung."}
            </div>

            <div class="footer">
              <div>
                <strong>${companyInfo.legalName}</strong><br>
                ${companyInfo.address}<br>
                ${companyInfo.city}, ${companyInfo.country}<br>
                ${companyInfo.email}
              </div>
              <div style="text-align:center;">
                <strong>Kontakt</strong><br>
                ${companyInfo.email}
              </div>
              <div style="text-align:right;">
                <strong>Bankverbindung</strong><br>
                ${companyInfo.bank}<br>
                IBAN: ${companyInfo.iban}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
  return true;
}
