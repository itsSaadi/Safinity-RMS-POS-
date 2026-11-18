const API = '/api/v1'
const REFRESH_KEY = 'orra.pos.refresh'
const BRANCH_KEY = 'orra.pos.branch'
const CART_KEY = 'orra.pos.cart'
const USER_KEY = 'orra.pos.user'
const DESK_KEY = 'orra.pos.desk'

let accessToken = null
let accessExpiresAt = 0
let refreshPromise = null

export function can(user, permission) {
  if (!user) return false
  if (user.role === 'SUPER_ADMIN') return true
  return Boolean(user.permissions?.includes(permission))
}

export function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY)
}

export function getStoredBranchId() {
  return sessionStorage.getItem(BRANCH_KEY) || ''
}

export function setStoredBranchId(id) {
  if (id) sessionStorage.setItem(BRANCH_KEY, String(id))
  else sessionStorage.removeItem(BRANCH_KEY)
}

export function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function getStoredCart() {
  try {
    return JSON.parse(sessionStorage.getItem(CART_KEY) || 'null')
  } catch {
    return null
  }
}

export function setStoredCart(cart) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart))
}

export function getStoredDesk(branchId) {
  if (!branchId) return null
  try {
    const all = JSON.parse(sessionStorage.getItem(DESK_KEY) || '{}')
    const row = all[String(branchId)]
    return row && typeof row === 'object' ? row : null
  } catch {
    return null
  }
}

export function setStoredDesk(branchId, data) {
  if (!branchId) return
  try {
    const all = JSON.parse(sessionStorage.getItem(DESK_KEY) || '{}')
    all[String(branchId)] = { ...data, savedAt: Date.now() }
    sessionStorage.setItem(DESK_KEY, JSON.stringify(all))
  } catch {
    // Ignore quota / serialization issues; live state still works.
  }
}

export function clearStoredDesk(branchId) {
  if (!branchId) {
    sessionStorage.removeItem(DESK_KEY)
    return
  }
  try {
    const all = JSON.parse(sessionStorage.getItem(DESK_KEY) || '{}')
    delete all[String(branchId)]
    sessionStorage.setItem(DESK_KEY, JSON.stringify(all))
  } catch {
    sessionStorage.removeItem(DESK_KEY)
  }
}

function setSession(bundle) {
  accessToken = bundle.accessToken || bundle.token || null
  accessExpiresAt = Date.now() + (Number(bundle.expiresIn) || 900) * 1000
  if (bundle.refreshToken) sessionStorage.setItem(REFRESH_KEY, bundle.refreshToken)
  if (bundle.user) sessionStorage.setItem(USER_KEY, JSON.stringify(bundle.user))
}

function clearSession() {
  accessToken = null
  accessExpiresAt = 0
  sessionStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(DESK_KEY)
}

function unwrap(json) {
  if (json && typeof json === 'object' && 'data' in json) return json.data
  return json
}

function errorMessage(json, fallback) {
  return json?.message || json?.error || fallback
}

async function parse(response) {
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(errorMessage(json, 'Request failed'))
    error.status = response.status
    error.errors = json.errors || []
    throw error
  }
  return unwrap(json)
}

export async function login(email, password) {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await parse(response)
  setSession(data)
  return data.user
}

export async function refreshSession() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      try {
        const data = await parse(response)
        setSession(data)
        return data.user
      } catch (error) {
        clearSession()
        throw error
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

export async function logout() {
  const refreshToken = getRefreshToken()
  try {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    })
  } catch {
    // Ignore network logout failures; local session still clears.
  }
  clearSession()
}

export async function fetchMe() {
  return api('/auth/me')
}

export async function fetchBranches(params = {}) {
  const query = new URLSearchParams({ isActive: 'true' })
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') query.set(key, String(value))
  })
  return api(`/branches?${query}`)
}

export async function fetchCatalog(branchId, restaurantId) {
  const query = new URLSearchParams({ branchId: String(branchId) })
  if (restaurantId) query.set('restaurantId', String(restaurantId))
  return api(`/menu/catalog?${query}`)
}

function branchQuery(branchId, restaurantId, extra = {}) {
  const query = new URLSearchParams({ branchId: String(branchId), isActive: 'true', ...extra })
  if (restaurantId) query.set('restaurantId', String(restaurantId))
  return query
}

export function asList(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.results)) return payload.results
  if (Array.isArray(payload.rows)) return payload.rows
  return []
}

