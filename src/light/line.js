import { dealContents } from '../utils/format'

function activeGroups(product, variation) {
  return [...(product.choiceGroups || []), ...((variation?.choiceGroups) || [])]
}

export function buildLine(product, draft = {}) {
  const variationId = draft.variationId ?? product.variations[0]?.id ?? null
  const variation = product.variations.find((item) => item.id === variationId) || null
  const choiceMap = draft.choiceMap || {}
  const groups = activeGroups(product, variation)
  const chosen = groups
    .map((group) => {
      const option = group.options.find((item) => item.id === choiceMap[group.id])
      return option ? { group: group.name, ...option } : null
    })
    .filter(Boolean)
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
    choiceMap,
    choices: chosen.map((item) => item.name),
    addonIds,
    addons: addons.map((item) => item.name),
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
