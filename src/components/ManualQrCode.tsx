"use client";

import { Printer } from "lucide-react";
import QRCode from "react-qr-code";

interface ManualQrCodeProps {
  url: string;
  productName: string;
  size?: number;
}

export function ManualQrCode({ url, productName, size = 128 }: ManualQrCodeProps) {
  const printQr = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>QR-Code – ${productName}</title>
          <style>
            @page { margin: 0; size: auto; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 40px;
              background: #fff;
            }
            .print-box {
              text-align: center;
            }
            .product-name {
              font-size: 18px;
              font-weight: 700;
              color: #000;
              margin-bottom: 8px;
            }
            .label {
              font-size: 13px;
              color: #666;
              margin-bottom: 24px;
            }
            .qr-wrap {
              display: inline-block;
              padding: 16px;
              border: 1px solid #e5e5e5;
              border-radius: 12px;
              background: #fff;
            }
            .url-text {
              font-size: 11px;
              color: #999;
              margin-top: 16px;
              word-break: break-all;
              max-width: 300px;
            }
          </style>
        </head>
        <body>
          <div class="print-box">
            <div class="product-name">${productName}</div>
            <div class="label">Bedienungsanleitung</div>
            <div class="qr-wrap">
              <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                ${document.getElementById("manual-qr")?.innerHTML || ""}
              </svg>
            </div>
            <div class="url-text">${url}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 200);
  };

  return (
    <div className="flex items-center gap-4">
      <div id="manual-qr">
        <QRCode value={url} size={size} />
      </div>
      <div className="space-y-1">
        <div className="text-xs text-gray-500">Bedienungsanleitung QR-Code</div>
        <button
          onClick={printQr}
          className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-md px-2.5 py-1.5 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Drucken
        </button>
      </div>
    </div>
  );
}
