import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { channelFromOrderCode } from '../api'
import { usePos } from '../context/PosContext'
import { preparePrintWindow, printInvoice } from '../utils/printInvoice'
import CategoryChips from './CategoryChips'
import LightDialogs from './dialogs'
import { buildLine, needsChoices } from './line'
import OrderPanel from './OrderPanel'
import ProductGrid from './ProductGrid'
import SearchBar from './SearchBar'
import './theme.css'
import TopBar from './TopBar'

export default function LightCounter() {
  const navigate = useNavigate()
  const { products, productById, addLine, updateLine, toast, cart, saveEditedOrder, cancelEditOrder, menuLoading, placeOrder, user, branchLabel } = usePos()
  const payingLater = useRef(false)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null)
  const [editor, setEditor] = useState(null)
  const [payMethod, setPayMethod] = useState('cash')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((product) => {
      const inCategory = category === 'all' || product.category === category
      const matches = !q || product.name.toLowerCase().includes(q) || product.code.toLowerCase().includes(q)
      return inCategory && matches
    })
  }, [category, products, query])

  const openDialog = (name) => setDialog(name)
  const close = () => {
    setDialog(null)
    setEditor(null)
  }

  const addProduct = (product) => {
    if (!product?.available) {
      toast(`${product?.name || 'That dish'} is sold out`, 'warn')
      return
    }
    if (needsChoices(product)) {
      setEditor({ product, line: null })
      setDialog('item')
      return
    }
    addLine(buildLine(product))
  }

  const submitSearch = () => {
    const q = query.trim().toLowerCase()
    if (!q) return
    const exact = visible.filter((product) => product.code.toLowerCase() === q || product.name.toLowerCase() === q)
    const pick = exact[0] || (visible.length === 1 ? visible[0] : null)
    if (!pick) return
    addProduct(pick)
    setQuery('')
  }

  const editLine = (line) => {
    const product = productById(line.productId)
    if (!product) return
    setEditor({ product, line })
    setDialog('item')
  }

  return (
    <div className="pos-light flex h-dvh min-h-0 flex-col">
      <TopBar
        onBack={() => navigate('/more')}
        onNew={() => (cart.lines.length ? openDialog('clear') : toast('The ticket is already empty'))}
        onOrders={() => navigate('/orders')}
        onKitchen={() => navigate('/kitchen')}
        onMore={() => navigate('/more')}
        onShift={() => openDialog('shift')}
        onBell={() => openDialog('bell')}
        onMenu={() => openDialog('nav')}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <SearchBar query={query} onQuery={setQuery} onSubmit={submitSearch} />
          <div className="mt-3">
            <CategoryChips active={category} onChange={setCategory} />
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {menuLoading ? (
              <div className="grid h-full min-h-[240px] place-items-center rounded-[var(--pos-radius)] border border-dashed border-[var(--pos-border)] bg-white/70">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--pos-accent)] border-t-transparent" />
                  <p className="mt-3 text-sm font-semibold text-[var(--pos-muted)]">Loading menu…</p>
                </div>
              </div>
            ) : (
              <ProductGrid products={visible} onAdd={addProduct} />
            )}
          </div>
        </section>
        <OrderPanel
          payMethod={payMethod}
          onEdit={editLine}
          onCustomer={() => openDialog('customer')}
          onTable={() => openDialog('table')}
          onWaiter={() => openDialog('waiter')}
          onGuest={() => openDialog('guest')}
          onRider={() => openDialog('rider')}
          onMenu={() => openDialog('menu')}
          onMethod={() => openDialog('method')}
          onPrint={() => openDialog('print')}
          onDiscount={() => openDialog('discount')}
          onClear={() => (cart.lines.length ? openDialog('clear') : toast('Nothing to clear'))}
          onPayNow={() => {
            if (payMethod === 'later') setPayMethod('cash')
            openDialog('pay')
          }}
          onPayLater={async () => {
            if (payingLater.current) return
            if (!cart.lines.length) {
              toast('Add a dish to start the order', 'warn')
              return
            }
            const channel = channelFromOrderCode(cart.orderType)
            if (channel === 'dine-in' && !cart.tableId) {
              openDialog('table')
              return
            }
            if (['delivery', 'foodpanda', 'bite'].includes(channel) && !String(cart.address || '').trim()) {
              toast('Add a delivery address', 'warn')
              return
            }
            if ((channel === 'foodpanda' || channel === 'bite') && !String(cart.externalRef || '').trim()) {
              toast('Add the platform order number', 'warn')
              return
            }
            let preview
            try {
              preview = preparePrintWindow()
            } catch (error) {
              toast(error.message || 'Allow pop-ups to print invoices', 'bad')
              return
            }
            payingLater.current = true
            try {
              const order = await placeOrder({
                method: 'later',
                status: 'unpaid',
                received: 0,
              })
              printInvoice('customer', order, {
                user,
                branchLabel,
                restaurant: user?.restaurant || {},
                productById,
              }, preview)
            } catch (error) {
              preview.close()
              toast(error.message || 'Could not send the order', 'bad')
            } finally {
              payingLater.current = false
            }
          }}
          onSaveEdit={async () => {
            try {
              await saveEditedOrder({ method: 'later', paymentTypeId: cart.paymentTypeId })
              navigate('/orders')
            } catch (error) {
              toast(error.message || 'Could not save order', 'bad')
            }
          }}
          onCancelEdit={() => {
            cancelEditOrder()
            toast('Edit cancelled')
          }}
        />
      </div>
      <LightDialogs
        dialog={dialog}
        close={close}
        editor={editor}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        onAdd={addLine}
        onUpdate={updateLine}
      />
    </div>
  )
}
