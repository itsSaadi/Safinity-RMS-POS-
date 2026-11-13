import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DELIVERY_FEE, TAX_RATE, categories as menuCategories, products as menuProducts, restaurant, tables as menuTables, waiters as menuWaiters } from '../data/catalog'
import { buildHistory, buildTodayOrders, OPENING_FLOAT, seedExpenses, seedRecent, seedRiders, seedStaff } from '../data/seed'
import { getToken, setToken } from '../api'
import { uid } from '../utils/format'

const MOCK_EMAIL = 'cashier@safinity.com'
const MOCK_PASSWORD = '1234'
const mockZones = [
  { id: 'clifton', label: 'Clifton' },
  { id: 'dha', label: 'DHA' },
  { id: 'seaview', label: 'Sea View' },
]

function mockCashier() {
  return { id: 'cashier', name: 'Cashier', email: MOCK_EMAIL, role_name: 'Cashier' }
}

const PosContext = createContext(null)

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

export function PosProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('orra-theme') || 'light')
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [branchLabel, setBranchLabel] = useState('')
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
  const ticketNo = useRef(2395)

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

  const loadMockDesk = () => {
    // api('/lookups/branches'), api('/pos/catalog'), api('/orders') — using local seed instead
    setBranchLabel(restaurant.branch)
    setProducts(menuProducts)
    setCategories(menuCategories)
    setTables(menuTables)
    setWaiters(menuWaiters)
    setZones(mockZones)
    setRiders(seedRiders)
    setOrders(buildTodayOrders())
    setHistory(buildHistory())
    setRecentIds(seedRecent)
    setCart((current) => ({
      ...emptyCart,
      orderType: current.orderType,
      tableId: current.tableId || menuTables[0] || '',
      waiterId: current.waiterId || menuWaiters[0] || '',
      zoneId: current.zoneId || mockZones[0].id,
    }))
  }

  useEffect(() => {
    if (getToken() === 'mock-cashier') {
      loadMockDesk()
      setUser(mockCashier())
    } else {
      setToken(null)
    }
    setBooting(false)
  }, [])

  const signIn = async (email, password) => {
    // const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (email.toLowerCase() !== MOCK_EMAIL || password !== MOCK_PASSWORD) {
      throw new Error('Sign in with cashier@safinity.com and 1234')
    }
    setToken('mock-cashier')
    loadMockDesk()
    setUser(mockCashier())
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
    const totals = summarize(cart)
    const method = payment.method
    const received = method === 'credit' ? Math.min(Number(payment.received) || 0, totals.total) : totals.total
    const paymentStatus = received <= 0 ? 'unpaid' : received + 0.01 < totals.total ? (method === 'credit' ? 'credit' : 'partial') : 'paid'
    const number = ticketNo.current
    ticketNo.current += 1
    const order = {
      id: `OR-${number}`,
      createdAt: Date.now(),
      customer: cart.customer || 'Walk-in',
      phone: cart.phone || '',
      type: cart.orderType,
      source: 'Orra Counter',
      table: cart.orderType === 'dine-in' ? cart.tableId : '',
      waiter: cart.waiterId || '',
      rider: cart.rider || '',
      address: cart.address || '',
      externalRef: cart.externalRef || '',
      paymentStatus,
      paymentMethod: method,
      cashAmount: method === 'cash' || method === 'mixed' ? Number(payment.cashAmount || payment.received || totals.total) : 0,
      received,
      balance: Math.max(0, totals.total - received),
      prepStatus: 'new',
      amount: totals.total,
      discount: totals.discount,
      tax: totals.tax,
      delivery: totals.delivery,
      items: cart.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        name: line.name,
        qty: line.qty,
        station: line.station || '',
        unitPrice: line.unitPrice,
        variation: line.variation || null,
        choices: line.choices || [],
        addons: line.addons || [],
        instructions: line.instructions || '',
        ready: false,
      })),
    }
    setOrders((current) => [order, ...current])
    clearCart()
    toast(`${order.id} sent to the kitchen`)
    return order
  }

  const patchOrder = (orderId, patch) => {
    const apply = (order) => (order.id === orderId ? { ...order, ...patch(order) } : order)
    setOrders((current) => current.map(apply))
    setHistory((current) => current.map(apply))
  }

  const setPrepStatus = async (orderId, prepStatus) => {
    patchOrder(orderId, (order) => ({
      prepStatus,
      items: prepStatus === 'ready' || prepStatus === 'dispatched'
        ? order.items.map((item) => ({ ...item, ready: true }))
        : order.items,
    }))
  }

  const setItemReady = async (orderId, itemId, ready) => {
    patchOrder(orderId, (order) => ({
      items: order.items.map((item) => (item.id === itemId ? { ...item, ready } : item)),
    }))
  }

  const markPaid = async (orderId) => {
    patchOrder(orderId, (order) => ({
      paymentStatus: 'paid',
      paymentMethod: order.paymentMethod || 'cash',
      received: order.amount,
      balance: 0,
    }))
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
