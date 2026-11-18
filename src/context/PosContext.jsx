import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DELIVERY_FEE, TAX_RATE } from '../data/catalog'
import { OPENING_FLOAT, seedExpenses, seedStaff } from '../data/seed'
import {
  buildOrderItemsPayload,
  can,
  canEditOrder,
  canUserEditOrder,
  cancelOrder as cancelOrderApi,
  channelFromOrderCode,
  clearStoredDesk,
  createCustomer,
  createOrder,
  fetchBranches,
  fetchCatalog,
  fetchCustomers,
  fetchMe,
  fetchOrders,
  fetchPaymentTypes,
  fetchRiders,
  fetchTables,
  fetchWaiters,
  getStoredBranchId,
  getStoredCart,
  getStoredDesk,
  hasSession,
  login,
  logout,
  mapCatalog,
  mapOrder,
  mapPaymentTypes,
  mapRestaurantOrderTypes,
  mapRiders,
  mapTables,
  mapWaiters,
  normalizeOrderTypeCode,
  payOrder as payOrderApi,
  prepToApiStatus,
  refreshSession,
  setStoredBranchId,
  setStoredCart,
  setStoredDesk,
  updateOrder as updateOrderApi,
  updateOrderStatus,
} from '../api'
import { PAYMENT_METHODS as FALLBACK_PAYMENT_METHODS } from '../data/catalog'
import { orderLabel, uid } from '../utils/format'

const PosContext = createContext(null)

const emptyCart = {
  lines: [],
  orderType: 'DINE_IN',
  paymentTypeId: '',
  tableId: '',
  waiterId: '',
  zoneId: '',
  customerId: '',
  customer: '',
  phone: '',
  address: '',
  rider: '',
  riderId: '',
  externalRef: '',
  discount: 0,
  quote: null,
}

const fallbackPaymentTypes = FALLBACK_PAYMENT_METHODS.map((item) => ({
  ...item,
  kind: item.id,
  code: item.id,
}))

const fallbackOrderTypes = mapRestaurantOrderTypes([
  { id: 1, code: 'DINE_IN', name: 'Dine In' },
  { id: 2, code: 'TAKE_AWAY', name: 'Take Away' },
  { id: 3, code: 'DELIVERY', name: 'Delivery' },
  { id: 4, code: 'FOOD_PANDA', name: 'Foodpanda' },
  { id: 5, code: 'BITES', name: 'Bites' },
])

function readCart() {
  const stored = getStoredCart()
  if (!stored || typeof stored !== 'object') return emptyCart
  return {
    ...emptyCart,
    ...stored,
    orderType: normalizeOrderTypeCode(stored.orderType || emptyCart.orderType),
    lines: Array.isArray(stored.lines) ? stored.lines : [],
  }
}

async function resolveSessionUser(seed) {
  try {
    const me = await fetchMe()
    return me.user || me
  } catch {
    return seed
  }
}

export function summarize(cart, taxPercent = TAX_RATE * 100, taxInclusive = false) {
  const count = cart.lines.reduce((sum, line) => sum + line.qty, 0)
  const subtotal = cart.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  const discount = Math.min(subtotal, Math.max(0, Number(cart.discount) || 0))
  const delivery = channelFromOrderCode(cart.orderType) === 'delivery' ? DELIVERY_FEE : 0
  const afterDiscount = Math.max(0, subtotal - discount)
  const percent = Math.max(0, Number(taxPercent) || 0)
  const inclusive = Boolean(taxInclusive)
  const tax = inclusive
    ? Math.round((afterDiscount * percent) / (100 + percent) * 100) / 100
    : Math.round(afterDiscount * (percent / 100) * 100) / 100
  const total = inclusive
    ? afterDiscount + delivery
    : afterDiscount + tax + delivery
  return {
    subtotal,
    discount,
    delivery,
    taxable: afterDiscount,
    tax,
    taxPercent: percent,
    taxInclusive: inclusive,
    total: Math.round(total * 100) / 100,
    count,
  }
}

