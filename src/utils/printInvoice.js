import { dealContents, formatTime, lineMeta, orderLabel, typeLabel } from './format'

function money(value) {
  const amount = Math.round(Number(value) || 0)
  return `PKR. ${amount.toLocaleString('en-PK')}`
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shopInfo(ctx = {}) {
  const restaurant = ctx.restaurant || {}
  const branch = ctx.branchLabel || restaurant.branch || ''
  return {
    name: restaurant.name || branch || 'Restaurant',
    address: restaurant.address || [branch, restaurant.city].filter(Boolean).join(', '),
    phone: restaurant.phone || '',
  }
}

function metaRows(order, user) {
  const created = order.createdAt ? new Date(order.createdAt) : new Date()
  const date = created.toLocaleDateString('en-GB')
  const time = formatTime(order.createdAt || Date.now())
  return {
    left: [
      ['Name', order.customer || 'Walk-in'],
      ['Order Type', typeLabel(order.type)],
      order.table ? ['Table No', order.table] : null,
      ['Order Date', date],
      ['Contact No', order.phone || '—'],
      ['Payment Type', order.paymentTypeName || order.paymentMethod || '—'],
    ].filter(Boolean),
    right: [
      ['Order Taker', user?.name || 'Cashier'],
      ['Order Time', time],
      ['Order Channel', order.source || 'POS'],
      ['Waiter', order.waiter || '—'],
      order.rider ? ['Rider', order.rider] : null,
    ].filter(Boolean),
  }
}

function itemLinesHtml(order, { showPrice }) {
  const items = order.items || []
  return items.map((item) => {
    const meta = lineMeta(item)
    const note = item.instructions ? `<div class="note">Note: ${esc(item.instructions)}</div>` : ''
    const sub = meta ? `<div class="sub">${esc(meta)}</div>` : ''
    const inside = (item.dealLines || []).map((line) => `<div class="sub">${esc(line.qty)} x ${esc(line.label)}</div>`).join('')
    const qtyPrice = showPrice
      ? `<div class="qty">(${esc(item.qty)}x) ${money(item.unitPrice * item.qty)}</div>`
      : `<div class="qty">${esc(item.qty)} ×</div>`
    return `
      <div class="item">
        <div class="row">
          <div class="name">${esc(item.name)}</div>
          ${showPrice ? '' : qtyPrice}
        </div>
        ${sub}
        ${inside}
        ${showPrice ? qtyPrice : ''}
        ${note}
      </div>
    `
  }).join('')
}

function totalsHtml(order) {
  const count = (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
  const discount = Number(order.discountAmount) || 0
  const tax = Number(order.taxAmount) || 0
  const service = Number(order.serviceCharge) || 0
  const delivery = Number(order.deliveryCharge) || 0
  const subtotal = Number(order.subtotal) || Math.max(0, Number(order.amount) - tax - delivery - service + discount)
  const rows = [
    ['Items', String(count)],
    ['Subtotal', money(subtotal)],
    discount > 0 ? ['Discount', money(discount)] : null,
    tax > 0 ? [`Tax${order.taxInclusive ? ' incl.' : ''}${order.taxPercent ? ` (${order.taxPercent}%)` : ''}`, money(tax)] : null,
    service > 0 ? ['Service', money(service)] : null,
    delivery > 0 ? ['Delivery', money(delivery)] : null,
    ['Total', money(order.amount)],
  ].filter(Boolean)

  return rows.map(([label, value], index) => {
    const strong = index === rows.length - 1 ? ' class="total"' : ''
    return `<div class="trow"${strong}><span>${esc(label)}</span><span>${esc(value)}</span></div>`
  }).join('')
}

function shell(title, body) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      background: #fff;
    }
    .ticket {
      width: 80mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 10px 12px 16px;
      font-size: 12px;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .muted { color: #555; }
    .title { font-size: 16px; font-weight: 800; margin: 8px 0 10px; }
    .shop-name { font-size: 18px; font-weight: 800; margin: 4px 0; }
    .dash {
      border: 0;
      border-top: 1px dashed #333;
      margin: 10px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 10px;
    }
    .meta div { margin-bottom: 2px; }
    .label { color: #444; }
    .order-no { text-align: center; font-weight: 800; font-size: 14px; margin: 4px 0 8px; }
    .heads {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .item { margin-bottom: 8px; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .name { font-weight: 700; text-transform: uppercase; }
    .sub, .note { color: #555; font-size: 11px; }
    .qty { margin-top: 2px; }
    .trow {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 3px 0;
    }
    .trow.total { font-weight: 800; font-size: 14px; margin-top: 6px; }
    .status {
      text-align: center;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.04em;
      margin: 12px 0 8px;
      text-transform: uppercase;
    }
    .footer { text-align: center; color: #666; font-size: 11px; }
    @media print {
      body { margin: 0; }
      .ticket { width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="ticket">${body}</div>
  <script>
    function goPrint() {
      try { window.focus(); window.print(); } catch (e) {}
    }
    if (document.readyState === 'complete') {
      setTimeout(goPrint, 250);
    } else {
      window.addEventListener('load', function () { setTimeout(goPrint, 250); });
    }
  </script>
</body>
</html>`
}

function buildCustomerHtml(order, ctx) {
  const shop = shopInfo(ctx)
  const meta = metaRows(order, ctx.user)
  const paid = String(order.paymentStatus || '').toLowerCase() === 'paid'
  return shell(`Customer Invoice ${orderLabel(order)}`, `
    <div class="center">
      <div class="shop-name">${esc(shop.name)}</div>
      ${shop.address ? `<div class="muted">${esc(shop.address)}</div>` : ''}
      ${shop.phone ? `<div class="muted">${esc(shop.phone)}</div>` : ''}
      <div class="title">Customer Invoice</div>
    </div>
    <div class="grid meta">
      <div>${meta.left.map(([k, v]) => `<div><span class="label">${esc(k)}:</span> ${esc(v)}</div>`).join('')}</div>
      <div>${meta.right.map(([k, v]) => `<div><span class="label">${esc(k)}:</span> ${esc(v)}</div>`).join('')}</div>
    </div>
    <hr class="dash" />
    <div class="order-no">Order No ${esc(orderLabel(order))}</div>
    <div class="heads"><span>Items</span><span>Price</span></div>
    ${itemLinesHtml(order, { showPrice: true })}
    <hr class="dash" />
    ${totalsHtml(order)}
    <hr class="dash" />
    <div class="status">${paid ? 'PAID' : 'UNPAID'}</div>
    <div class="footer">
      <div>Powered By Safinity RMS</div>
      <div>${esc(new Date().toLocaleString('en-GB'))}</div>
    </div>
  `)
}

function buildProvisionHtml(order, ctx) {
  const meta = metaRows(order, ctx.user)
  const paid = String(order.paymentStatus || '').toLowerCase() === 'paid'
  return shell(`Provision Invoice ${orderLabel(order)}`, `
    <div class="center title">Provision Invoice</div>
    <div class="grid meta">
      <div>${meta.left.map(([k, v]) => `<div><span class="label">${esc(k)}:</span> ${esc(v)}</div>`).join('')}</div>
      <div>${meta.right.map(([k, v]) => `<div><span class="label">${esc(k)}:</span> ${esc(v)}</div>`).join('')}</div>
    </div>
    <hr class="dash" />
    <div class="order-no">Order No ${esc(orderLabel(order))}</div>
    <div class="heads"><span>Items</span><span>Price</span></div>
    ${itemLinesHtml(order, { showPrice: true })}
    <hr class="dash" />
    ${totalsHtml(order)}
    <hr class="dash" />
    <div class="status">${paid ? 'PAID' : 'UNPAID'}</div>
    <div class="footer">
      <div>Powered By Safinity RMS</div>
      <div>${esc(new Date().toLocaleString('en-GB'))}</div>
    </div>
  `)
}

function buildKitchenHtml(order, ctx) {
  const meta = metaRows(order, ctx.user)
  return shell(`Kitchen Ticket ${orderLabel(order)}`, `
    <div class="center title">Kitchen Ticket</div>
    <div class="grid meta">
      <div>${meta.left.map(([k, v]) => `<div><span class="label">${esc(k)}:</span> ${esc(v)}</div>`).join('')}</div>
      <div>${meta.right.map(([k, v]) => `<div><span class="label">${esc(k)}:</span> ${esc(v)}</div>`).join('')}</div>
    </div>
    <hr class="dash" />
    <div class="order-no">Order No ${esc(orderLabel(order))}</div>
    <div class="heads"><span>Items</span><span>Qty</span></div>
    ${itemLinesHtml(order, { showPrice: false })}
    ${order.notes ? `<hr class="dash" /><div class="note"><strong>Order notes:</strong> ${esc(order.notes)}</div>` : ''}
    <hr class="dash" />
    <div class="footer">
      <div>${esc(new Date().toLocaleString('en-GB'))}</div>
    </div>
  `)
}

function attachDealLines(order, ctx) {
  if (typeof ctx.productById !== 'function') return order
  return {
    ...order,
    items: (order.items || []).map((item) => {
      const own = dealContents(item)
      return {
        ...item,
        dealLines: own.length ? own : dealContents(ctx.productById(item.productId)),
      }
    }),
  }
}

export const INVOICE_TYPES = [
  { id: 'customer', label: 'Customer invoice' },
  { id: 'provision', label: 'Provision invoice' },
  { id: 'kitchen', label: 'Kitchen ticket' },
]

/** Open during the click, before any await, so the invoice is not blocked. */
export function preparePrintWindow() {
  const win = window.open('about:blank', '_blank', 'width=480,height=760')
  if (!win) throw new Error('Allow pop-ups to print invoices')
  return win
}

export function printInvoice(type, order, ctx = {}, target) {
  if (!order) throw new Error('No order to print')
  const detailed = attachDealLines(order, ctx)

  let html = ''
  if (type === 'kitchen') html = buildKitchenHtml(detailed, ctx)
  else if (type === 'provision') html = buildProvisionHtml(detailed, ctx)
  else html = buildCustomerHtml(detailed, ctx)

  // Blob URL avoids blank about:blank windows (document.write + noopener issues).
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const ready = target && !target.closed ? target : null
  const win = ready || window.open(url, '_blank', 'width=480,height=760')
  if (!win) {
    URL.revokeObjectURL(url)
    throw new Error('Allow pop-ups to print invoices')
  }
  if (ready) ready.location.href = url
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
