import { choiceIds } from '../utils/choices'
import { dealContents } from '../utils/format'

function activeGroups(product, variation) {
  return [...(product.choiceGroups || []), ...((variation?.choiceGroups) || [])]
}

export function buildLine(product, draft = {}) {
  const variationId = draft.variationId ?? product.variations[0]?.id ?? null
  const variation = product.variations.find((item) => item.id === variationId) || null
  const choiceMap = draft.choiceMap || {}
  const groups = activeGroups(product, variation)
  const chosen = groups.flatMap((group) => {
    const picked = new Set(choiceIds(choiceMap[group.id]))
    return group.options
      .filter((item) => picked.has(String(item.id)))
      .map((option) => ({ group: group.name, ...option }))
  })
  const addonIds = draft.addonIds || []
  const addons = product.addons.filter((item) => addonIds.includes(item.id))
  const unitPrice = product.price
    + (variation?.price || 0)
    + chosen.reduce((sum, item) => sum + (item.price || 0), 0)
    + addons.reduce((sum, item) => sum + item.price, 0)

  return {
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
    choiceMap,
    choices: chosen.map((item) => item.name),
    choiceDetails: chosen.map((item) => ({ name: item.name, price: item.price || 0 })),
    addonIds,
    addons: addons.map((item) => item.name),
    addonDetails: addons.map((item) => ({ name: item.name, price: item.price || 0 })),
    instructions: (draft.instructions || '').trim(),
    qty: draft.qty || 1,
    unitPrice,
    dealLines: dealContents(product),
  }
}

export function needsChoices(product) {
  const hasVariationGroups = (product.variations || []).some((row) => row.choiceGroups?.length)
  return Boolean(product.variations.length || product.choiceGroups.length || product.addons.length || hasVariationGroups)
}
