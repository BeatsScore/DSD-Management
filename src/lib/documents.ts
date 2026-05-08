import { formatCurrency, formatDate } from "./utils";
import { companyInfo } from "./company";

export function generateDocument(
  type: string,
  order: any,
  items: any[],
  window: Window
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const titleMap: Record<string, string> = {
    angebot: "Angebot",
    rechnung: "Rechnung",
    mietvertrag: "Mietvertrag",
    auftragsbestaetigung: "Auftragsbestaetigung",
    ablehnung: "Ablehnung",
  };

  const docTitle = titleMap[type] || type;
  const today = new Date().toLocaleDateString("de-CH");
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(order.end_date).getTime() - new Date(order.start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // Calculate totals from actual line items
  let lineTotalSum = 0;
  const rows = items
    .map((item) => {
      const lineTotal = (item.price_per_day || 0) * item.quantity * days;
      lineTotalSum += lineTotal;
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;">
            <div style="font-weight:600;color:#111;">${item.product?.name || "-"}</div>
            <div style="font-size:11px;color:#888;">${item.product?.manufacturer || ""} ${item.product?.product_id ? "(" + item.product.product_id + ")" : ""}</div>
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:center;color:#444;">${item.quantity}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:right;color:#444;">${item.price_per_day != null ? formatCurrency(item.price_per_day) : "-"}</td>
          <td style="padding:14px 12px;border-bottom:1px solid #e5e5e5;font-size:13px;text-align:right;font-weight:600;color:#111;">${lineTotal > 0 ? formatCurrency(lineTotal) : "-"}</td>
        </tr>
      `;
    })
    .join("");

  const subtotal = lineTotalSum;
  const vatRate = 7.7;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const customer = order.customer || {};

  if (type === "mietvertrag") {
    const equipmentList = items
      .map(
        (item) =>
          `<tr>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;">${item.product?.name || "-"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #ddd;font-size:12px;text-align:center;">${item.product?.product_id || "-"}</td>
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
          <title>Mietvertrag - ${order.order_number}</title>
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
              padding: 50px 60px;
              position: relative;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 50px;
              padding-bottom: 25px;
              border-bottom: 3px solid #000;
            }
            .brand {
              font-size: 26px;
              font-weight: 800;
              letter-spacing: -0.5px;
              color: #000;
              line-height: 1;
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
              font-size: 20px;
              font-weight: 700;
              margin: 40px 0 20px;
              padding-bottom: 8px;
              border-bottom: 2px solid #000;
            }
            h2 {
              font-size: 14px;
              font-weight: 700;
              margin: 30px 0 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            p, li {
              font-size: 12px;
              color: #333;
              margin: 0 0 10px;
            }
            ul {
              margin: 0 0 16px;
              padding-left: 20px;
            }
            li {
              margin-bottom: 6px;
            }
            .parties {
              display: flex;
              gap: 40px;
              margin: 30px 0;
            }
            .party {
              flex: 1;
              padding: 20px;
              background: #f9f9f9;
              border: 1px solid #e5e5e5;
            }
            .party-label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              color: #999;
              margin-bottom: 10px;
              font-weight: 700;
            }
            .party-name {
              font-size: 15px;
              font-weight: 700;
              color: #000;
              margin-bottom: 6px;
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
              padding: 20px;
              margin: 30px 0;
              border-left: 3px solid #000;
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
              gap: 60px;
              margin-top: 60px;
            }
            .signature-block {
              flex: 1;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              height: 60px;
              margin-bottom: 8px;
            }
            .signature-label {
              font-size: 11px;
              color: #666;
            }
            .section-number {
              display: inline-block;
              width: 22px;
              height: 22px;
              background: #000;
              color: #fff;
              font-size: 11px;
              font-weight: 700;
              text-align: center;
              line-height: 22px;
              border-radius: 50%;
              margin-right: 10px;
            }
            .footer {
              margin-top: 60px;
              padding-top: 20px;
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
                <div class="brand">${companyInfo.name}</div>
                <div class="brand-sub">Professionelle Eventtechnik</div>
              </div>
              <div class="doc-badge">Mietvertrag</div>
            </div>

            <div style="font-size:12px;color:#666;margin-bottom:30px;">
              Auftragsnummer: <strong>${order.order_number}</strong> | Datum: ${today}
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
                  E-Mail: ${companyInfo.email}<br>
                  Tel: ${companyInfo.phone}
                </div>
              </div>
              <div class="party">
                <div class="party-label">Mieter</div>
                <div class="party-name">${customer.name || "-"}</div>
                <div class="party-detail">
                  ${customer.company ? customer.company + "<br>" : ""}
                  ${customer.address ? customer.address.replace(/\n/g, "<br>") + "<br>" : ""}
                  ${customer.phone ? "Tel: " + customer.phone + "<br>" : ""}
                  ${customer.email || ""}
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
              <div class="price-row">
                <span>MWSt. ${vatRate}%</span>
                <span>${formatCurrency(vatAmount)}</span>
              </div>
              <div class="price-row total">
                <span>Gesamtbetrag</span>
                <span>${formatCurrency(total)}</span>
              </div>
            </div>
            <p>Der Mieter leistet vor Mietbeginn eine Kaution in Höhe von <strong>${formatCurrency(total * 0.2)}</strong> (20% des Mietwertes). Die Kaution wird innerhalb von 10 Werktagen nach Rückgabe der unbeschädigten Gegenstände zurückerstattet.</p>

            <h1>Allgemeine Geschäftsbedingungen</h1>

            <h2><span class="section-number">1</span> Übergabe und Rückgabe</h2>
            <p>Die Übergabe der Mietgegenstände erfolgt zu den vereinbarten Bürozeiten. Der Mieter verpflichtet sich, die Gegenstände termingerecht und im gleichen Zustand wie bei Übernahme zurückzugeben. Bei verspäteter Rückgabe werden zusätzliche Miettage in Rechnung gestellt.</p>

            <h2><span class="section-number">2</span> Transport und Montage</h2>
            <p>Transport, Aufbau und Abbau der Technik können auf Wunsch gegen gesonderte Vergütung durch den Vermieter durchgeführt werden. Sofern der Mieter den Transport selbst übernimmt, haftet er für Beschädigungen während des Transports.</p>

            <h2><span class="section-number">3</span> Haftung des Mieters</h2>
            <p>Der Mieter haftet für alle während der Mietdauer entstandenen Schäden, Verluste oder Diebstähle der überlassenen Gegenstände. Dies umfasst auch Schäden durch unsachgemässe Bedienung oder falsche Installation.</p>

            <h2><span class="section-number">4</span> Versicherung</h2>
            <p>Der Mieter ist verpflichtet, eine entsprechende Event-Versicherung abzuschliessen oder den Vermieter schriftlich von der Versicherungspflicht zu entbinden. Ohne Nachweis einer Versicherung wird der Vermieter keine Technik übergeben.</p>

            <h2><span class="section-number">5</span> Technischer Support</h2>
            <p>Ein technischer Support vor Ort ist auf Anfrage und gegen gesonderte Vergütung möglich. Der Vermieter garantiert die Funktionsfähigkeit der Technik bei ordnungsgemässer Nutzung.</p>

            <h2><span class="section-number">6</span> Stornierung</h2>
            <p>Stornierungen bis 14 Tage vor Mietbeginn sind kostenfrei. Bei Stornierung zwischen 14 und 7 Tagen vor Mietbeginn werden 50% des Mietpreises fällig. Bei Stornierung innerhalb von 7 Tagen vor Mietbeginn wird der volle Mietpreis fällig.</p>

            <h2><span class="section-number">7</span> Kaution</h2>
            <p>Die Kaution wird zur Sicherstellung der Rückgabe und des ordnungsgemässen Zustands der Mietgegenstände erhoben. Der Vermieter ist berechtigt, Schäden oder Verluste aus der Kaution zu begleichen.</p>

            <h2><span class="section-number">8</span> Gewährleistung</h2>
            <p>Der Vermieter übernimmt keine Gewährleistung für den Erfolg der Veranstaltung. Die Haftung des Vermieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.</p>

            <h2><span class="section-number">9</span> Anwendbares Recht und Gerichtsstand</h2>
            <p>Auf diesen Vertrag ist ausschliesslich schweizerisches Recht anwendbar. Gerichtsstand ist Zürich.</p>

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
              ${companyInfo.legalName} | ${companyInfo.address} | ${companyInfo.city} | ${companyInfo.email} | ${companyInfo.phone}<br>
              ${companyInfo.bank} | IBAN: ${companyInfo.iban} | UID: ${companyInfo.uid}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    return;
  }

  // Default template for angebot, rechnung, auftragsbestaetigung, ablehnung
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${docTitle} - ${order.order_number}</title>
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
            padding: 50px 60px;
            position: relative;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 60px;
            padding-bottom: 30px;
            border-bottom: 3px solid #000;
          }
          .brand {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #000;
            line-height: 1;
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
            margin-bottom: 50px;
          }
          .meta-block {
            max-width: 280px;
          }
          .meta-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #999;
            margin-bottom: 10px;
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
          .info-row {
            display: flex;
            gap: 50px;
            margin-bottom: 50px;
          }
          .info-item {
            flex: 1;
          }
          .info-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: #999;
            margin-bottom: 6px;
            font-weight: 600;
          }
          .info-value {
            font-size: 14px;
            color: #111;
            font-weight: 500;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
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
            width: 320px;
            margin-left: auto;
            margin-top: 30px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 13px;
            color: #555;
            border-bottom: 1px solid #eee;
          }
          .summary-row:last-child {
            border-bottom: none;
            padding-top: 16px;
            margin-top: 6px;
            border-top: 2px solid #000;
          }
          .summary-row.total {
            font-size: 18px;
            font-weight: 800;
            color: #000;
          }
          .footer {
            margin-top: 80px;
            padding-top: 30px;
            border-top: 1px solid #e5e5e5;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #999;
            line-height: 1.8;
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
            margin-top: 40px;
            padding: 20px;
            background: #f9f9f9;
            border-left: 3px solid #000;
            font-size: 12px;
            color: #555;
            line-height: 1.6;
          }
          .notice-title {
            font-weight: 700;
            color: #000;
            margin-bottom: 6px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          @media print {
            .page { padding: 40px 50px; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="watermark">${docTitle}</div>
          <div class="content">
            <div class="header">
              <div>
                <div class="brand">${companyInfo.name}</div>
                <div class="brand-sub">Professionelle Eventtechnik</div>
              </div>
              <div class="doc-badge">${docTitle}</div>
            </div>

            <div class="meta-grid">
              <div class="meta-block">
                <div class="meta-label">Kunde</div>
                <div class="meta-value">
                  <strong>${customer.name || "-"}</strong><br>
                  ${customer.company ? customer.company + "<br>" : ""}
                  ${customer.address ? customer.address.replace(/\n/g, "<br>") + "<br>" : ""}
                  ${customer.phone ? "Tel: " + customer.phone + "<br>" : ""}
                  ${customer.email || ""}
                </div>
              </div>
              <div class="meta-block" style="text-align:right;">
                <div class="meta-label">Auftragsdetails</div>
                <div class="meta-value">
                  <strong>${order.order_number}</strong><br>
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
              <div class="summary-row">
                <span>MWSt. ${vatRate}%</span>
                <span>${formatCurrency(vatAmount)}</span>
              </div>
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
                ${companyInfo.phone}<br>
                ${companyInfo.website}
              </div>
              <div style="text-align:right;">
                <strong>Bankverbindung</strong><br>
                ${companyInfo.bank}<br>
                IBAN: ${companyInfo.iban}<br>
                UID: ${companyInfo.uid}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
}
