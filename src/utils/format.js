export function pkr(value) {
  const amount = Math.round(Number(value) || 0)
  return `Rs ${amount.toLocaleString('en-PK')}`
}

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatClock(date) {
  return date.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })
}

export function formatDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })
}

export function formatDay(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function elapsedLabel(from, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - from) / 1000))
  const minutes = Math.floor(seconds / 60)
  const remain = seconds % 60
  return `${minutes}:${String(remain).padStart(2, '0')}`
}

export function sameDay(a, b) {
  const left = new Date(a)
  const right = new Date(b)
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function lineMeta(line) {
  return [line.variation, ...(line.choices || []), ...(line.addons || [])].filter(Boolean).join(' · ')
}

/** Included items on a deal. Prices on those rows are ignored. */
export function dealContents(source) {
  if (!source) return []
  const ready = Array.isArray(source.dealLines) ? source.dealLines : null
  const rows = ready?.length ? ready : (source.dealItems || [])
  return rows.map((row) => {
    const qty = Math.max(1, Number(row.qty ?? row.quantity) || 1)
    const variation = row.variation?.name || (typeof row.variation === 'string' ? row.variation : '')
    const base = String(row.label || row.name || '').trim()
    if (!base) return null
    const label = variation && !base.includes(`(${variation})`) ? `${base} (${variation})` : base
    return { qty, label }
  }).filter(Boolean)
}

/** Human ticket label — never a Mongo ObjectId / UUID. */
export function orderLabel(order) {
  const number = String(order?.orderNumber || '').trim()
  if (number && !/^[a-f\d]{24}$/i.test(number) && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(number)) {
    return number
  }
  if (order?.createdAt) {
    const stamp = new Date(order.createdAt)
    const hh = String(stamp.getHours()).padStart(2, '0')
    const mm = String(stamp.getMinutes()).padStart(2, '0')
    return `Ticket ${hh}${mm}`
  }
  return 'Ticket'
}

export function itemsLabel(order, limit = 3) {
  const items = order?.items || []
  if (!items.length) return 'No items'
  const shown = items.slice(0, limit).map((item) => `${item.qty}× ${item.name}`).join(', ')
  const extra = items.length - limit
  return extra > 0 ? `${shown} +${extra} more` : shown
}

export function typeLabel(type) {
  const labels = {
    DINE_IN: 'Dine In',
    TAKE_AWAY: 'Take Away',
    DELIVERY: 'Delivery',
    FOOD_PANDA: 'Foodpanda',
    FOODPANDA: 'Foodpanda',
    BITES: 'Bites',
    BITE: 'Bites',
    'dine-in': 'Dine In',
    takeaway: 'Take Away',
    delivery: 'Delivery',
    foodpanda: 'Foodpanda',
    bite: 'Bites',
  }
  return labels[type] || labels[String(type || '').toUpperCase().replace(/[\s-]+/g, '_')] || type
}

export function prepLabel(status) {
  const labels = {
    new: 'New',
    preparing: 'Preparing',
    ready: 'Ready',
    dispatched: 'Dispatched',
    cancelled: 'Cancelled',
    PENDING: 'New',
    RECEIVED: 'New',
    PREPARING: 'Preparing',
    READY: 'Ready',
    DISPATCHED: 'Dispatched',
    CANCELLED: 'Cancelled',
  }
  return labels[status] || status
}