export function paymentKindFromCode(code = '', name = '') {
  const key = `${code} ${name}`.toUpperCase()
  if (/PAY.?LATER|LATER|UNPAID/.test(key)) return 'later'
  if (/CREDIT|ACCOUNT/.test(key)) return 'credit'
  if (/MIX/.test(key)) return 'mixed'
  if (/EASY/.test(key)) return 'easypaisa'
  if (/JAZZ/.test(key)) return 'jazzcash'
  if (/CARD|VISA|MASTER|DEBIT/.test(key)) return 'card'
  if (/CASH/.test(key)) return 'cash'
  return 'cash'
}

export async function fetchTables(branchId, restaurantId) {
  return api(`/tables?${branchQuery(branchId, restaurantId)}`)
}

export async function fetchWaiters(branchId, restaurantId) {
  return api(`/waiters?${branchQuery(branchId, restaurantId)}`)
}

export async function fetchRiders(branchId, restaurantId) {
  return api(`/riders?${branchQuery(branchId, restaurantId)}`)
}

export async function fetchPaymentTypes(branchId, restaurantId) {
  return api(`/payment-types?${branchQuery(branchId, restaurantId)}`)
}

export async function fetchCustomers({ restaurantId, search = '', isActive = true } = {}) {
  const query = new URLSearchParams()
  if (restaurantId) query.set('restaurantId', String(restaurantId))
  if (search) query.set('search', search)
  if (isActive != null) query.set('isActive', String(isActive))
  return api(`/customers?${query}`)
}

export async function createCustomer(body) {
  return api('/customers', { method: 'POST', body: JSON.stringify(body) })
}

export async function createOrder(body) {
  return api('/orders', { method: 'POST', body: JSON.stringify(body) })
}

export async function fetchOrders(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') query.set(key, String(value))
  })
  return api(`/orders?${query}`)
}

export async function fetchOrder(id) {
  return api(`/orders/${id}`)
}

