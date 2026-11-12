import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DELIVERY_FEE, TAX_RATE } from '../data/catalog'
import { OPENING_FLOAT, seedExpenses, seedStaff } from '../data/seed'
import { api, getToken, setToken } from '../api'
import { uid } from '../utils/format'

const PosContext = createContext(null)

const shots = [
  ['burger', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=70'],
  ['pizza', 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=900&q=70'],
  ['cola', 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=900&q=70'],
  ['water', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=70'],
  ['latte', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=70'],
  ['coffee', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=70'],
  ['brownie', 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=900&q=70'],
  ['ice', 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=900&q=70'],
]

function dishPhoto(name, image) {
  if (image) return image
  const key = String(name || '').toLowerCase()
  return shots.find(([word]) => key.includes(word))?.[1] || ''
}

const emptyCart = {
  lines: [],
  orderType: 'dine-in',
  tableId: '',
  waiterId: '',
  zoneId: '',
  customer: '',
  phone: '',
  address: '',
  rider: '',
  externalRef: '',
  discount: 0,
  quote: null,
}

export function summarize(cart) {
  const count = cart.lines.reduce((sum, line) => sum + line.qty, 0)
  if (cart.quote) {
    return {
      subtotal: cart.quote.subtotal,
      discount: cart.quote.discount,
      delivery: cart.quote.delivery_charge,
      tax: cart.quote.tax,
      total: cart.quote.total,
      count,
    }
  }
  const subtotal = cart.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  const discount = Math.min(subtotal, Math.max(0, Number(cart.discount) || 0))
  const delivery = cart.orderType === 'delivery' ? DELIVERY_FEE : 0
  const taxable = Math.max(0, subtotal - discount)
  const tax = Math.round(taxable * TAX_RATE)
  const total = taxable + tax + delivery
  return { subtotal, discount, delivery, tax, total, count }
}

function prepOf(status) {
  if (status === 'accepted' || status === 'open' || status === 'held') return 'new'
  if (status === 'served' || status === 'posted') return 'dispatched'
  return status
}

function toView(order, kitchens) {
  const paid = Number(order.paid_amount) || 0
  const total = Number(order.total) || 0
  const cash = (order.payments || []).filter((row) => row.method === 'cash').reduce((sum, row) => sum + Number(row.amount), 0)
  return {
    id: order.number,
    apiId: order.id,
    apiStatus: order.status,
    createdAt: new Date(String(order.sent_kitchen_at || order.created_at || order.business_date).replace(' ', 'T')).getTime() || Date.now(),
    customer: order.customer_name || 'Guest',
    phone: order.customer_phone || '',
    type: order.type === 'dinein' ? 'dine-in' : order.type,
    source: 'Orra RMS',
    table: order.table_name || '',
    waiter: order.waiter_name || '',
    rider: '',
    address: order.notes || '',
    externalRef: '',
    paymentStatus: paid <= 0 ? 'unpaid' : paid + 0.01 < total ? 'partial' : 'paid',
    paymentMethod: order.payments?.[0]?.method || '',
    cashAmount: cash,
    received: paid,
    balance: Math.max(0, total - paid),
    prepStatus: prepOf(order.status),
    amount: total,
    discount: Number(order.discount) || 0,
    tax: Number(order.tax) || 0,
    delivery: Number(order.delivery_charge) || 0,
    businessDate: order.business_date,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.menu_item_id,
      name: item.name,
      qty: item.quantity,
      station: kitchens.get(item.kitchen_id) || '',
      unitPrice: item.unit_price,
      variation: null,
      choices: (item.choices || []).map((choice) => choice.name),
      addons: [],
      instructions: item.notes || '',
      ready: item.status === 'ready' || item.status === 'served',
    })),
  }
}

function toProduct(item, catalog, kitchens, index) {
  const variations = (catalog.variations || []).filter((row) => row.menu_item_id === item.id)
  const groups = (catalog.groups || []).filter((row) => row.menu_item_id === item.id)
  return {
    id: item.id,
    code: item.sku || `OR-${item.id}`,
    name: item.name,
    category: String(item.category_id),
    categoryName: catalog.categories.find((row) => row.id === item.category_id)?.name || 'Menu',
    price: Number(item.price) || 0,
    station: kitchens.get(item.kitchen_id) || '',
    available: item.status === 'active',
    popular: index < 6,
    featured: index === 0,
    description: item.description || '',
    image: dishPhoto(item.name, item.image),
    variations: variations.map((row) => ({ id: row.id, name: row.name, price: Number(row.price) - Number(item.price) })),
    choiceGroups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      required: Boolean(group.required) || Number(group.min_select) > 0,
      options: (catalog.choices || []).filter((choice) => choice.group_id === group.id).map((choice) => ({
        id: choice.id,
        name: choice.name,
        price: Number(choice.price) || 0,
      })),
    })),
    addons: [],
  }
}

export function PosProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('orra-theme') || 'light')
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [branchId, setBranchId] = useState('')
  const [branchLabel, setBranchLabel] = useState('')
  const [businessDate, setBusinessDate] = useState('')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([{ id: 'all', name: 'All' }])
  const [tables, setTables] = useState([])
  const [waiters, setWaiters] = useState([])
  const [zones, setZones] = useState([])
  const [cart, setCart] = useState(emptyCart)
  const [orders, setOrders] = useState([])
  const [history, setHistory] = useState([])
  const [expenses, setExpenses] = useState(seedExpenses)
  const [riders, setRiders] = useState([])
  const [staff, setStaff] = useState(seedStaff)
  const [recentIds, setRecentIds] = useState([])
  const [toasts, setToasts] = useState([])
  const [closing, setClosing] = useState(null)
  const kitchensRef = useRef([])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('orra-theme', theme)
  }, [theme])

  const toast = (message, tone = 'ok') => {
    const id = uid('toast')
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 2800)
  }

  const dismissToast = (id) => setToasts((current) => current.filter((item) => item.id !== id))

  const refreshOrders = async (branch, day) => {
    const kitchens = new Map(kitchensRef.current.map((row) => [row.id, row.label]))
    const today = await api(`/orders?branch_id=${branch}&from=${day}&to=${day}&pageSize=40`)
    const previous = await api(`/orders?branch_id=${branch}&to=${day}&pageSize=20`)
    const rows = [...(today.data || []), ...(previous.data || []).filter((row) => row.business_date !== day)]
    const unique = [...new Map(rows.map((row) => [row.id, row])).values()]
    const details = await Promise.all(unique.map((row) => api(`/orders/${row.id}`).catch(() => null)))
    const viewed = details.filter(Boolean).map((row) => toView(row, kitchens))
    setOrders(viewed.filter((row) => row.businessDate === day && row.apiStatus !== 'cancelled'))
    setHistory(viewed.filter((row) => row.businessDate !== day))
  }

  const loadDesk = async (person) => {
    const branches = await api('/lookups/branches')
    const branch = branches.find((row) => person.branch_ids?.map(Number).includes(Number(row.id))) || branches[0]
    if (!branch) throw new Error('No branch is open')
    const [catalog, tableRows, waiterRows, zoneRows, riderRows, kitchenRows] = await Promise.all([
      api(`/pos/catalog?branch_id=${branch.id}`),
      api(`/lookups/tables?branch_id=${branch.id}`),
      api(`/lookups/waiters?branch_id=${branch.id}`),
      api(`/lookups/delivery_zones?branch_id=${branch.id}`),
      api(`/lookups/riders?branch_id=${branch.id}`).catch(() => []),
      api('/lookups/kitchens').catch(() => []),
    ])
    kitchensRef.current = kitchenRows
    const kitchens = new Map(kitchenRows.map((row) => [row.id, row.label]))
    const menu = (catalog.items || []).map((item, index) => toProduct(item, catalog, kitchens, index))
    const deals = (catalog.deals || []).map((deal) => ({
      id: `deal-${deal.id}`,
      dealId: deal.id,
      code: 'DEAL',
      name: deal.name,
      category: 'deals',
      categoryName: 'Deals',
      price: Number(deal.price) || 0,
      station: '',
      available: true,
      popular: false,
      featured: false,
      description: deal.description || 'Set menu',
      image: dishPhoto(deal.name, ''),
      variations: [],
      choiceGroups: [],
      addons: [],
    }))
    const cats = [{ id: 'all', name: 'All' }, ...(catalog.categories || []).map((row) => ({ id: String(row.id), name: row.name }))]
    if (deals.length) cats.push({ id: 'deals', name: 'Deals' })
    setBranchId(String(branch.id))
    setBranchLabel(branch.label)
    setBusinessDate(catalog.businessDate)
    setProducts([...menu, ...deals])
    setCategories(cats)
    setTables(tableRows.map((row) => ({ id: String(row.id), label: row.label })))
    setWaiters(waiterRows.map((row) => ({ id: String(row.id), label: row.label })))
    setZones(zoneRows.map((row) => ({ id: String(row.id), label: row.label })))
    setRiders((current) => riderRows.map((row) => ({
      id: row.id,
      name: row.label,
      vehicle: '',
      phone: '',
      status: current.find((item) => item.id === row.id)?.status || 'free',
    })))
    setCart((current) => ({
      ...emptyCart,
      orderType: current.orderType,
      tableId: current.tableId || (tableRows[0] ? String(tableRows[0].id) : ''),
      waiterId: current.waiterId || (waiterRows[0] ? String(waiterRows[0].id) : ''),
      zoneId: current.zoneId || (zoneRows[0] ? String(zoneRows[0].id) : ''),
    }))
    await refreshOrders(branch.id, catalog.businessDate)
  }

  useEffect(() => {
    let stop = false
    const boot = async () => {
      if (!getToken()) {
        if (!stop) setBooting(false)
        return
      }
      try {
        const me = await api('/auth/me')
        if (stop) return
        setUser(me.user)
        await loadDesk(me.user)
      } catch {
        setToken(null)
        if (!stop) setUser(null)
      } finally {
        if (!stop) setBooting(false)
      }
    }
    boot()
    return () => {
      stop = true
    }
  }, [])

  useEffect(() => {
    if (!user || !branchId || !businessDate) return undefined
    const id = window.setInterval(() => {
      refreshOrders(branchId, businessDate).catch(() => {})
    }, 8000)
    return () => window.clearInterval(id)
  }, [user, branchId, businessDate])

  useEffect(() => {
    if (!user || !branchId || !cart.lines.length) return undefined
    if (cart.orderType === 'dine-in' && !cart.tableId) return undefined
    if (cart.orderType === 'delivery' && !cart.zoneId) return undefined
    const timer = window.setTimeout(async () => {
      try {
        const quote = await api('/orders/quote', { method: 'POST', body: JSON.stringify(payloadFrom(cart, false)) })
        setCart((current) => ({ ...current, quote }))
      } catch {
        setCart((current) => ({ ...current, quote: null }))
      }
    }, 280)
    return () => window.clearTimeout(timer)
  }, [user, branchId, businessDate, cart.lines, cart.orderType, cart.tableId, cart.zoneId, cart.discount, cart.customer, cart.phone, cart.address])

  const payloadFrom = (current, hold) => ({
    branch_id: Number(branchId),
    type: current.orderType === 'dine-in' ? 'dinein' : current.orderType,
    table_id: current.orderType === 'dine-in' ? Number(current.tableId) : null,
    waiter_id: current.waiterId ? Number(current.waiterId) : null,
    zone_id: current.orderType === 'delivery' ? Number(current.zoneId) : null,
    discount_amount: Number(current.discount) || 0,
    notes: [current.customer, current.phone, current.address, current.externalRef].filter(Boolean).join(' · '),
    business_date: businessDate,
    hold,
    items: current.lines.map((line) => (
      line.dealId
        ? { deal_id: line.dealId, quantity: line.qty, notes: line.instructions || '' }
        : {
          menu_item_id: line.productId,
          variation_id: line.variationId || null,
          quantity: line.qty,
          choice_ids: Object.values(line.choiceMap || {}),
          notes: line.instructions || '',
        }
    )),
  })

  const signIn = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    setToken(data.token)
    try {
      await loadDesk(data.user)
      setUser(data.user)
    } catch (error) {
      setToken(null)
      throw error
    }
  }

  const signOut = () => {
    setToken(null)
    setUser(null)
    setOrders([])
    setHistory([])
    setProducts([])
    setCart(emptyCart)
  }

  const updateCart = (patch) => setCart((current) => ({ ...current, ...patch, quote: null }))

  const addLine = (line) => {
    setCart((current) => ({ ...current, quote: null, lines: [...current.lines, { ...line, id: uid('line') }] }))
    setRecentIds((current) => [line.productId, ...current.filter((id) => id !== line.productId)].slice(0, 6))
    toast(`${line.name} added`)
  }

  const updateLine = (lineId, line) => {
    setCart((current) => ({
      ...current,
      quote: null,
      lines: current.lines.map((item) => (item.id === lineId ? { ...line, id: lineId } : item)),
    }))
    toast(`${line.name} updated`)
  }

  const setQty = (lineId, qty) => {
    setCart((current) => ({
      ...current,
      quote: null,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, qty: Math.max(1, qty) } : line)),
    }))
  }

  const removeLine = (lineId) => {
    setCart((current) => ({ ...current, quote: null, lines: current.lines.filter((line) => line.id !== lineId) }))
  }

  const clearCart = () => setCart((current) => ({
    ...emptyCart,
    orderType: current.orderType,
    tableId: current.tableId,
    waiterId: current.waiterId,
    zoneId: current.zoneId,
  }))

  const placeOrder = async (payment) => {
    const created = await api('/orders', { method: 'POST', body: JSON.stringify(payloadFrom(cart, false)) })
    const total = Number(created.total) || 0
    const method = payment.method
    const payments = []
    if (method === 'card') payments.push({ method: 'card', amount: total })
    else if (method === 'mixed') {
      if (payment.cashAmount > 0) payments.push({ method: 'cash', amount: payment.cashAmount, tendered: payment.cashAmount })
      if (payment.cardAmount > 0) payments.push({ method: 'card', amount: payment.cardAmount })
    } else if (method === 'easypaisa' || method === 'jazzcash') payments.push({ method: 'online', amount: total, reference: payment.method })
    else if (method === 'credit') {
      const amount = Math.min(Number(payment.received) || 0, total)
      if (amount > 0) payments.push({ method: 'cash', amount, tendered: amount })
    } else payments.push({ method: 'cash', amount: total, tendered: Number(payment.received) || total })
    let saved = created
    if (payments.length) {
      saved = await api(`/orders/${created.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({ payments, complete: method !== 'credit' || (Number(payment.received) || 0) >= total }),
      })
    }
    clearCart()
    await refreshOrders(branchId, businessDate)
    toast(`${saved.number} sent to the kitchen`)
    return toView(saved, new Map())
  }

  const findOrder = (id) => orders.find((order) => order.id === id) || history.find((order) => order.id === id)

  const setPrepStatus = async (orderId, prepStatus) => {
    const order = findOrder(orderId)
    if (!order) return
    const status = prepStatus === 'dispatched' ? 'served' : prepStatus
    try {
      await api(`/orders/${order.apiId}/status`, { method: 'POST', body: JSON.stringify({ status }) })
      await refreshOrders(branchId, businessDate)
    } catch (error) {
      toast(error.message, 'bad')
    }
  }

  const setItemReady = async (orderId, itemId, ready) => {
    try {
      await api(`/order-items/${itemId}/status`, { method: 'POST', body: JSON.stringify({ status: ready ? 'ready' : 'preparing' }) })
      await refreshOrders(branchId, businessDate)
    } catch (error) {
      toast(error.message, 'bad')
    }
  }

  const markPaid = async (orderId) => {
    const order = findOrder(orderId)
    if (!order) return
    const due = Math.max(0, order.amount - order.received)
    if (due > 0) {
      await api(`/orders/${order.apiId}/payments`, {
        method: 'POST',
        body: JSON.stringify({ payments: [{ method: 'cash', amount: due, tendered: due }], complete: true }),
      })
    }
    await refreshOrders(branchId, businessDate)
    toast(`${orderId} marked paid`)
  }

  const addExpense = (expense) => {
    setExpenses((current) => [{ ...expense, id: uid('ex'), at: Date.now() }, ...current])
    toast('Expense recorded')
  }

  const setRiderStatus = (riderId, status) => {
    setRiders((current) => current.map((rider) => (rider.id === riderId ? { ...rider, status } : rider)))
  }

  const setStaffStatus = (staffId, status) => {
    setStaff((current) => current.map((person) => (person.id === staffId ? { ...person, status } : person)))
  }

  const productById = (id) => products.find((product) => String(product.id) === String(id))

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      user,
      booting,
      branchLabel,
      products,
      categories,
      tables,
      waiters,
      zones,
      productById,
      cart,
      updateCart,
      addLine,
      updateLine,
      setQty,
      removeLine,
      clearCart,
      placeOrder,
      orders,
      history,
      setPrepStatus,
      setItemReady,
      markPaid,
      expenses,
      addExpense,
      riders,
      setRiderStatus,
      staff,
      setStaffStatus,
      recentIds,
      toasts,
      dismissToast,
      toast,
      closing,
      setClosing,
      openingFloat: OPENING_FLOAT,
      onShift: Boolean(user),
      signIn,
      signOut,
    }),
    [theme, user, booting, branchLabel, products, categories, tables, waiters, zones, cart, orders, history, expenses, riders, staff, recentIds, toasts, closing],
  )

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>
}

export function usePos() {
  const context = useContext(PosContext)
  if (!context) throw new Error('usePos must be used inside PosProvider')
  return context
}
