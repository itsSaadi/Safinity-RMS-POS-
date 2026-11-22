import { useMemo, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { categoryName } from '../../data/catalog'
import { choiceGroupError, choiceHint, choiceIds, groupLimits, toggleGroupChoice } from '../../utils/choices'
import { dealContents, pkr } from '../../utils/format'
import ChoicePicker from '../ui/ChoicePicker'
import DealLines from '../ui/DealLines'
import FoodImage from '../ui/FoodImage'
import Overlay from '../ui/Overlay'

export default function CustomizeModal({ product, line, onClose, onSave }) {
  const [variationId, setVariationId] = useState(line?.variationId || product.variations[0]?.id || null)
  const [choices, setChoices] = useState(line?.choiceMap || {})
  const [addonIds, setAddonIds] = useState(line?.addonIds || [])
  const [qty, setQty] = useState(line?.qty || 1)
  const [instructions, setInstructions] = useState(line?.instructions || '')
  const [error, setError] = useState('')

  const variation = product.variations.find((item) => item.id === variationId) || null
  const groups = useMemo(
    () => [...(product.choiceGroups || []), ...((variation?.choiceGroups) || [])],
    [product.choiceGroups, variation],
  )
  const selectedAddons = product.addons.filter((item) => addonIds.includes(item.id))
  const selectedChoices = groups.flatMap((group) => {
    const picked = new Set(choiceIds(choices[group.id]))
    return group.options
      .filter((item) => picked.has(String(item.id)))
      .map((option) => ({ group: group.name, ...option }))
  })

  const unitPrice = useMemo(() => {
    const base = product.price + (variation?.price || 0)
    const extra = selectedAddons.reduce((sum, item) => sum + item.price, 0) + selectedChoices.reduce((sum, item) => sum + (item.price || 0), 0)
    return base + extra
  }, [product, variation, selectedAddons, selectedChoices])

  const save = () => {
    const missing = choiceGroupError(groups, choices)
    if (missing) {
      setError(missing)
      return
    }
    onSave({
      productId: product.id,
      dealId: product.dealId || null,
      name: product.name,
      code: product.code,
      image: product.image,
      station: product.station,
      variationId,
      variation: variation?.name || null,
      variationPrice: variation ? (product.price + (variation.price || 0)) : null,
      itemPrice: product.price + (variation?.price || 0),
      choiceMap: choices,
      choices: selectedChoices.map((item) => item.name),
      choiceDetails: selectedChoices.map((item) => ({ name: item.name, price: item.price || 0 })),
      addonIds,
      addons: selectedAddons.map((item) => item.name),
      addonDetails: selectedAddons.map((item) => ({ name: item.name, price: item.price || 0 })),
      instructions: instructions.trim(),
      qty,
      unitPrice,
      dealLines: dealContents(product),
    })
  }

  return (
    <Overlay onClose={onClose} className="max-w-5xl rounded-t-[32px] sm:rounded-[32px]">
      <div className="grid max-h-[94vh] md:grid-cols-[0.9fr_1.1fr]">
        <FoodImage src={product.image} alt={product.name} className="h-32 md:h-full md:min-h-[240px]" />
        <div className="flex max-h-[94vh] flex-col">
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{product.categoryName || categoryName(product.category)} · {product.code}</p>
              <h2 className="font-display text-2xl leading-none">{product.name}</h2>
              <DealLines source={product} className="mt-2 space-y-0.5 text-sm font-semibold text-ink" />
              <p className="mt-2 text-sm text-muted">{product.description}</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soft"><X size={18} /></button>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-3">
            {product.variations.length > 0 && (
              <OptionBlock title="Size" hint="Pick one">
                <div className="grid grid-cols-2 gap-2">
                  {product.variations.map((option) => (
                    <SelectCard key={option.id} active={variationId === option.id} title={option.name} price={option.price} onClick={() => setVariationId(option.id)} />
                  ))}
                </div>
              </OptionBlock>
            )}
            {groups.map((group) => (
              <ChoicePicker
                key={group.id}
                title={group.name}
                hint={choiceHint(group)}
                required={groupLimits(group).min > 0}
                options={group.options}
                selected={choiceIds(choices[group.id])}
                onToggle={(optionId) => setChoices((current) => toggleGroupChoice(current, group, optionId))}
              />
            ))}
            {product.addons.length > 0 && (
              <ChoicePicker
                title="Add-ons"
                hint="Optional."
                options={product.addons}
                selected={addonIds.map(String)}
                onToggle={(optionId) => setAddonIds((current) => (
                  current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]
                ))}
              />
            )}
            <OptionBlock title="Quantity" hint="Touch to change">
              <div className="flex h-14 w-40 items-center justify-between rounded-full bg-soft px-2">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((value) => Math.max(1, value - 1))} className="grid h-11 w-11 place-items-center rounded-full bg-surface"><Minus /></button>
                <span className="text-xl font-extrabold">{qty}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((value) => value + 1)} className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white"><Plus /></button>
              </div>
            </OptionBlock>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Special instructions</span>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={3}
                placeholder="No onion, sauce on the side, allergy notes"
                className="mt-2 w-full rounded-3xl border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-orange-400"
              />
            </label>
            {error && <p className="text-sm font-bold text-red-500">{error}</p>}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Item total</p>
              <p className="font-display text-2xl leading-none">{pkr(unitPrice * qty)}</p>
            </div>
            <button type="button" onClick={save} className="h-14 rounded-2xl bg-orange-500 px-8 text-base font-extrabold text-white">
              {line ? 'Update item' : 'Add to order'}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

function OptionBlock({ title, hint, children }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-extrabold">{title}</h3>
        <span className="text-[11px] font-bold uppercase tracking-wide text-orange-500">{hint}</span>
      </div>
      {children}
    </section>
  )
}

function SelectCard({ active, title, price, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border px-3 py-3 text-left ${active ? 'border-orange-500 bg-orange-500 text-white' : 'border-line bg-surface'}`}>
      <span className="block text-sm font-extrabold">{title}</span>
      <span className={`text-xs font-semibold ${active ? 'text-white/80' : 'text-muted'}`}>{price ? `+ ${pkr(price)}` : 'Included'}</span>
    </button>
  )
}
