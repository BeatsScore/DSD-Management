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

const titleMap: Record<string, string> = {
  angebot: "Angebot",
  rechnung: "Rechnung",
  mietvertrag: "Mietvertrag",
  auftragsbestaetigung: "Auftragsbestaetigung",
  ablehnung: "Ablehnung",
};

// Approximate row capacities for A4 pages with the current styling.
const MAX_ROWS_FIRST_PAGE = 8;
const MAX_ROWS_OTHER_PAGES = 14;

function itemDisplayName(item: any): string {
  if (item.set?.name) return `[Set] ${item.set.name}`;
  return item.product?.name || "-";
}

function itemDisplaySubtitle(item: any): string {
  if (item.set?.name) return "Produktset";
  const manufacturer = item.product?.manufacturer || "";
  const productId = item.product?.product_id || "";
  return [manufacturer, productId ? `(${productId})` : ""].filter(Boolean).join(" ");
}

function prepareData(type: string, order: any, items: any[]) {
  const docTitle = titleMap[type] || type;
  const today = new Date().toLocaleDateString("de-CH");
  const days = getRentalDays(order.start_date, order.end_date);
  const customer = order.customer || {};

  let lineTotalSum = 0;
  const lineItems = items.map((item) => {
    const lineTotal = (item.price_per_day || 0) * item.quantity * days;
    lineTotalSum += lineTotal;
    return { ...item, lineTotal };
  });

  const subtotal = lineTotalSum;
  const rawDiscount = order.discount_amount || 0;
  const discount = order.discount_type === "prozentual" ? subtotal * (rawDiscount / 100) : rawDiscount;
  const netAfterDiscount = Math.max(0, subtotal - discount);
  const total = netAfterDiscount;
  const deposit = subtotal * 0.25;

  return { docTitle, today, days, customer, lineItems, subtotal, discount, total, deposit };
}

function buildHeader(docTitle: string): string {
  return `
    <div class="header">
      <div>
        <img src="/logo.png" alt="${companyInfo.name}" class="logo" />
        <div class="brand-sub">Professionelle Eventtechnik</div>
      </div>
      <div class="doc-badge">${docTitle}</div>
    </div>
  `;
}

function buildFooter(): string {
  return `
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
  `;
}

function buildPage(contentHtml: string, docTitle: string, options: { watermark?: boolean } = {}): string {
  const watermarkHtml = options.watermark
    ? `<div class="watermark">${docTitle}</div>`
    : "";

  return `
    <div class="page">
      ${watermarkHtml}
      <div class="page-inner">
        ${buildHeader(docTitle)}
        <div class="content">
          ${contentHtml}
        </div>
        ${buildFooter()}
      </div>
    </div>
  `;
}

function buildTableRow(item: any): string {
  return `
    <tr>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;">
        <div style="font-weight:600;color:#111;">${escapeHtml(itemDisplayName(item))}</div>
        <div style="font-size:11px;color:#888;">${escapeHtml(itemDisplaySubtitle(item))}</div>
      </td>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:center;color:#444;">${item.quantity}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:right;color:#444;">${item.price_per_day != null ? formatCurrency(item.price_per_day) : "-"}</td>
      <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:right;font-weight:600;color:#111;">${item.lineTotal > 0 ? formatCurrency(item.lineTotal) : "-"}</td>
    </tr>
  `;
}

function buildTableHeader(): string {
  return `
    <thead>
      <tr>
        <th style="width:50%;">Produkt</th>
        <th style="width:15%;text-align:center;">Menge</th>
        <th style="width:20%;text-align:right;">Preis / Tag</th>
        <th style="width:20%;text-align:right;">Gesamt</th>
      </tr>
    </thead>
  `;
}

function buildSummary(data: ReturnType<typeof prepareData>, type: string): string {
  const discountRow =
    data.discount > 0
      ? `<div class="summary-row" style="color:#c00;"><span>Rabatt${
          type === "mietvertrag" && data.discount
            ? ""
            : data.discount
            ? ` (${orderDiscountReason(type)})`
            : ""
        }</span><span>-${formatCurrency(data.discount)}</span></div>`
      : "";

  return `
    <div class="summary">
      <div class="summary-row"><span>Zwischensumme</span><span>${formatCurrency(data.subtotal)}</span></div>
      ${discountRow}
      <div class="summary-row total"><span>Gesamtbetrag</span><span>${formatCurrency(data.total)}</span></div>
    </div>
  `;
}

function orderDiscountReason(_type: string): string {
  return "";
}

function buildSignatureSection(_order: any): string {
  return `
    <h1>Unterschrift</h1>
    <p style="margin-bottom:20px;font-size:11px;color:#555;">Mit der Unterschrift bestätigt der Mieter die vorstehenden Angaben und Bedingungen.</p>
    <div class="signature-grid">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label"><strong>Ort, Datum</strong><br>Unterschrift Vermieter</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label"><strong>Ort, Datum</strong><br>Unterschrift Mieter</div>
      </div>
    </div>
  `;
}

