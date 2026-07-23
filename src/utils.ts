// @ts-ignore
import html2pdf from 'html2pdf.js';
import { biSealBase64, banruralSealBase64, defaultLogoBase64 } from './sealsBase64';

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export function getStartOfCurrentWeek(): Date {
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(diffToMonday);
  startOfThisWeek.setHours(0, 0, 0, 0);
  return startOfThisWeek;
}

export function cleanObservations(notes: string | undefined | null): string {
  if (!notes) return '';
  if (!notes.includes('|||')) return notes.trim();
  const parts = notes.split('|||');
  const obsPart = parts.find(p => p.startsWith('OBS:'));
  return obsPart ? obsPart.replace('OBS:', '').trim() : '';
}

export function isCriticalStock(product: { name?: string; category?: string; stock?: number }): boolean {
  if (!product) return false;
  const stock = product.stock || 0;
  
  const nameL = (product.name || '').toLowerCase();
  const catL = (product.category || '').toLowerCase();
  
  // EXENTO DE STOCK: Incubadoras
  if (nameL.includes('incubadora') || catL.includes('incubadora') || catL === 'incubadoras') {
    return false;
  }

  const isSA = nameL.includes('sistemas agropecuarios') || catL.includes('sistemas agropecuarios');
  const isNexlabet = nameL.includes('nexlabet');
  const isOtherCritical = nameL.includes('broncobion max') || nameL.includes('avimdustrias mirex') || nameL.includes('forza');

  if ((isSA && !isNexlabet) || isOtherCritical) {
    return stock < 120;
  }
  
  return stock <= 5;
}

export function doesNotNeedStock(product: { name?: string; category?: string } | null | undefined): boolean {
  if (!product) return false;
  const nameLower = (product.name || '').toLowerCase();
  const categoryLower = (product.category || '').toLowerCase();
  
  // Explicitly exclude INCUBADORAS
  if (categoryLower.includes('incubadora') || nameLower.includes('incubadora') || categoryLower === 'incubadoras') {
    return true;
  }
  
  const keywords = ['bebedero', 'comedero', 'puya', 'arete', 'aretes'];
  return keywords.some(keyword => nameLower.includes(keyword) || categoryLower.includes(keyword));
}

