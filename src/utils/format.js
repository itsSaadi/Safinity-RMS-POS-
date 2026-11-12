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

export function typeLabel(type) {
  const labels = {
    'dine-in': 'Dine-in',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
    foodpanda: 'Foodpanda',
    bite: 'Bite',
  }
  return labels[type] || type
}

export function prepLabel(status) {
  const labels = {
    new: 'New',
    preparing: 'Preparing',
    ready: 'Ready',
    dispatched: 'Served',
  }
  return labels[status] || status
}