function buildNotice(type: string): string {
  const text =
    type === "rechnung"
      ? "Zahlbar innerhalb von 14 Tagen ab Rechnungsdatum ohne Abzug. Bei Überschreitung des Zahlungstermins werden Verzugszinsen in Höhe von 5% berechnet."
      : type === "angebot"
      ? "Dieses Angebot ist 30 Tage gültig. Preisänderungen vorbehalten. Die Vermietung erfolgt nach Verfügbarkeit."
      : type === "auftragsbestaetigung"
      ? "Wir bestätigen hiermit Ihren Auftrag. Die Abholung erfolgt am vereinbarten Datum zu den Bürozeiten."
      : "Wir bedanken uns für Ihr Interesse. Bei Fragen stehen wir Ihnen gerne zur Verfügung.";

  return `
    <div class="notice">
      <div class="notice-title">Hinweis</div>
      ${text}
    </div>
  `;
}

function buildMetaBlock(data: ReturnType<typeof prepareData>, order: any): string {
  const { customer, today, days } = data;
  return `
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
  `;
}

function buildStandardDocument(type: string, order: any, items: any[]): string {
  const data = prepareData(type, order, items);
  const { docTitle, lineItems } = data;

  const pages: string[] = [];

  // First page contains metadata, as many items as fit, summary, notice and footer.
  const firstPageRows = lineItems.slice(0, MAX_ROWS_FIRST_PAGE);
  const remainingRows = lineItems.slice(MAX_ROWS_FIRST_PAGE);

  const firstPageContent = `
    ${buildMetaBlock(data, order)}
    <table>
      ${buildTableHeader()}
      <tbody>${firstPageRows.map(buildTableRow).join("")}</tbody>
    </table>
    ${remainingRows.length === 0 ? buildSummary(data, type) : ""}
    ${remainingRows.length === 0 ? buildNotice(type) : ""}
  `;

  pages.push(buildPage(firstPageContent, docTitle, { watermark: true }));

  // Dedicate subsequent pages to remaining rows.
  for (let i = 0; i < remainingRows.length; i += MAX_ROWS_OTHER_PAGES) {
    const pageRows = remainingRows.slice(i, i + MAX_ROWS_OTHER_PAGES);
    const isLast = i + MAX_ROWS_OTHER_PAGES >= remainingRows.length;

    const pageContent = `
      <table>
        ${buildTableHeader()}
        <tbody>${pageRows.map(buildTableRow).join("")}</tbody>
      </table>
      ${isLast ? buildSummary(data, type) : ""}
      ${isLast ? buildNotice(type) : ""}
    `;

    pages.push(buildPage(pageContent, docTitle, { watermark: true }));
  }

  // Offer documents get a dedicated signature page.
  if (type === "angebot") {
    pages.push(buildPage(buildSignatureSection(order), docTitle, { watermark: true }));
  }

  return pages.join("");
}