function mergeOrderReadyFlags(incoming, previous = []) {
  const prevMap = new Map(previous.map((order) => [order.id, order]))
  return incoming.map((order) => {
    const old = prevMap.get(order.id)
    if (!old?.items?.length) return order
    return {
      ...order,
      customer: order.customer || old.customer || '',
      phone: order.phone || old.phone || '',
      items: order.items.map((item) => {
        const match = old.items.find((row) => row.id === item.id)
        return match ? { ...item, ready: Boolean(match.ready) } : item
      }),
    }
  })
}

export function PosProvider({ children }) {
  const [theme, setTheme] = useState(() => sessionStorage.getItem('orra-theme') || 'light')
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [deskError, setDeskError] = useState('')
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState(getStoredBranchId())
  const [branchLabel, setBranchLabel] = useState('')
  const [taxInclusive, setTaxInclusive] = useState(false)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([{ id: 'all', name: 'All' }])
  const [tables, setTables] = useState([])
  const [waiters, setWaiters] = useState([])
  const [zones, setZones] = useState([])
  const [paymentTypes, setPaymentTypes] = useState(fallbackPaymentTypes)
  const [cart, setCart] = useState(readCart)
  const [orders, setOrders] = useState([])
  const [history, setHistory] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [expenses, setExpenses] = useState(seedExpenses)
  const [riders, setRiders] = useState([])
  const [staff, setStaff] = useState(seedStaff)
  const [recentIds, setRecentIds] = useState([])
  const [toasts, setToasts] = useState([])
  const [closing, setClosing] = useState(null)
  const [collectingId, setCollectingId] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [menuLoading, setMenuLoading] = useState(false)
  const [lookupsLoading, setLookupsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [rawCatalog, setRawCatalog] = useState([])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    sessionStorage.setItem('orra-theme', theme)
  }, [theme])

  useEffect(() => {
    setStoredCart(cart)
  }, [cart])

  const toast = (message, tone = 'ok') => {
    const id = uid('toast')
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 2800)
  }

  const dismissToast = (id) => setToasts((current) => current.filter((item) => item.id !== id))

  const applyUser = (person) => {
    const next = {
      ...person,
      role_name: person.role || person.role_name || 'Staff',
      permissions: person.permissions || [],
      restaurantId: person.restaurantId || person.restaurant?.id || null,
      restaurant: person.restaurant || null,
    }
    setUser(next)

    const enabled = mapRestaurantOrderTypes(next.restaurant?.orderTypes)
    if (enabled.length) {
      setCart((current) => {
        const stillValid = enabled.some((type) => type.code === normalizeOrderTypeCode(current.orderType))
        if (stillValid) {
          return { ...current, orderType: normalizeOrderTypeCode(current.orderType) }
        }
        return { ...current, orderType: enabled[0].code, tableId: '', waiterId: '', zoneId: '', rider: '', riderId: '', externalRef: '' }
      })
    }
    return next
  }

  const orderTypes = useMemo(() => {
    const fromRestaurant = mapRestaurantOrderTypes(user?.restaurant?.orderTypes)
    return fromRestaurant.length ? fromRestaurant : fallbackOrderTypes
  }, [user])

  const applyCatalogRows = (rows, orderType = cart.orderType) => {
    const list = Array.isArray(rows) ? rows : []
    setRawCatalog(list)
    const mapped = mapCatalog(list, normalizeOrderTypeCode(orderType))
    setCategories(mapped.categories)
    setProducts(mapped.products)
  }

  const applyLookups = ({ tables: nextTables = [], waiters: nextWaiters = [], riders: nextRiders = [], paymentTypes: nextPaymentTypes = [] }) => {
    const payments = nextPaymentTypes.length ? nextPaymentTypes : fallbackPaymentTypes
    setTables(nextTables)
    setWaiters(nextWaiters)
    setRiders(nextRiders)
    setPaymentTypes(payments)
    setCart((current) => {
      const matchedPayment = payments.find((type) => type.id === current.paymentTypeId || type.kind === current.paymentTypeId)
      return {
        ...current,
        paymentTypeId: matchedPayment?.id || current.paymentTypeId || '',
        tableId: nextTables.some((row) => row.id === current.tableId) ? current.tableId : '',
        waiterId: nextWaiters.some((row) => row.id === current.waiterId) ? current.waiterId : '',
        riderId: nextRiders.some((row) => row.id === current.riderId) ? current.riderId : '',
        rider: nextRiders.find((row) => row.id === current.riderId)?.name || current.rider || '',
      }
    })
  }

  const applyDeskCache = (cache, orderType = cart.orderType) => {
    if (!cache) return false
    applyCatalogRows(cache.catalog || [], orderType)
    applyLookups({
      tables: cache.tables || [],
      waiters: cache.waiters || [],
      riders: cache.riders || [],
      paymentTypes: cache.paymentTypes || [],
    })
    return true
  }

  const fetchDeskBundle = async (selectedBranchId, person = user) => {
    const restaurantId = person?.restaurantId || person?.restaurant?.id
    const canMenu = can(person, 'menu:read') || person?.role === 'SUPER_ADMIN'
    const [catalogPayload, tableRows, waiterRows, riderRows, paymentTypeRows] = await Promise.all([
      canMenu
        ? fetchCatalog(selectedBranchId, restaurantId).catch((error) => {
          if (error.status === 403) toast('No menu access for this account', 'bad')
          throw error
        })
        : Promise.resolve([]),
      fetchTables(selectedBranchId, restaurantId).catch(() => []),
      fetchWaiters(selectedBranchId, restaurantId).catch(() => []),
      fetchRiders(selectedBranchId, restaurantId).catch(() => []),
      fetchPaymentTypes(selectedBranchId, restaurantId).catch(() => []),
    ])

    const catalog = Array.isArray(catalogPayload)
      ? catalogPayload
      : catalogPayload?.categories || catalogPayload?.data || []
    const nextTables = mapTables(tableRows)
    const nextWaiters = mapWaiters(waiterRows)
    const nextRiders = mapRiders(riderRows)
    const nextPaymentTypes = mapPaymentTypes(paymentTypeRows)

    return {
      catalog,
      tables: nextTables,
      waiters: nextWaiters,
      riders: nextRiders,
      paymentTypes: nextPaymentTypes,
    }
  }

  const loadBranchData = async (selectedBranchId, person = user, { force = false, orderType = cart.orderType } = {}) => {
    if (!selectedBranchId || !person) {
      setRawCatalog([])
      setProducts([])
      setCategories([{ id: 'all', name: 'All' }])
      applyLookups({ tables: [], waiters: [], riders: [], paymentTypes: [] })
      return
    }

    if (!force) {
      const cached = getStoredDesk(selectedBranchId)
      if (cached?.savedAt) {
        applyDeskCache(cached, orderType)
        setDeskError('')
        return
      }
    }

    setMenuLoading(true)
    setLookupsLoading(true)
    try {
      const bundle = await fetchDeskBundle(selectedBranchId, person)
      applyCatalogRows(bundle.catalog, orderType)
      applyLookups(bundle)
      setStoredDesk(selectedBranchId, bundle)
      setDeskError('')
    } catch (error) {
      const cached = getStoredDesk(selectedBranchId)
      if (cached?.catalog) {
        applyDeskCache(cached, orderType)
        setDeskError(error.message || 'Using cached menu')
        return
      }
      setRawCatalog([])
      setProducts([])
      setCategories([{ id: 'all', name: 'All' }])
      setDeskError(error.message || 'Could not load desk data')
      throw error
    } finally {
      setMenuLoading(false)
      setLookupsLoading(false)
    }
  }

  const applyBranchMeta = (branch) => {
    if (!branch) {
      setTaxInclusive(false)
      return
    }
    setTaxInclusive(Boolean(branch.taxInclusive))
  }

  const upsertOrder = (mapped) => {
    if (!mapped) return null
    setOrders((current) => {
      const without = current.filter((row) => row.id !== mapped.id)
      if (mapped.apiStatus === 'CANCELLED') return without
      return [mapped, ...without].sort((a, b) => b.createdAt - a.createdAt)
    })
    setHistory((current) => {
      const without = current.filter((row) => row.id !== mapped.id)
      return [mapped, ...without].sort((a, b) => b.createdAt - a.createdAt)
    })
    return mapped
  }

  const loadOrders = async (selectedBranchId = branchId, person = user) => {
    if (!selectedBranchId || !person) {
      setOrders([])
      setHistory([])
      return
    }
    if (!can(person, 'order:read') && person.role !== 'SUPER_ADMIN') {
      setOrders([])
      setHistory([])
      return
    }
    setOrdersLoading(true)
    try {
      const payload = await fetchOrders({
        branchId: selectedBranchId,
        restaurantId: person.restaurantId || person.restaurant?.id || undefined,
        limit: 100,
      })
      const rows = Array.isArray(payload)
        ? payload
        : payload?.items || payload?.data || payload?.results || []
      const mapped = rows.map((row) => mapOrder(row)).filter(Boolean)
      setOrders((current) => mergeOrderReadyFlags(
        mapped.filter((row) => row.apiStatus !== 'CANCELLED'),
        current,
      ))
      // History uses the same list API response — full set for browse/filter only.
      setHistory((current) => mergeOrderReadyFlags(mapped, current))
    } catch (error) {
      if (error.status !== 403) toast(error.message || 'Could not load orders', 'bad')
    } finally {
      setOrdersLoading(false)
    }
  }

  const refreshDesk = async () => {
    if (!branchId || !user) return
    setRefreshing(true)
    try {
      clearStoredDesk(branchId)
      await loadBranchData(branchId, user, { force: true, orderType: cart.orderType })
      await loadOrders(branchId, user)
      toast('Menu, lookups, and orders refreshed')
    } catch (error) {
      toast(error.message || 'Could not refresh', 'bad')
    } finally {
      setRefreshing(false)
    }
  }

  const searchCustomers = async (search = '') => {
    if (!user?.restaurantId) return []
    const payload = await fetchCustomers({ restaurantId: user.restaurantId, search })
    const rows = Array.isArray(payload) ? payload : payload?.items || payload?.data || payload?.results || []
    return rows.map((row) => ({
      id: String(row.id),
      name: row.name || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
    }))
  }

  const addCustomer = async (body) => {
    if (!user?.restaurantId) throw new Error('Restaurant is required')
    const created = await createCustomer({
      restaurantId: user.restaurantId,
      name: body.name,
      phone: body.phone || undefined,
      email: body.email || undefined,
      address: body.address || undefined,
      notes: body.notes || undefined,
      isActive: true,
    })
    return {
      id: String(created.id),
      name: created.name || body.name,
      phone: created.phone || body.phone || '',
      email: created.email || body.email || '',
      address: created.address || body.address || '',
    }
  }

  const loadDesk = async (seed) => {
    const person = seed?.restaurant?.orderTypes ? seed : await resolveSessionUser(seed)
    const nextUser = applyUser(person)
    setDeskError('')

    if (!can(nextUser, 'branch:read') && nextUser.role !== 'SUPER_ADMIN') {
      setBranches([])
      setDeskError('This account cannot read branches')
      return
    }

    const restaurantId = nextUser.restaurantId || nextUser.restaurant?.id
    const branchPayload = await fetchBranches(restaurantId ? { restaurantId } : {})
    const list = Array.isArray(branchPayload)
      ? branchPayload
      : branchPayload?.items || branchPayload?.data || branchPayload?.results || []
    setBranches(list)

    const preferred = getStoredBranchId()
    const selected = list.find((row) => String(row.id) === String(preferred)) || list[0]
    if (!selected) {
      setBranchId('')
      setBranchLabel('')
      setProducts([])
      setDeskError('No active branch found')
      return
    }

    setBranchId(String(selected.id))
    setBranchLabel(selected.name || selected.label || 'Branch')
    setStoredBranchId(selected.id)
    applyBranchMeta(selected)

    const enabled = mapRestaurantOrderTypes(nextUser.restaurant?.orderTypes)
    const activeCode = enabled.some((type) => type.code === normalizeOrderTypeCode(cart.orderType))
      ? normalizeOrderTypeCode(cart.orderType)
      : (enabled[0]?.code || 'DINE_IN')

    if (!can(nextUser, 'menu:read') && nextUser.role !== 'SUPER_ADMIN') {
      setRawCatalog([])
      setProducts([])
      setCategories([{ id: 'all', name: 'All' }])
      setDeskError('This account cannot read the menu')
      await loadBranchData(selected.id, nextUser, { force: false, orderType: activeCode }).catch(() => {})
      await loadOrders(selected.id, nextUser).catch(() => {})
      return
    }

    await loadBranchData(selected.id, nextUser, { force: false, orderType: activeCode })
    await loadOrders(selected.id, nextUser)
  }

  useEffect(() => {
    let stop = false
    const boot = async () => {
      if (!hasSession()) {
        if (!stop) setBooting(false)
        return
      }
      try {
        let person
        try {
          const me = await fetchMe()
          person = me.user || me
        } catch {
          person = await refreshSession()
          person = await resolveSessionUser(person)
        }
        if (stop) return
        await loadDesk(person)
      } catch {
        await logout()
        if (!stop) {
          setUser(null)
          setProducts([])
        }
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
    if (!rawCatalog.length) return
    const mapped = mapCatalog(rawCatalog, normalizeOrderTypeCode(cart.orderType))
    setCategories(mapped.categories)
    setProducts(mapped.products)
  }, [cart.orderType, rawCatalog])

  useEffect(() => {
    if (!user || !branchId) return undefined
    if (!can(user, 'order:read') && user.role !== 'SUPER_ADMIN') return undefined
    const tick = () => {
      loadOrders(branchId, user).catch(() => {})
    }
    const id = window.setInterval(tick, 12000)
    return () => window.clearInterval(id)
  }, [user?.id, branchId])

  const signIn = async (email, password) => {
    const person = await login(email, password)
    clearStoredDesk()
    await loadDesk(person)
  }

  const signOut = async () => {
    await logout()
    clearStoredDesk()
    setUser(null)
    setBranches([])
    setBranchId('')
    setBranchLabel('')
    setTaxInclusive(false)
    setRawCatalog([])
    setProducts([])
    setCategories([{ id: 'all', name: 'All' }])
    setTables([])
    setWaiters([])
    setRiders([])
    setPaymentTypes(fallbackPaymentTypes)
    setOrders([])
    setHistory([])
    setEditingOrder(null)
    setCart(emptyCart)
    setStoredCart(emptyCart)
    setDeskError('')
  }

  const selectBranch = async (id) => {
    const branch = branches.find((row) => String(row.id) === String(id))
    if (!branch) return
    setBranchId(String(branch.id))
    setBranchLabel(branch.name || branch.label || 'Branch')
    setStoredBranchId(branch.id)
    applyBranchMeta(branch)
    await loadBranchData(branch.id, user, { force: false, orderType: cart.orderType })
    await loadOrders(branch.id, user)
  }

  const updateCart = (patch) => setCart((current) => ({ ...current, ...patch, quote: null }))

  const setOrderType = (typeOrCode) => {
    const match = typeof typeOrCode === 'object'
      ? typeOrCode
      : orderTypes.find((type) => type.code === normalizeOrderTypeCode(typeOrCode) || type.id === String(typeOrCode))
    const code = normalizeOrderTypeCode(match?.code || typeOrCode)
    const channel = channelFromOrderCode(code)
    updateCart({
      orderType: code,
      ...(channel !== 'dine-in' ? { tableId: '', waiterId: '' } : {}),
      ...(channel !== 'delivery' ? { zoneId: '', rider: '', riderId: '' } : {}),
      ...(!['foodpanda', 'bite'].includes(channel) ? { externalRef: '' } : {}),
    })
  }

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

  const clearCart = () => {
    setEditingOrder(null)
    setCart((current) => ({
      ...emptyCart,
      orderType: current.orderType,
      paymentTypeId: current.paymentTypeId,
      tableId: current.tableId,
      waiterId: current.waiterId,
      zoneId: current.zoneId,
    }))
  }

  const cancelEditOrder = () => {
    setEditingOrder(null)
    setCart((current) => ({
      ...emptyCart,
      orderType: current.orderType,
      paymentTypeId: current.paymentTypeId,
    }))
  }

  const startEditOrder = (order) => {
    if (!order) return false
    if (!canEditOrder(order)) {
      toast('This order can no longer be edited', 'warn')
      return false
    }
    if (!canUserEditOrder(user, order)) {
      toast('No permission to edit orders', 'bad')
      return false
    }
    const lines = (order.items || []).map((item) => ({
      id: uid('line'),
      productId: item.productId,
      name: item.name,
      code: '',
      image: '',
      station: item.station || '',
      variationId: item.variationId || null,
      variation: item.variation || null,
      choiceMap: item.choiceMap || {},
      choices: item.choices || [],
      addonIds: [],
      addons: [],
      instructions: item.instructions || '',
      qty: item.qty || 1,
      unitPrice: item.unitPrice || 0,
    }))
    setEditingOrder({
      id: order.id,
      orderNumber: order.orderNumber || orderLabel(order),
      paymentStatus: order.paymentStatus,
      apiStatus: order.apiStatus,
      prepStatus: order.prepStatus,
    })
    setCart({
      ...emptyCart,
      lines,
      orderType: normalizeOrderTypeCode(order.type),
      paymentTypeId: order.paymentTypeId || '',
      tableId: order.tableId || '',
      waiterId: order.waiterId || '',
      customerId: order.customerId ? String(order.customerId) : '',
      customer: order.customer || '',
      phone: order.phone || '',
      address: order.address || '',
      rider: order.rider || '',
      riderId: order.riderId || '',
      externalRef: order.externalRef || '',
      discount: Number(order.discountAmount) || 0,
      quote: null,
    })
    toast(`Editing ${orderLabel(order)}`)
    return true
  }

  const buildCartOrderBody = (payment = {}) => {
    const orderType = normalizeOrderTypeCode(cart.orderType)
    const channel = channelFromOrderCode(orderType)
    const deliveryLike = ['delivery', 'foodpanda', 'bite'].includes(channel)
    if (channel === 'dine-in' && !cart.tableId) throw new Error('Choose a table')
    if (deliveryLike && !String(cart.address || '').trim()) throw new Error('Add a delivery address')
    if (!cart.lines.length) throw new Error('Add at least one item')

    const paymentTypeId = payment.paymentTypeId || cart.paymentTypeId || undefined
    const taxPercent = payment.taxPercent != null
      ? Number(payment.taxPercent)
      : paymentTypes.find((type) => type.id === paymentTypeId)?.tax

    return {
      orderType,
      tableId: channel === 'dine-in' ? cart.tableId || null : null,
      waiterId: cart.waiterId || null,
      customerId: cart.customerId || null,
      riderId: deliveryLike ? cart.riderId || null : null,
      paymentTypeId: paymentTypeId || null,
      notes: [cart.externalRef && `Ref: ${cart.externalRef}`, payment.notes].filter(Boolean).join('\n') || undefined,
      discountAmount: Number(cart.discount) || 0,
      taxPercent,
      serviceCharge: 0,
      deliveryCharge: channel === 'delivery' ? DELIVERY_FEE : 0,
      deliveryAddress: deliveryLike
        ? {
          line1: String(cart.address).trim(),
          phone: cart.phone || undefined,
          notes: cart.externalRef || undefined,
        }
        : null,
      items: buildOrderItemsPayload(cart.lines),
    }
  }

  const saveEditedOrder = async (payment = {}) => {
    if (!editingOrder?.id) throw new Error('No order is being edited')
    if (!user) throw new Error('Sign in first')
    if (!can(user, 'order:update') && !can(user, 'order:create') && user.role !== 'SUPER_ADMIN') {
      throw new Error('This account cannot edit orders')
    }
    const body = buildCartOrderBody(payment)
    let updated = await updateOrderApi(editingOrder.id, body)
    let mapped = mapOrder(updated, { customer: cart.customer, phone: cart.phone })

    const payNow = payment.method && payment.method !== 'later'
    if (payNow && mapped.paymentStatus !== 'paid') {
      if (!can(user, 'order:pay') && user.role !== 'SUPER_ADMIN') {
        upsertOrder(mapped)
        setEditingOrder(null)
        setCart((current) => ({ ...emptyCart, orderType: current.orderType, paymentTypeId: current.paymentTypeId }))
        toast('Order updated — no pay permission', 'warn')
        return mapped
      }
      const paymentTypeId = payment.paymentTypeId || cart.paymentTypeId
      if (!paymentTypeId) throw new Error('Choose a payment type')
      const amountPaid = Math.max(0, Number(payment.received != null ? payment.received : mapped.amount) || 0)
      if (amountPaid <= 0) throw new Error('Enter an amount paid')
      updated = await payOrderApi(mapped.id, {
        paymentTypeId,
        amountPaid,
        amountReturn: Math.max(0, Number(payment.change != null ? payment.change : amountPaid - mapped.amount) || 0),
        notes: payment.txn || payment.wallet || undefined,
      })
      mapped = mapOrder(updated, { customer: cart.customer, phone: cart.phone })
    }

    upsertOrder(mapped)
    setEditingOrder(null)
    setCart((current) => ({
      ...emptyCart,
      orderType: current.orderType,
      paymentTypeId: current.paymentTypeId,
    }))
    toast(payNow
      ? `Order ${mapped.orderNumber || orderLabel(mapped)} updated & paid`
      : `Order ${mapped.orderNumber || orderLabel(mapped)} updated`)
    return mapped
  }

  const placeOrder = async (payment = {}) => {
    if (editingOrder?.id) {
      return saveEditedOrder(payment)
    }
    if (!user) throw new Error('Sign in first')
    if (!branchId) throw new Error('Select a branch')
    if (!can(user, 'order:create') && user.role !== 'SUPER_ADMIN') {
      throw new Error('This account cannot create orders')
    }
    const paymentTypeId = payment.paymentTypeId || cart.paymentTypeId || undefined
    const body = {
      branchId,
      restaurantId: user.restaurantId || user.restaurant?.id || undefined,
      ...buildCartOrderBody(payment),
    }

    let created = await createOrder(body)
    let mapped = mapOrder(created, { customer: cart.customer, phone: cart.phone })

    const payNow = payment.method && payment.method !== 'later'
    if (payNow) {
      if (!can(user, 'order:pay') && user.role !== 'SUPER_ADMIN') {
        upsertOrder(mapped)
        clearCart()
        toast('Order placed unpaid — no pay permission', 'warn')
        return mapped
      }
      if (!paymentTypeId) throw new Error('Choose a payment type')
      const amountPaid = Math.max(0, Number(payment.received != null ? payment.received : mapped.amount) || 0)
      if (amountPaid <= 0) throw new Error('Enter an amount paid')
      const paid = await payOrderApi(mapped.id, {
        paymentTypeId,
        amountPaid,
        amountReturn: Math.max(0, Number(payment.change != null ? payment.change : amountPaid - mapped.amount) || 0),
        notes: payment.txn || payment.wallet || undefined,
      })
      mapped = mapOrder(paid, { customer: cart.customer, phone: cart.phone })
    }

    upsertOrder(mapped)
    if (mapped.tableId) {
      setTables((current) => current.map((table) => (
        table.id === mapped.tableId ? { ...table, status: 'OCCUPIED' } : table
      )))
    }
    clearCart()
    toast(payNow ? `Order ${mapped.orderNumber} paid` : `Order ${mapped.orderNumber} sent`)
    return mapped
  }

  const setPrepStatus = async (orderId, prepOrStatus) => {
    if (!orderId) return
    if (!can(user, 'order:update_status') && user.role !== 'SUPER_ADMIN') {
      toast('No kitchen status permission', 'bad')
      return
    }
    const apiStatus = String(prepOrStatus || '').includes('_') || String(prepOrStatus || '').toUpperCase() === prepOrStatus
      ? String(prepOrStatus).toUpperCase()
      : prepToApiStatus(prepOrStatus)
    if (apiStatus === 'CANCELLED') {
      toast('Use cancel to void an order', 'warn')
      return
    }
    try {
      const updated = await updateOrderStatus(orderId, apiStatus)
      const mapped = mapOrder(updated)
      upsertOrder(mapped)
      if (mapped.tableId && (apiStatus === 'READY' || apiStatus === 'DISPATCHED')) {
        setTables((current) => current.map((table) => (
          table.id === mapped.tableId ? { ...table, status: 'AVAILABLE' } : table
        )))
      }
    } catch (error) {
      toast(error.message || 'Could not update status', 'bad')
    }
  }

  const setItemReady = (orderId, itemId, ready) => {
    setOrders((current) => current.map((order) => {
      if (order.id !== orderId) return order
      return {
        ...order,
        items: order.items.map((item) => (item.id === itemId ? { ...item, ready: Boolean(ready) } : item)),
      }
    }))
  }

  const startCollect = (orderId) => setCollectingId(orderId)
  const cancelCollect = () => setCollectingId(null)

  const settleOrder = async (orderId, payment = {}) => {
    if (!orderId) return null
    if (!can(user, 'order:pay') && user.role !== 'SUPER_ADMIN') {
      toast('No payment permission', 'bad')
      return null
    }
    const paymentTypeId = payment.paymentTypeId
    if (!paymentTypeId) {
      toast('Choose a payment type', 'bad')
      return null
    }
    const amountPaid = Math.max(0, Number(payment.received != null ? payment.received : payment.amountPaid) || 0)
    if (amountPaid <= 0) {
      toast('Enter an amount paid', 'bad')
      return null
    }
    try {
      const existing = orders.find((row) => row.id === orderId) || history.find((row) => row.id === orderId)
      const paid = await payOrderApi(orderId, {
        paymentTypeId,
        amountPaid,
        amountReturn: Math.max(0, Number(payment.change != null ? payment.change : amountPaid - (existing?.amount || 0)) || 0),
        notes: payment.notes || payment.txn || undefined,
      })
      const mapped = mapOrder(paid, { customer: existing?.customer, phone: existing?.phone })
      upsertOrder(mapped)
      setCollectingId(null)
      toast(`Payment recorded for ${mapped.orderNumber}`)
      return mapped
    } catch (error) {
      toast(error.message || 'Payment failed', 'bad')
      throw error
    }
  }

  const cancelOrder = async (orderId, reason = '') => {
    if (!orderId) return null
    if (!can(user, 'order:cancel') && user.role !== 'SUPER_ADMIN') {
      toast('No cancel permission', 'bad')
      return null
    }
    try {
      const updated = await cancelOrderApi(orderId, { reason })
      const mapped = mapOrder(updated)
      upsertOrder(mapped)
      if (mapped.tableId) {
        setTables((current) => current.map((table) => (
          table.id === mapped.tableId ? { ...table, status: 'AVAILABLE' } : table
        )))
      }
      toast(`Order ${mapped.orderNumber} cancelled`)
      return mapped
    } catch (error) {
      toast(error.message || 'Could not cancel', 'bad')
      throw error
    }
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
  const allowed = (permission) => can(user, permission)

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      user,
      booting,
      deskError,
      menuLoading,
      lookupsLoading,
      refreshing,
      refreshDesk,
      branches,
      branchId,
      branchLabel,
      taxInclusive,
      selectBranch,
      products,
      categories,
      tables,
      waiters,
      zones,
      paymentTypes,
      orderTypes,
      productById,
      cart,
      updateCart,
      setOrderType,
      orderChannel: channelFromOrderCode(cart.orderType),
      addLine,
      updateLine,
      setQty,
      removeLine,
      clearCart,
      placeOrder,
      editingOrder,
      startEditOrder,
      cancelEditOrder,
      saveEditedOrder,
      canEditOrder: (order) => canUserEditOrder(user, order),
      searchCustomers,
      addCustomer,
      orders,
      history,
      ordersLoading,
      loadOrders,
      setPrepStatus,
      setItemReady,
      collectingId,
      startCollect,
      cancelCollect,
      settleOrder,
      cancelOrder,
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
      can: allowed,
    }),
    [theme, user, booting, deskError, menuLoading, lookupsLoading, refreshing, branches, branchId, branchLabel, taxInclusive, products, categories, tables, waiters, zones, paymentTypes, orderTypes, cart, orders, history, ordersLoading, expenses, riders, staff, recentIds, toasts, closing, collectingId, editingOrder],
  )

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>
}

export function usePos() {
  const context = useContext(PosContext)
  if (!context) throw new Error('usePos must be used inside PosProvider')
  return context
}
