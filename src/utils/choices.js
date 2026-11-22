export function choiceIds(value) {
  if (value == null || value === '') return []
  const list = Array.isArray(value) ? value : [value]
  return [...new Set(list.map((id) => String(id)).filter(Boolean))]
}

/** How many options this group allows, and how many must be picked. */
export function groupLimits(group) {
  const min = Math.max(0, Number(group?.minChoices) || 0)
  const rawMax = Number(group?.maxChoices)
  const max = Number.isFinite(rawMax) && rawMax > 0 ? Math.max(rawMax, min || rawMax) : Math.max(1, min || 1)
  // A max above 1 with no minimum still means the cashier must pick that many.
  const required = min > 0 ? min : (max > 1 ? max : 0)
  return { min: required, max }
}

export function choiceHint(group) {
  const { min, max } = groupLimits(group)
  if (min > 0 && min === max) return `Select ${max} choice${max === 1 ? '' : 's'}.`
  if (min > 0 && max > min) return `Select at least ${min} and up to ${max} choices.`
  if (max > 1) return `Select up to ${max} choices.`
  return 'Optional.'
}

export function toggleGroupChoice(map, group, optionId) {
  const { max } = groupLimits(group)
  const selected = choiceIds(map?.[group.id])
  const id = String(optionId)
  if (selected.includes(id)) {
    return { ...map, [group.id]: selected.filter((item) => item !== id) }
  }
  if (max <= 1) return { ...map, [group.id]: [id] }
  if (selected.length >= max) return { ...map, [group.id]: [...selected.slice(1), id] }
  return { ...map, [group.id]: [...selected, id] }
}

export function choiceGroupError(groups, map) {
  for (const group of groups || []) {
    const { min, max } = groupLimits(group)
    const count = choiceIds(map?.[group.id]).length
    if (count < min) {
      return min === max ? `Select ${min} for ${group.name}` : `Select at least ${min} for ${group.name}`
    }
    if (count > max) return `Select at most ${max} for ${group.name}`
  }
  return ''
}

export function flattenChoices(choiceMap) {
  return Object.entries(choiceMap || {}).flatMap(([choiceGroupId, value]) =>
    choiceIds(value).map((choiceId) => ({
      choiceId,
      choiceGroupId: String(choiceGroupId),
    })),
  )
}