function buildContractDocument(_type: string, order: any, items: any[]): string {
  const data = prepareData("mietvertrag", order, items);
  const { docTitle, today, days, customer, lineItems, subtotal, discount, total, deposit } = data;

  const equipmentRows = lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;">${escapeHtml(itemDisplayName(item))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:center;">${escapeHtml(item.product?.product_id) || "-"}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:right;">${item.price_per_day != null ? formatCurrency(item.price_per_day) : "-"}</td>
        </tr>
      `
    )
    .join("");

  const discountRow =
    discount > 0
      ? `<div class="price-row" style="color:#c00;"><span>Rabatt</span><span>-${formatCurrency(discount)}</span></div>`
      : "";

  const metaSection = `
    <div style="font-size:12px;color:#666;margin-top:15px;margin-bottom:18px;">Auftragsnummer: <strong>${escapeHtml(order.order_number)}</strong> | Datum: ${today}</div>
  `;

  const partiesSection = `
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
  `;

  const equipmentSection = `
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
      <tbody>${equipmentRows}</tbody>
    </table>
  `;

  const durationSection = `
    <h1>Mietdauer</h1>
    <p>Die Mietdauer beginnt am <strong>${formatDate(order.start_date)}</strong> und endet am <strong>${formatDate(order.end_date)}</strong>.</p>
    <p>Gesamtdauer: <strong>${days} Tag${days > 1 ? "e" : ""}</strong></p>
  `;

  const priceSection = `
    <h1>Mietpreis und Kaution</h1>
    <div class="price-box">
      <div class="price-row"><span>Mietpreis gesamt</span><span>${formatCurrency(subtotal)}</span></div>
      ${discountRow}
      <div class="price-row total"><span>Gesamtbetrag</span><span>${formatCurrency(total)}</span></div>
    </div>
    <p>Der Mieter leistet vor Mietbeginn eine Kaution in Höhe von <strong>${formatCurrency(deposit)}</strong> (25% des unrabattierten Mietwertes). Die Kaution wird innerhalb von 10 Werktagen nach Rückgabe der unbeschädigten Gegenstände zurückerstattet.</p>
  `;

  const agbSections = [
    `<h1>Allgemeine Geschäftsbedingungen</h1>`,
    `<h2><span class="section-number">1</span> Übergabe und Rückgabe</h2><p>Die Übergabe der Mietgegenstände erfolgt zu den vereinbarten Bürozeiten. Der Mieter verpflichtet sich, die Gegenstände termingerecht und im gleichen Zustand wie bei Übernahme zurückzugeben. Bei verspäteter Rückgabe werden zusätzliche Miettage in Rechnung gestellt.</p>`,
    `<h2><span class="section-number">2</span> Transport und Montage</h2><p>Transport, Aufbau und Abbau der Technik können auf Wunsch gegen gesonderte Vergütung durch den Vermieter durchgeführt werden. Sofern der Mieter den Transport selbst übernimmt, haftet er für Beschädigungen während des Transports.</p>`,
    `<h2><span class="section-number">3</span> Haftung des Mieters</h2><p>Der Mieter haftet für alle während der Mietdauer entstandenen Schäden, Verluste oder Diebstähle der überlassenen Gegenstände. Dies umfasst auch Schäden durch unsachgemässe Bedienung oder falsche Installation.</p>`,
    `<h2><span class="section-number">4</span> Versicherung</h2><p>Der Mieter ist verpflichtet, eine entsprechende Event-Versicherung abzuschliessen oder den Vermieter schriftlich von der Versicherungspflicht zu entbinden. Ohne Nachweis einer Versicherung wird der Vermieter keine Technik übergeben.</p>`,
    `<h2><span class="section-number">5</span> Technischer Support</h2><p>Ein technischer Support vor Ort ist auf Anfrage und gegen gesonderte Vergütung möglich. Der Vermieter garantiert die Funktionsfähigkeit der Technik bei ordnungsgemässer Nutzung.</p>`,
    `<h2><span class="section-number">6</span> Stornierung</h2><p>Stornierungen bis 14 Tage vor Mietbeginn sind kostenfrei. Bei Stornierung zwischen 14 und 7 Tagen vor Mietbeginn werden 50% des Mietpreises fällig. Bei Stornierung innerhalb von 7 Tagen vor Mietbeginn wird der volle Mietpreis fällig.</p>`,
    `<h2><span class="section-number">7</span> Kaution</h2><p>Die Kaution wird zur Sicherstellung der Rückgabe und des ordnungsgemässen Zustands der Mietgegenstände erhoben. Der Vermieter ist berechtigt, Schäden oder Verluste aus der Kaution zu begleichen.</p>`,
    `<h2><span class="section-number">8</span> Gewährleistung</h2><p>Der Vermieter übernimmt keine Gewährleistung für den Erfolg der Veranstaltung. Die Haftung des Vermieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.</p>`,
    `<h2><span class="section-number">9</span> Anwendbares Recht und Gerichtsstand</h2><p>Auf diesen Vertrag ist ausschliesslich schweizerisches Recht anwendbar. Gerichtsstand ist Basel.</p>`,
  ];

  const signatureSection = buildSignatureSection(order);

  return [
    buildPage(metaSection + partiesSection + equipmentSection + durationSection + priceSection, docTitle),
    buildPage(agbSections.slice(0, 6).join(""), docTitle),
    buildPage(agbSections.slice(6).join("") + signatureSection, docTitle),
  ].join("");
}

function buildDocumentHtml(type: string, order: any, items: any[]): string {
  const bodyContent =
    type === "mietvertrag"
      ? buildContractDocument(type, order, items)
      : buildStandardDocument(type, order, items);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(titleMap[type] || type)} - ${escapeHtml(order.order_number)}</title>
        <style>
          @page { margin: 0; size: A4; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111;
            background: #fff;
          }
          .page {
            width: 210mm;
            height: 297mm;
            min-height: 297mm;
            max-height: 297mm;
            position: relative;
            overflow: hidden;
            page-break-after: always;
            background: #fff;
            box-sizing: border-box;
          }
          .page:last-child { page-break-after: auto; }
          .page-inner {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 20mm 25mm 18mm;
          }
          .header {
            flex: 0 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 12px;
            border-bottom: 2px solid #000;
            margin-bottom: 18px;
          }
          .logo {
            height: 70px;
            width: auto;
            object-fit: contain;
          }
          .brand-sub {
            font-size: 10px;
            color: #666;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .doc-badge {
            background: #000;
            color: #fff;
            padding: 8px 20px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .content {
            flex: 1 1 auto;
            position: relative;
            z-index: 1;
          }
          .footer {
            flex: 0 0 auto;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #e5e5e5;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #777;
            line-height: 1.6;
          }
          .footer strong {
            color: #333;
            font-size: 10px;
          }
          .watermark {
            position: absolute;
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
          .meta-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 22px;
          }
          .meta-block {
            max-width: 280px;
          }
          .meta-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #999;
            margin-bottom: 6px;
            font-weight: 600;
          }
          .meta-value {
            font-size: 13px;
            line-height: 1.5;
            color: #333;
          }
          .meta-value strong {
            color: #000;
            font-size: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          thead th {
            padding: 10px 12px;
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #999;
            font-weight: 700;
            border-bottom: 2px solid #000;
          }
          thead th:last-child { text-align: right; }
          tbody td { font-size: 12px; }
          tbody tr:last-child td { border-bottom: 2px solid #000; }
          .summary {
            width: 260px;
            margin-left: auto;
            margin-top: 8px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 12px;
            color: #555;
            border-bottom: 1px solid #eee;
          }
          .summary-row:last-child {
            border-bottom: none;
            padding-top: 10px;
            margin-top: 4px;
            border-top: 2px solid #000;
          }
          .summary-row.total {
            font-size: 15px;
            font-weight: 800;
            color: #000;
          }
          .notice {
            margin-top: 18px;
            padding: 12px;
            background: #f9f9f9;
            border-left: 3px solid #000;
            font-size: 11px;
            color: #555;
            line-height: 1.5;
          }
          .notice-title {
            font-weight: 700;
            color: #000;
            margin-bottom: 4px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          h1 {
            font-size: 16px;
            font-weight: 700;
            margin: 18px 0 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #000;
            page-break-after: avoid;
          }
          h2 {
            font-size: 12px;
            font-weight: 700;
            margin: 12px 0 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            page-break-after: avoid;
          }
          p, li {
            font-size: 11px;
            color: #333;
            margin: 0 0 6px;
            line-height: 1.5;
          }
          ul {
            margin: 0 0 10px;
            padding-left: 18px;
          }
          li { margin-bottom: 3px; }
          .parties {
            display: flex;
            gap: 24px;
            margin: 14px 0;
            page-break-inside: avoid;
          }
          .party {
            flex: 1;
            padding: 12px;
            background: #f9f9f9;
            border: 1px solid #e5e5e5;
          }
          .party-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #999;
            margin-bottom: 5px;
            font-weight: 700;
          }
          .party-name {
            font-size: 13px;
            font-weight: 700;
            color: #000;
            margin-bottom: 3px;
          }
          .party-detail {
            font-size: 11px;
            color: #555;
            line-height: 1.4;
          }
          .price-box {
            background: #f5f5f5;
            padding: 12px;
            margin: 14px 0;
            border-left: 3px solid #000;
            page-break-inside: avoid;
          }
          .price-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 12px;
            color: #444;
          }
          .price-row.total {
            font-size: 15px;
            font-weight: 800;
            color: #000;
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 6px;
          }
          .signature-grid {
            display: flex;
            gap: 40px;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .signature-block { flex: 1; }
          .signature-line {
            border-bottom: 1px solid #000;
            height: 40px;
            margin-bottom: 5px;
          }
          .signature-label {
            font-size: 10px;
            color: #666;
          }
          .section-number {
            display: inline-block;
            color: #000;
            font-size: 12px;
            font-weight: 700;
            font-family: Arial, sans-serif;
            margin-right: 8px;
            vertical-align: middle;
          }
        </style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;
}

export async function generateDocument(
  type: string,
  order: any,
  items: any[],
  _window: Window
): Promise<boolean> {
  const htmlContent = buildDocumentHtml(type, order, items);

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
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pageEls.length; i++) {
          const pageEl = pageEls[i];
          const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            width: pageEl.offsetWidth,
            height: pageEl.offsetHeight,
          });

          const imgData = canvas.toDataURL("image/png");
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
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

    iframe.src = "about:blank";
  });
}

export function printDocument(type: string, order: any, items: any[], window: Window): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  const htmlContent = buildDocumentHtml(type, order, items);
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for images, then print.
  const images = Array.from(printWindow.document.images);
  let loaded = 0;
  const checkPrint = () => {
    loaded++;
    if (loaded >= images.length) {
      printWindow.focus();
      printWindow.print();
    }
  };

  if (images.length === 0) {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  } else {
    images.forEach((img) => {
      if (img.complete) {
        checkPrint();
      } else {
        img.onload = checkPrint;
        img.onerror = checkPrint;
      }
    });
  }

  return true;
}