export async function updateOrder(id, body) {
  return api(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function updateOrderStatus(id, status) {
  return api(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/** Editable until paid, cancelled, or dispatched (matches API assertOrderEditable). */
export function canEditOrder(order) {
  if (!order) return false
  const payment = String(order.paymentStatus || '').toLowerCase()
  const status = String(order.apiStatus || '').toUpperCase()
  const prep = String(order.prepStatus || '').toLowerCase()
  if (payment === 'paid') return false
  if (status === 'CANCELLED' || status === 'DISPATCHED') return false
  if (prep === 'cancelled' || prep === 'dispatched') return false
  return true
}

/** POS staff who can create/update orders may open the editor. */
export function canUserEditOrder(user, order) {
  if (!canEditOrder(order)) return false
  if (!user) return false
  if (user.role === 'SUPER_ADMIN') return true
  return can(user, 'order:update') || can(user, 'order:create')
}

export async function payOrder(id, body) {
  return api(`/orders/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function cancelOrder(id, body = {}) {
  return api(`/orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function apiStatusToPrep(status = '') {
  const key = String(status || '').toUpperCase()
  if (key === 'PREPARING') return 'preparing'
  if (key === 'READY') return 'ready'
  if (key === 'DISPATCHED') return 'dispatched'
  if (key === 'CANCELLED') return 'cancelled'
  return 'new'
}

export function prepToApiStatus(prep = '') {
  const key = String(prep || '').toLowerCase()
  if (key === 'preparing') return 'PREPARING'
  if (key === 'ready') return 'READY'
  if (key === 'dispatched') return 'DISPATCHED'
  if (key === 'cancelled') return 'CANCELLED'
  return 'PENDING'
}

export function mapOrder(row, extras = {}) {
  if (!row) return null
  const id = String(row.id || row._id)
  const total = Number(row.total) || 0
  const amountPaid = Number(row.amountPaid) || 0
  const paymentStatus = String(row.paymentStatus || 'UNPAID').toLowerCase()
  const address = row.deliveryAddress || {}
  return {
    id,
    orderNumber: row.orderNumber || '',
    createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
    customer: extras.customer || row.customerName || '',
    customerId: row.customerId ? String(row.customerId) : '',
    phone: address.phone || extras.phone || '',
    type: normalizeOrderTypeCode(row.orderType || 'DINE_IN'),
    source: 'POS',
    table: row.tableName || '',
    tableId: row.tableId ? String(row.tableId) : '',
    waiter: row.waiterName || '',
    waiterId: row.waiterId ? String(row.waiterId) : '',
    rider: row.riderName || '',
    riderId: row.riderId ? String(row.riderId) : '',
    address: address.line1 || '',
    externalRef: address.notes || '',
    paymentStatus,
    paymentMethod: paymentKindFromCode(row.paymentTypeCode, row.paymentTypeName),
    paymentTypeId: row.paymentTypeId ? String(row.paymentTypeId) : '',
    paymentTypeName: row.paymentTypeName || '',
    cashAmount: 0,
    cardAmount: 0,
    received: amountPaid,
    balance: Math.max(0, total - amountPaid),
    amount: total,
    amountReturn: Number(row.amountReturn) || 0,
    prepStatus: apiStatusToPrep(row.status),
    apiStatus: String(row.status || 'PENDING').toUpperCase(),
    taxInclusive: Boolean(row.taxInclusive),
    taxPercent: Number(row.taxPercent) || 0,
    taxAmount: Number(row.taxAmount) || 0,
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discountAmount) || 0,
    deliveryCharge: Number(row.deliveryCharge) || 0,
    notes: row.notes || '',
    items: (row.items || []).map((item, index) => {
      const choiceMap = {}
      for (const choice of item.choices || []) {
        if (choice.choiceGroupId && choice.choiceId) {
          choiceMap[String(choice.choiceGroupId)] = String(choice.choiceId)
        }
      }
      return {
        id: String(item.id || item._id || `${id}-item-${index}`),
        productId: String(item.menuItemId || ''),
        name: item.name || 'Item',
        qty: Number(item.quantity) || 1,
        station: item.station || item.kitchenName || '',
        unitPrice: Number(item.unitPrice) || 0,
        variationId: item.variationId ? String(item.variationId) : null,
        variation: item.variationName || null,
        choiceMap,
        choices: (item.choices || []).map((choice) => choice.name).filter(Boolean),
        addons: [],
        instructions: item.notes || '',
        ready: Boolean(item.ready),
      }
    }),
  }
}

export function buildOrderItemsPayload(lines = []) {
  return lines.map((line) => ({
    menuItemId: String(line.productId),
    variationId: line.variationId ? String(line.variationId) : null,
    quantity: Math.max(1, Number(line.qty) || 1),
    notes: line.instructions || '',
    choices: Object.entries(line.choiceMap || {}).map(([choiceGroupId, choiceId]) => ({
      choiceId: String(choiceId),
      choiceGroupId: String(choiceGroupId),
    })),
  }))
}

export function formatFloorLabel(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return 'Main floor'
  if (/^main(\s+floor)?$/i.test(raw)) return 'Main floor'
  const numbered = raw.match(/^(?:floor\s*)?(\d+[a-z]?)$/i)
  if (numbered) return `Floor ${numbered[1]}`
  if (/^floor\b/i.test(raw)) return raw.replace(/^floor/i, 'Floor')
  return `Floor ${raw}`
}

export function mapTables(rows = []) {
  return asList(rows).map((row) => ({
    id: String(row.id),
    label: row.name || row.code || 'Table',
    code: row.code || '',
    capacity: Number(row.capacity) || 0,
    status: String(row.status || 'AVAILABLE').toUpperCase(),
    floor: formatFloorLabel(row.floor),
  }))
}

export function groupTablesByFloor(tables = []) {
  const groups = new Map()
  for (const table of tables) {
    const floor = formatFloorLabel(table.floor)
    if (!groups.has(floor)) groups.set(floor, [])
    groups.get(floor).push(table)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === 'Main floor') return -1
      if (b === 'Main floor') return 1
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    })
    .map(([floor, items]) => ({
      floor,
      tables: items.slice().sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
    }))
}

export function mapWaiters(rows = []) {
  return asList(rows).map((row) => ({
    id: String(row.id),
    label: row.name || row.employeeCode || 'Waiter',
    phone: row.phone || '',
  }))
}

export function mapRiders(rows = []) {
  return asList(rows).map((row) => ({
    id: String(row.id),
    name: row.name || row.employeeCode || 'Rider',
    phone: row.phone || '',
    vehicle: [row.vehicleType, row.vehicleNumber].filter(Boolean).join(' · '),
    status: row.isActive === false ? 'out' : 'free',
  }))
}

export function mapPaymentTypes(rows = []) {
  return asList(rows).map((row) => {
    const code = row.code || ''
    return {
      id: String(row.id),
      label: row.name || code || 'Payment',
      code,
      kind: paymentKindFromCode(code, row.name),
      tax: Number(row.tax) || 0,
      sortOrder: Number(row.sortOrder) || 0,
    }
  }).sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function api(path, options = {}) {
  if (!accessToken || Date.now() > accessExpiresAt - 30_000) {
    if (getRefreshToken()) await refreshSession()
  }
  if (!accessToken) throw Object.assign(new Error('Session expired'), { status: 401 })

  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${accessToken}`,
    ...(options.headers || {}),
  }

  const response = await fetch(`${API}${path}`, { ...options, headers })
  if (response.status === 401 && getRefreshToken()) {
    await refreshSession()
    const retry = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...headers,
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return parse(retry)
  }
  return parse(response)
}

export function hasSession() {
  return Boolean(getRefreshToken())
}

export function channelFromOrderCode(code = '') {
  const key = String(code || '').toUpperCase().replace(/[\s-]+/g, '_')
  if (key === 'TAKE_AWAY' || key === 'TAKEAWAY') return 'takeaway'
  if (key === 'DELIVERY') return 'delivery'
  if (key === 'FOOD_PANDA' || key === 'FOODPANDA') return 'foodpanda'
  if (key === 'BITES' || key === 'BITE') return 'bite'
  if (key === 'DINE_IN' || key === 'DINEIN') return 'dine-in'
  if (['dine-in', 'takeaway', 'delivery', 'foodpanda', 'bite'].includes(code)) return code
  return 'dine-in'
}

export function normalizeOrderTypeCode(value = '') {
  const channel = channelFromOrderCode(value)
  const byChannel = {
    'dine-in': 'DINE_IN',
    takeaway: 'TAKE_AWAY',
    delivery: 'DELIVERY',
    foodpanda: 'FOOD_PANDA',
    bite: 'BITES',
  }
  const raw = String(value || '').toUpperCase().replace(/[\s-]+/g, '_')
  if (raw === 'FOODPANDA') return 'FOOD_PANDA'
  if (raw === 'BITE') return 'BITES'
  if (['DINE_IN', 'TAKE_AWAY', 'DELIVERY', 'FOOD_PANDA', 'BITES'].includes(raw)) return raw
  return byChannel[channel] || 'DINE_IN'
}

export function mapRestaurantOrderTypes(rows = []) {
  const list = Array.isArray(rows) ? rows : []
  return list.map((row) => {
    const code = normalizeOrderTypeCode(row.code || row.id || '')
    return {
      id: String(row.id ?? code),
      code,
      label: row.name || code.replace(/_/g, ' '),
      channel: channelFromOrderCode(code),
    }
  }).filter((row) => row.code)
}

export function channelPrice(prices, orderType) {
  if (!prices || typeof prices !== 'object') return Number(prices) || 0
  const channel = channelFromOrderCode(orderType)
  if (channel === 'takeaway') return Number(prices.takeAway ?? prices.takeaway ?? prices.dineIn) || 0
  if (channel === 'delivery' || channel === 'foodpanda' || channel === 'bite') {
    return Number(prices.delivery ?? prices.dineIn) || 0
  }
  return Number(prices.dineIn ?? prices.takeAway ?? prices.delivery) || 0
}

export function mapCatalog(categories = [], orderType = 'DINE_IN') {
  const cats = [{ id: 'all', name: 'All' }]
  const products = []
  let index = 0

  for (const category of categories) {
    const categoryId = String(category.id)
    cats.push({
      id: categoryId,
      name: category.name || 'Menu',
      image: category.imageUrl || category.image || '',
    })

    for (const item of category.items || []) {
      const base = channelPrice(item.prices, orderType)
      const variations = (item.variations || []).map((row) => ({
        id: String(row.id),
        name: row.name,
        price: channelPrice(row.prices, orderType) - base,
        choiceGroups: mapGroups(row.choiceGroups, orderType),
      }))
      const choiceGroups = mapGroups(item.choiceGroups, orderType)
      const dealChoices = (item.dealItems || []).flatMap((deal) => mapGroups(deal.choiceGroups, orderType))
      products.push({
        id: String(item.id),
        code: item.sku || item.code || `MI-${item.id}`,
        name: item.name,
        category: categoryId,
        categoryName: category.name || 'Menu',
        price: base,
        prices: item.prices || {},
        station: item.kitchenName || item.station || '',
        available: item.isActive !== false && item.status !== 'inactive',
        popular: Boolean(item.isFavorite) || index < 6,
        featured: index === 0,
        description: item.description || item.ingredient || '',
        image: item.imageUrl || item.image || '',
        isDeal: Boolean(item.isDeal),
        dealItems: item.dealItems || [],
        variations,
        choiceGroups: [...choiceGroups, ...dealChoices],
        addons: [],
      })
      index += 1
    }
  }

  return { categories: cats, products }
}

function mapGroups(groups = [], orderType) {
  return (groups || []).map((group) => ({
    id: String(group.id),
    name: group.name,
    required: Number(group.minChoices) > 0,
    minChoices: Number(group.minChoices) || 0,
    maxChoices: Number(group.maxChoices) || 1,
    options: (group.choices || []).map((choice) => ({
      id: String(choice.id),
      name: choice.name,
      price: channelPrice(choice.prices, orderType),
      image: choice.imageUrl || choice.image || '',
    })),
  }))
}

// Back-compat aliases used by older mock code paths.
export function getToken() {
  return accessToken || getRefreshToken()
}

export function setToken(token) {
  if (!token) clearSession()
}
