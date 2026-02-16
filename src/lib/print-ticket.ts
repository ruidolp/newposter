export interface TicketData {
  order_number: string
  store_name: string
  created_at: string | null
  payment_method: string
  customer_name?: string | null
  items: {
    name: string
    sku?: string | null
    quantity: number
    unit_price: number
    discount?: number // amount off per unit, optional
  }[]
  total: number
  currency_symbol?: string
  // IVA rate, default 0.19 (19% Chile). Pass 0 to hide tax breakdown.
  iva_rate?: number
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
}

function fmt(n: number, symbol = '$'): string {
  return `${symbol}${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Math.round(n))}`
}

function pad(str: string, width: number, right = false): string {
  const s = str.slice(0, width)
  return right ? s.padStart(width) : s.padEnd(width)
}

export function printTicket(data: TicketData): void {
  const sym = data.currency_symbol ?? '$'
  const ivaRate = data.iva_rate ?? 0.19
  const date = data.created_at ? new Date(data.created_at) : new Date()
  const dateStr = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)

  const neto = ivaRate > 0 ? Math.round(data.total / (1 + ivaRate)) : data.total
  const iva = data.total - neto

  const w = typeof window !== 'undefined' ? window.open('', '_blank', 'width=400,height=700') : null
  if (!w) return

  const itemRows = data.items.map((item) => {
    const lineTotal = item.unit_price * item.quantity - (item.discount ?? 0) * item.quantity
    const discountLine = item.discount && item.discount > 0
      ? `  <tr><td colspan="3" style="padding:0 0 2px 0;color:#666;font-size:10px;">  Dto: -${fmt(item.discount * item.quantity, sym)}</td></tr>`
      : ''
    const nameCell = item.name.length > 18 ? item.name.slice(0, 18) + '…' : item.name
    return `
      <tr>
        <td style="padding:2px 0;vertical-align:top">${nameCell}</td>
        <td style="padding:2px 0;vertical-align:top;text-align:center">${item.quantity}</td>
        <td style="padding:2px 0;vertical-align:top;text-align:right;white-space:nowrap">${fmt(lineTotal, sym)}</td>
      </tr>
      ${discountLine}
    `
  }).join('')

  const taxSection = ivaRate > 0 ? `
    <tr><td colspan="2" style="padding:1px 0">Neto</td><td style="text-align:right;white-space:nowrap">${fmt(neto, sym)}</td></tr>
    <tr><td colspan="2" style="padding:1px 0">IVA (${Math.round(ivaRate * 100)}%)</td><td style="text-align:right;white-space:nowrap">${fmt(iva, sym)}</td></tr>
  ` : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Boleta ${data.order_number}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm 4mm 8mm 4mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
      width: 72mm;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .store-name {
      font-size: 15px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .order-num {
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      margin: 4px 0;
    }
    table { width: 100%; border-collapse: collapse; }
    th {
      font-size: 10px;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      font-weight: bold;
    }
    .total-row td {
      font-size: 13px;
      font-weight: bold;
      padding-top: 4px;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      margin-top: 10px;
      color: #333;
    }
    @media print {
      body { width: 72mm; }
    }
  </style>
</head>
<body>
  <div class="store-name">${data.store_name.toUpperCase()}</div>
  <div class="center" style="font-size:10px;color:#444;margin-bottom:4px">posfer.com</div>
  <div class="divider"></div>

  <div class="order-num">${data.order_number}</div>
  <div class="center" style="font-size:10px">${dateStr}</div>
  ${data.customer_name ? `<div class="center" style="font-size:10px;margin-top:2px">Cliente: ${data.customer_name}</div>` : ''}

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left">Producto</th>
        <th style="text-align:center">Cant</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="divider"></div>

  <table>
    ${taxSection}
    <tr class="total-row">
      <td colspan="2">TOTAL</td>
      <td style="text-align:right;white-space:nowrap">${fmt(data.total, sym)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <div class="center" style="font-size:10px">
    Método de pago: ${METHOD_LABEL[data.payment_method] ?? data.payment_method}
  </div>

  <div class="footer">
    <div class="divider"></div>
    ¡Gracias por su compra!
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 800);
    };
  </script>
</body>
</html>`

  w.document.write(html)
  w.document.close()
}