export const DEFAULT_PRINT_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Pago - POS</title>
    <base href="{{origin}}/" />
    <style>
        @page {
            size: A4;
            margin: 10mm 10mm;
            background-color: #ffffff;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: #ffffff !important;
                color: #0f172a !important;
            }
            .header-banner {
                background-color: #1A4D2E !important;
                color: #ffffff !important;
            }
            .column-title {
                color: #475569 !important;
                border-bottom-color: #cbd5e1 !important;
            }
        }
        * {
            box-sizing: border-box;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        body {
            margin: 0;
            padding: 0;
            font-size: 10pt;
            color: #1e293b;
            background-color: #ffffff;
        }
        /* Top Banner - Totally different from old header structure */
        .header-banner {
            background-color: #1A4D2E;
            color: #ffffff;
            width: 100%;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .header-banner h1 {
            margin: 0;
            font-size: 18pt;
            font-weight: 900;
            letter-spacing: -0.5px;
            text-transform: uppercase;
        }
        .header-banner .folio-badge {
            background-color: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.25);
            padding: 6px 14px;
            border-radius: 10px;
            font-size: 11pt;
            font-weight: 800;
            font-family: monospace;
        }
        /* Details layout - Structured as columns instead of cards */
        .details-container {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .details-container td {
            width: 33.33%;
            vertical-align: top;
            padding: 0 12px;
        }
        .details-container td:first-child { padding-left: 0; }
        .details-container td:last-child { padding-right: 0; }
        
        .column-title {
            font-size: 8.5pt;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 4px;
        }
        .info-text {
            font-size: 9.5pt;
            line-height: 1.5;
            color: #0f172a;
        }
        /* Minimal Table style - instead of rounded header and gray grid */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            border-bottom: 2px solid #0f172a;
            padding: 10px 8px;
            font-size: 9pt;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .items-table td {
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 8px;
            font-size: 10pt;
            color: #334155;
        }
        .items-table tr:last-child td {
            border-bottom: 2px solid #0f172a;
        }
        /* Totals block layout - Bottom right aligned card */
        .summary-section {
            width: 100%;
            margin-top: 15px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .summary-table {
            width: 42%;
            margin-left: 58%;
            border-collapse: collapse;
        }
        .summary-table td {
            padding: 8px 12px;
            font-size: 10pt;
        }
        .summary-table .label {
            text-align: right;
            color: #64748b;
            font-weight: 600;
        }
        .summary-table .value {
            text-align: right;
            font-weight: 700;
            color: #0f172a;
        }
        .summary-table tr.total-row td {
            border-top: 2px solid #e2e8f0;
            padding-top: 12px;
            font-size: 12pt;
            font-weight: 900;
            color: #1A4D2E;
        }
        /* Signature Layout - Modern Side-by-Side */
        .footer-signatures {
            width: 100%;
            margin-top: 40px;
            border-collapse: collapse;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .footer-signatures td {
            width: 50%;
            text-align: center;
            vertical-align: bottom;
            padding: 10px 20px;
        }
        .signature-line {
            border-top: 1.5px solid #94a3b8;
            margin-top: 45px;
            padding-top: 6px;
            font-size: 9pt;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
        }
        .signature-img {
            max-width: 150px;
            max-height: 70px;
            display: block;
            margin: 0 auto -40px auto;
        }
    </style>
</head>
<body>

    <div class="header-banner">
        <div>
            <h1>Comprobante de Venta</h1>
            <div style="font-size: 9.5pt; opacity: 0.85; margin-top: 4px;">Transacción de Mercadería Oficial</div>
        </div>
        <div class="folio-badge">FOLIO #{{folio}}</div>
    </div>

    <table class="details-container">
        <tr>
            <td>
                <div class="column-title">Emisor</div>
                <div class="info-text">
                    <strong style="color: #1A4D2E;">AGRICOVET</strong><br>
                    Barrio Segunda Lotificación,<br>
                    Santa Elena, Petén<br>
                    Tel: +502 3645 0241<br>
                    contacto@sistema-pos.local
                </div>
            </td>
            <td>
                <div class="column-title">Cliente</div>
                <div class="info-text">
                    <strong>{{customerName}}</strong><br>
                    NIT: {{customerNit}}<br>
                    Dirección: {{customerAddress}}<br>
                    Teléfono: {{phone}}
                </div>
            </td>
            <td>
                <div class="column-title">Detalles</div>
                <div class="info-text">
                    <strong>Fecha:</strong> {{date}}<br>
                    <strong>Forma Pago:</strong> {{paymentForm}}<br>
                    <strong>Estado:</strong> {{status}}<br>
                    <strong>Vendedor:</strong> {{sellerName}}
                </div>
            </td>
        </tr>
    </table>

    <table class="items-table">
        <thead>
            <tr>
                <th style="text-align: left; width: 50%;">Descripción</th>
                <th style="text-align: center; width: 15%;">Cantidad</th>
                <th style="text-align: right; width: 15%;">Precio</th>
                <th style="text-align: right; width: 20%;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            {{#each items}}
            <tr>
                <td style="text-align: left; font-weight: 500;">
                    {{this.productName}}
                    <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">{{this.variantInfo}}</div>
                </td>
                <td style="text-align: center;">{{this.quantity}}</td>
                <td style="text-align: right;">Q {{this.price}}</td>
                <td style="text-align: right; font-weight: 700; color: #0f172a;">Q {{this.subtotal}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    <div class="summary-section">
        <table class="summary-table">
            <tr>
                <td class="label">Total Bruto</td>
                <td class="value">Q {{totalAmount}}</td>
            </tr>
            <tr>
                <td class="label">Pagado</td>
                <td class="value" style="color: #16a34a;">Q {{paidAmount}}</td>
            </tr>
            <tr class="total-row">
                <td class="label" style="color: #1A4D2E;">Saldo Pendiente</td>
                <td class="value">Q {{dueAmount}}</td>
            </tr>
        </table>
    </div>

    <table class="footer-signatures">
        <tr>
            <td>
                {{#if sellerSignature}}
                    <img src="{{sellerSignature}}" class="signature-img" />
                {{/if}}
                <div class="signature-line">Firma Autorizada Vendedor</div>
            </td>
            <td>
                {{#if adminSignature}}
                    <img src="{{adminSignature}}" class="signature-img" />
                {{/if}}
                <div class="signature-line">Firma Autorizada Administrador</div>
            </td>
        </tr>
    </table>

    <div style="text-align: center; margin-top: 30px; padding-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
        <img src="{{logoUrl}}" alt="AGRICOVET Logo" style="width: 80px; height: 80px; object-fit: contain; opacity: 0.8;" />
    </div>
</body>
</html>`;

export function formatMoney(num: number | undefined | string) {
  if (num === undefined || num === null) return 'Q0.00';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return 'Q0.00';
  return 'Q' + n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

/**
 * Converts an image URL to a Base64 string.
 * This is crucial for html2pdf.js and window.print() to correctly render images
 * without CORS or loading race condition issues.
 */
async function getBase64Image(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return url;
  }
}

async function convertAllImagesToBase64(container: HTMLElement) {
  const imgs = Array.from(container.querySelectorAll('img'));
  const promises = imgs.map(async (img) => {
    const originalSrc = img.getAttribute('src');
    if (originalSrc && !originalSrc.startsWith('data:')) {
      const b64 = await getBase64Image(originalSrc);
      if (b64.startsWith('data:')) {
        img.src = b64;
      }
    }
  });
  await Promise.allSettled(promises);
}

export function compilePrintTemplate(templateText: string, invoice: any, sellerName: string): string {
  try {
    const formatGT = (num: number) => {
      const n = Number(num);
      return isNaN(n) ? '0' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    };
    const isCredit = true; // Forzar crédito siempre (las ventas solo se pueden ir a crédito)
    const phoneVal = invoice.phone || invoice.customerPhone || 'N/A';
    const addressVal = invoice.address || 'Ciudad';

    const clientPhoneLine = phoneVal ? ('<div class="metadata-line">' + phoneVal + '</div>') : '';
    const clientAddressLine = addressVal ? ('<div class="metadata-line">' + addressVal + '</div>') : '';

    const itemsTableRows = (invoice.items || []).map((item: any) => {
      const getVariantString = (item: any) => {
        let c = item.color || item.variant?.color;
        let s = item.size || item.variant?.size;
        if (!c && !s) return '';
        if (s === 'Única' || !s) return ` (${c || ''})`;
        return ` (${c || ''} / ${s || ''})`;
      };
      const variantStr = getVariantString(item);
      return '<tr>' +
        '<td class="col-producto notranslate" translate="no">' + (item.productName || '') + '<br/><small>' + variantStr + '</small></td>' +
        '<td class="col-cant">' + formatGT(item.quantity || 0) + '</td>' +
        '<td class="col-precio">' + formatGT(item.price || 0) + '</td>' +
        '<td class="col-subtotal">' + formatGT(item.total || 0) + '</td>' +
      '</tr>';
    }).join('');

    let t = templateText || DEFAULT_PRINT_TEMPLATE;

    if (!t.includes('Cuenta BANCO INDUSTRIAL') && !t.includes('biSealUrl')) {
        const sealsHtml = `
    <table style="width: 100%; margin-top: 25px; border-collapse: collapse; page-break-inside: avoid;">
        <tr>
            <td style="width: 48%; text-align: center; vertical-align: middle; padding: 5px;">
                <div style="border: none; padding: 0;">
                    <div style="font-size: 9pt; font-weight: 800; color: #1A4D2E; text-transform: uppercase; margin-bottom: 4px;">Depositar a: BANCO INDUSTRIAL</div>
                    <div style="font-size: 11pt; font-weight: 900; color: #000; margin: 2px 0;">035-015252-6</div>
                    <div style="font-size: 9pt; font-weight: 700; color: #555555; margin: 2px 0;">Agricovet de Guatemala</div>
                </div>
            </td>
            <td style="width: 4%;">&nbsp;</td>
            <td style="width: 48%; text-align: center; vertical-align: middle; padding: 5px;">
                <div style="border: none; padding: 0;">
                    <div style="font-size: 9pt; font-weight: 800; color: #1A4D2E; text-transform: uppercase; margin-bottom: 4px;">Depositar a: BANRURAL</div>
                    <div style="font-size: 11pt; font-weight: 900; color: #000; margin: 2px 0;">3580029532</div>
                    <div style="font-size: 9pt; font-weight: 700; color: #555555; margin: 2px 0;">Agricovet de Guatemala</div>
                </div>
            </td>
        </tr>
    </table>
`;
        t = t.replace('</body>', sealsHtml + '</body>');
    }

    // Support both types of loop: {{#each items}} ... {{/each}} and old {{itemsTableRows}}
    const loopRegex = /\{\{#each items\}\}([\s\S]*?)\{\{\/each\}\}/g;
    t = t.replace(loopRegex, (_, loopBody) => {
      return (invoice.items || []).map((item: any) => {
        let row = loopBody;
        
        const getVariantInfo = (item: any) => {
          let c = item.color || item.variant?.color;
          let s = item.size || item.variant?.size;
          if (!c && !s) return '';
          if (s === 'Única' || !s) return c || '';
          return `${c || ''} / ${s || ''}`;
        };
        const variantInfo = getVariantInfo(item);
        row = row.replace(/\{\{this\.variantInfo\}\}/g, variantInfo);
        row = row.replace(/\{\{variantInfo\}\}/g, variantInfo);

        let finalProductName = String(item.productName || '');
        if (variantInfo && !loopBody.includes('variantInfo')) {
            finalProductName += `<br/><span style="font-size: 8.5pt; color: #555555; font-weight: normal; display: block; margin-top: 2px;">${variantInfo}</span>`;
        }

        row = row.replace(/\{\{this\.productName\}\}/g, '<span class="notranslate" translate="no">' + finalProductName + '</span>');
        row = row.replace(/\{\{productName\}\}/g, '<span class="notranslate" translate="no">' + finalProductName + '</span>');
        
        row = row.replace(/\{\{this\.quantity\}\}/g, formatGT(item.quantity || 0));
        row = row.replace(/\{\{quantity\}\}/g, formatGT(item.quantity || 0));
        
        row = row.replace(/\{\{this\.price\}\}/g, formatGT(item.price || 0));
        row = row.replace(/\{\{price\}\}/g, formatGT(item.price || 0));
        
        row = row.replace(/\{\{this\.subtotal\}\}/g, formatGT(item.total || 0));
        row = row.replace(/\{\{subtotal\}\}/g, formatGT(item.total || 0));
        
        return row;
      }).join('\n');
    });

    // Base substitutions
    t = t.replace(/\{\{id\}\}/g, String(invoice.id || ''));
    t = t.replace(/\{\{client\}\}/g, String(invoice.client || ''));
    t = t.replace(/\{\{customerName\}\}/g, String(invoice.client || ''));
    t = t.replace(/\{\{customerNit\}\}/g, String(invoice.nit || 'CF'));
    t = t.replace(/\{\{customerAddress\}\}/g, String(invoice.address || 'Ciudad'));
    t = t.replace(/\{\{clientPhoneLine\}\}/g, clientPhoneLine);
    t = t.replace(/\{\{clientAddressLine\}\}/g, clientAddressLine);
    t = t.replace(/\{\{phone\}\}/g, phoneVal);
    t = t.replace(/\{\{address\}\}/g, addressVal);
    t = t.replace(/\{\{folio\}\}/g, String(invoice.folio || 1));
    t = t.replace(/\{\{date\}\}/g, invoice.date ? (isNaN(new Date(invoice.date).getTime()) ? '' : new Date(invoice.date).toISOString().split('T')[0]) : '');
    t = t.replace(/\{\{paymentForm\}\}/g, isCredit ? 'CREDITO' : 'CONTADO');
    t = t.replace(/\{\{status\}\}/g, isCredit ? 'POR COBRAR' : (invoice.status === 'cancelled' || invoice.status === 'rejected' ? 'ANULADA' : 'PAGADO'));
    t = t.replace(/\{\{sellerName\}\}/g, sellerName);
    t = t.replace(/\{\{itemsTableRows\}\}/g, itemsTableRows);
    t = t.replace(/\{\{totalAmount\}\}/g, formatGT(invoice.totalAmount || 0));
    t = t.replace(/\{\{paidAmount\}\}/g, formatGT(invoice.paidAmount || 0));
    t = t.replace(/\{\{dueAmount\}\}/g, formatGT((invoice.totalAmount || 0) - (invoice.paidAmount || 0)));
    
    // Signatures and Seals
    t = t.replace(/\{\{sellerSignature\}\}/g, invoice.sellerSignature || '');
    t = t.replace(/\{\{adminSignature\}\}/g, invoice.adminSignature || '');
    t = t.replace(/\{\{reviewedBy\}\}/g, invoice.reviewedBy || '');
    
    const origin = window.location.origin;
    const storedLogo = localStorage.getItem('app_logo_url');
    let finalLogoUrl = storedLogo || `${origin}/agricovet.png`;
    
    if (finalLogoUrl && !finalLogoUrl.startsWith('http') && !finalLogoUrl.startsWith('data:')) {
      const cleanPath = finalLogoUrl.startsWith('/') ? finalLogoUrl : `/${finalLogoUrl}`;
      finalLogoUrl = `${origin}${cleanPath}`;
    }
    
    // Replace all logo placeholders
    if (finalLogoUrl === `${origin}/agricovet.png` || finalLogoUrl === '/agricovet.png') {
        t = t.replace(/\{\{logoUrl\}\}/g, defaultLogoBase64);
        t = t.replace(/\{\{origin\}\}\/agricovet\.png/g, defaultLogoBase64);
    } else {
        t = t.replace(/\{\{logoUrl\}\}/g, finalLogoUrl);
        t = t.replace(/\{\{origin\}\}\/agricovet\.png/g, finalLogoUrl);
    }
    
    // Signatures
    t = t.replace(/\{\{#if sellerSignature\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, inner) => {
        return invoice.sellerSignature ? inner.replace(/\{\{sellerSignature\}\}/g, invoice.sellerSignature) : '';
    });
    t = t.replace(/\{\{#if adminSignature\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, inner) => {
        return invoice.adminSignature ? inner.replace(/\{\{adminSignature\}\}/g, invoice.adminSignature).replace(/\{\{reviewedBy\}\}/g, invoice.reviewedBy || '') : '';
    });
    
    // Use absolute URLs for seals
    t = t.replace(/\{\{biSealUrl\}\}/g, biSealBase64);
    t = t.replace(/\{\{banruralSealUrl\}\}/g, banruralSealBase64);
    
    // Finally replace origin for any other relative links
    t = t.replace(/\{\{origin\}\}/g, origin);

    return t;
  } catch (e) {
    console.error('Error compiling template:', e);
    return `<h1>Error al generar ticket</h1><p>${String(e)}</p>`;
  }
}

export function generateDeliveryLetterHtml(invoice: any, sellerName: string): string {
  const dateStr = new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const logoUrl = localStorage.getItem('app_logo_url') || `${window.location.origin}/agricovet.png`;
  
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; line-height: 1.6;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #0b4d2c; padding-bottom: 20px;">
        <div>
          <img src="${logoUrl}" alt="Agricovet Logo" style="max-width: 150px; max-height: 80px; object-fit: contain;" />
          <h1 style="color: #0b4d2c; margin: 10px 0 5px 0; font-size: 24px;">Carta de Entrega de Mercadería</h1>
          <p style="margin: 0; color: #666; font-size: 14px;">Folio de Venta: #${invoice.folio || invoice.id.substring(0,8)}</p>
        </div>
        <div style="text-align: right; font-size: 14px;">
          <p style="margin: 0;">Fecha de Emisión: ${dateStr}</p>
          <p style="margin: 0;">Vendedor: ${sellerName}</p>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="color: #0b4d2c; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Datos del Cliente</h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 5px 0; width: 120px;"><strong>Nombre/Razón:</strong></td>
            <td>${invoice.client}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>NIT/CF:</strong></td>
            <td>${invoice.nit || 'C/F'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Teléfono:</strong></td>
            <td>${invoice.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;"><strong>Dirección:</strong></td>
            <td>${invoice.address || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 40px;">
        <h3 style="color: #0b4d2c; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">Detalle de Mercadería Entregada</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Cant.</th>
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Descripción</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map((item: any) => {
              const c = item.color || item.variant?.color;
              const s = item.size || item.variant?.size;
              let varStr = '';
              if (c || s) {
                if (s === 'Única' || !s) varStr = ` (${c || ''})`;
                else if (!c) varStr = ` (${s})`;
                else varStr = ` (${c} / ${s})`;
              }
              return `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}${varStr}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 60px; font-size: 14px;">
        <p>Por medio de la presente, confirmo que he recibido de conformidad la mercadería detallada anteriormente, en las cantidades y condiciones indicadas, por parte de <strong>la empresa proveedora</strong>.</p>
        
        <div style="margin-top: 80px; display: flex; justify-content: space-around;">
          <div style="text-align: center; width: 250px;">
            <div style="border-bottom: 1px solid #333; height: 1px; margin-bottom: 10px;"></div>
            <p style="margin: 0;"><strong>Firma de Recibido (Cliente)</strong></p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Nombre: ______________________</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">DPI: _________________________</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function printHtml(html: string) {
  // 1. Create or retrieve the print container directly under body
  let printSec = document.getElementById('print-receipt-section');
  if (!printSec) {
    printSec = document.createElement('div');
    printSec.id = 'print-receipt-section';
    document.body.appendChild(printSec);
  }

  // 2. Set content and convert images to Base64
  printSec.innerHTML = html;
  await convertAllImagesToBase64(printSec);

  // 3. Inject global print stylesheet
  let printStyle = document.getElementById('print-receipt-style');
  if (!printStyle) {
    printStyle = document.createElement('style');
    printStyle.id = 'print-receipt-style';
    document.head.appendChild(printStyle);
  }
  printStyle.innerHTML = `
    @media print {
      body > *:not(#print-receipt-section) { display: none !important; }
      #print-receipt-section { 
        display: block !important;
        position: absolute !important; 
        left: 0 !important; 
        top: 0 !important; 
        width: 100% !important; 
        margin: 0 !important;
        padding: 0 !important;
      }
      @page { size: auto; margin: 0; }
    }
    #print-receipt-section { display: none; }
  `;

  // 4. Wait for all images to load
  const images = Array.from(printSec.querySelectorAll('img'));
  let loadedCount = 0;
  let printTriggered = false;

  const triggerPrint = () => {
    if (printTriggered) return;
    printTriggered = true;
    window.print();
  };

  const onImageLoaded = () => {
    loadedCount++;
    if (loadedCount >= images.length) {
      setTimeout(triggerPrint, 500);
    }
  };

  if (images.length === 0) {
    setTimeout(triggerPrint, 500);
  } else {
    images.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        onImageLoaded();
      } else {
        img.addEventListener('load', onImageLoaded);
        img.addEventListener('error', onImageLoaded);
      }
    });
    // Safety timeout
    setTimeout(triggerPrint, 6000);
  }

  // 5. Cleanup after print
  const restoreApp = () => {
    if (printSec) {
      printSec.innerHTML = '';
      printSec.style.display = 'none';
    }
  };
  window.addEventListener('afterprint', restoreApp, { once: true });
  setTimeout(restoreApp, 20000);
}

export async function downloadHtmlAsPdf(html: string, filename: string = 'factura.pdf') {
  // Create an isolated container hidden offscreen with fixed desktop layout width
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-100';

  const element = document.createElement('div');
  element.style.width = '800px';
  element.style.boxSizing = 'border-box';
  element.style.backgroundColor = '#ffffff';
  element.style.padding = '20px';
  element.innerHTML = html;

  container.appendChild(element);
  document.body.appendChild(container);

  try {
    // Convert images to base64 before passing to html2pdf
    await convertAllImagesToBase64(element);

    // Explicitly wait for all image elements to decode/load fully
    const imgs = Array.from(element.querySelectorAll('img'));
    await Promise.allSettled(
      imgs.map((img) => {
        const htmlImg = img as HTMLImageElement;
        if (typeof htmlImg.decode === 'function') {
          return htmlImg.decode().catch((e) => console.warn("Image decode notice", e));
        } else {
          return new Promise((resolve) => {
            if (htmlImg.complete && htmlImg.naturalHeight !== 0) {
              resolve(null);
            } else {
              htmlImg.onload = () => resolve(null);
              htmlImg.onerror = () => resolve(null);
            }
          });
        }
      })
    );

    // Wait a brief moment to allow layouts to compute and stabilize
    await new Promise((resolve) => setTimeout(resolve, 250));

    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        allowTaint: true
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    // @ts-ignore
    await html2pdf().from(element).set(opt).save();
  } catch (error) {
    console.error("PDF generation failed:", error);
    throw error;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  errors: string[];
  errorMessage?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const p = password || '';
  const hasMinLength = p.length >= 8;
  const hasUppercase = /[A-Z]/.test(p);
  const hasLowercase = /[a-z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(p);

  const errors: string[] = [];
  if (!hasMinLength) errors.push('mínimo 8 caracteres');
  if (!hasUppercase) errors.push('al menos una mayúscula (A-Z)');
  if (!hasLowercase) errors.push('al menos una minúscula (a-z)');
  if (!hasNumber) errors.push('al menos un número (0-9)');
  if (!hasSpecialChar) errors.push('al menos un carácter especial (ej. !@#$%)');

  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  return {
    isValid,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    errors,
    errorMessage: isValid ? undefined : `La contraseña debe tener ${errors.join(', ')}.`
  };
}

export async function downloadProductsPdf(products: any[]): Promise<void> {
  const dateStr = new Date().toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  let totalStock = 0;
  let totalValuation = 0;

  const rowsHtml = products.map((p, idx) => {
    const stock = Number(p.stock) || 0;
    const price = Number(p.price) || 0;
    const valuation = stock * price;
    totalStock += stock;
    totalValuation += valuation;

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'} page-break-inside: avoid; break-inside: avoid;">
        <td style="padding: 8px 10px; font-family: monospace; font-size: 10px; color: #475569;">${p.id ? String(p.id).substring(0, 8) : `PRD-${idx + 1}`}</td>
        <td style="padding: 8px 10px; font-weight: 600; color: #0f172a; font-size: 11px;">${p.name || 'Sin nombre'}</td>
        <td style="padding: 8px 10px; color: #475569; font-size: 10px;">${p.category || 'General'}</td>
        <td style="padding: 8px 10px; text-align: center; font-weight: 700; color: #1e293b; font-size: 11px;">${stock}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace; color: #0f172a; font-size: 11px;">Q${price.toFixed(2)}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a; font-size: 11px;">Q${valuation.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  // Create isolated container hidden from user view
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-100';

  const element = document.createElement('div');
  element.style.width = '800px';
  element.style.boxSizing = 'border-box';
  element.style.backgroundColor = '#ffffff';
  element.style.padding = '25px';

  element.innerHTML = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
        <div>
          <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase;">Sistema POS & Inventarios</h1>
          <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0; font-weight: 600;">Catálogo e Inventario Oficial de Productos</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 10px; color: #64748b; margin: 0; font-weight: 600;">FECHA DE EMISIÓN</p>
          <p style="font-size: 11px; font-weight: 700; color: #0f172a; margin: 2px 0 0 0;">${dateStr}</p>
        </div>
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
          <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">Total Productos</span>
          <span style="font-size: 15px; font-weight: 800; color: #0f172a;">${products.length} ítems</span>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px;">
          <span style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block;">Stock Físico Total</span>
          <span style="font-size: 15px; font-weight: 800; color: #0f172a;">${totalStock} unidades</span>
        </div>
        <div style="flex: 1; background: #0f172a; color: #ffffff; border-radius: 6px; padding: 10px 14px;">
          <span style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block;">Valoración Total</span>
          <span style="font-size: 15px; font-weight: 800; color: #ffffff;">Q${totalValuation.toFixed(2)}</span>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase; page-break-inside: avoid; break-inside: avoid;">
            <th style="padding: 10px; text-align: left; width: 15%;">Código / ID</th>
            <th style="padding: 10px; text-align: left; width: 35%;">Producto</th>
            <th style="padding: 10px; text-align: left; width: 20%;">Categoría</th>
            <th style="padding: 10px; text-align: center; width: 10%;">Stock</th>
            <th style="padding: 10px; text-align: right; width: 10%;">Precio (Q)</th>
            <th style="padding: 10px; text-align: right; width: 10%;">Subtotal (Q)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; page-break-inside: avoid; break-inside: avoid;">
        <span>Documento generado por el Sistema POS Enterprise</span>
        <span>Catálogo de Productos</span>
      </div>
    </div>
  `;

  container.appendChild(element);
  document.body.appendChild(container);

  // Explicitly wait for all image elements to decode/load fully
  const imgs = Array.from(element.querySelectorAll('img'));
  await Promise.allSettled(
    imgs.map((img) => {
      const htmlImg = img as HTMLImageElement;
      if (typeof htmlImg.decode === 'function') {
        return htmlImg.decode().catch((e) => console.warn("Image decode notice", e));
      } else {
        return new Promise((resolve) => {
          if (htmlImg.complete && htmlImg.naturalHeight !== 0) {
            resolve(null);
          } else {
            htmlImg.onload = () => resolve(null);
            htmlImg.onerror = () => resolve(null);
          }
        });
      }
    })
  );

  // Wait a brief moment to allow layouts to compute and stabilize
  await new Promise((resolve) => setTimeout(resolve, 250));

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename: `catalogo_productos_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['tr', '.avoid-break', 'tbody'] }
  };

  try {
    // @ts-ignore
    await html2pdf().set(opt).from(element).save();
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}


