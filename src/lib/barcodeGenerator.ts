// Generate high-quality SVG barcode using jsbarcode directly
// This avoids extracting low-res SVG from the DOM

let jsbarcodeModule: any = null;

async function getJsBarcode() {
  if (jsbarcodeModule) return jsbarcodeModule;
  // jsbarcode is a dependency of react-barcode
  jsbarcodeModule = (await import("jsbarcode")).default;
  return jsbarcodeModule;
}

export interface BarcodeOptions {
  value: string;
  format?: string;
  width?: number; // line width in px (1 = thinnest, 2 = standard, 3 = thick)
  height?: number; // barcode height in px
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  shorten?: boolean; // use last 6 chars to reduce barcode width
}

export async function generateBarcodeSvg(options: BarcodeOptions): Promise<string> {
  const JsBarcode = await getJsBarcode();

  // Create a temporary SVG element in memory
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");

  const value = options.shorten
    ? options.value.slice(-6)
    : options.value;

  JsBarcode(svg, value, {
    format: options.format || "CODE128",
    width: options.width || 2,
    height: options.height || 80,
    displayValue: options.displayValue ?? false,
    fontSize: options.fontSize || 14,
    margin: options.margin ?? 0,
    background: "#ffffff",
    lineColor: "#000000",
    font: "monospace",
    textAlign: "center",
    textPosition: "bottom",
    textMargin: 2,
  });

  // Return the SVG as string
  return svg.outerHTML;
}

// Synchronous version for print window (when SVG is already generated)
export function generateBarcodeSvgSync(
  JsBarcode: any,
  options: BarcodeOptions
): string {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");

  const value = options.shorten
    ? options.value.slice(-6)
    : options.value;

  JsBarcode(svg, value, {
    format: options.format || "CODE128",
    width: options.width || 2,
    height: options.height || 80,
    displayValue: options.displayValue ?? false,
    fontSize: options.fontSize || 14,
    margin: options.margin ?? 0,
    background: "#ffffff",
    lineColor: "#000000",
    font: "monospace",
    textAlign: "center",
    textPosition: "bottom",
    textMargin: 2,
  });

  return svg.outerHTML;
}
