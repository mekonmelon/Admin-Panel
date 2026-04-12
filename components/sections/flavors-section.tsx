'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

type GenericRow = Record<string, unknown>
type ActionProp = (formData: FormData) => void | Promise<void>

function asText(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function flavorId(row: GenericRow) {
  return asText(row.id || row.flavor_id || row.humor_flavor_id)
}

function flavorLabel(row: GenericRow) {
  return asText(row.slug || row.name || row.title || row.description)
}

function flavorDescription(row: GenericRow) {
  return asText(row.description || row.notes || row.summary)
}

function stepFlavorId(row: GenericRow) {
  return asText(row.humor_flavor_id || row.flavor_id || row.humor_flavor)
}

function stepOrder(row: GenericRow) {
  const raw = Number(row.order_by ?? row.step_order ?? row.order_index ?? row.order)
  return Number.isFinite(raw) ? raw : Number.MAX_SAFE_INTEGER
}

function stepTitle(row: GenericRow, index: number) {
  return asText(row.description || row.step_title || row.title || row.step_type) || `Step ${index + 1}`
}

function stepContent(row: GenericRow) {
  return (
    asText(row.llm_user_prompt) ||
    asText(row.llm_system_prompt) ||
    asText(row.step_content) ||
    asText(row.prompt) ||
    asText(row.content)
  )
}

function flavorSortValue(row: GenericRow) {
  const raw = Number(flavorId(row))
  return Number.isFinite(raw) ? raw : null
}

function buildDuplicateLabel(flavorRows: GenericRow[], sourceRow: GenericRow) {
  const sourceLabel = flavorLabel(sourceRow).trim() || `Flavor ${flavorId(sourceRow)}`
  const normalizedBase = sourceLabel.replace(/\s*\(copy\s*\d*\)$/i, '').trim()
  const existingLabels = new Set(flavorRows.map((row) => flavorLabel(row).trim().toLowerCase()).filter(Boolean))

  const firstCandidate = `${normalizedBase} (Copy)`
  if (!existingLabels.has(firstCandidate.toLowerCase())) {
    return firstCandidate
  }

  let index = 2
  while (existingLabels.has(`${normalizedBase} (Copy ${index})`.toLowerCase())) {
    index += 1
  }

  return `${normalizedBase} (Copy ${index})`
}

export function FlavorsSection({
  flavors,
  steps,
  duplicateFlavor
}: {
  flavors: GenericRow[]
  steps: GenericRow[]
  duplicateFlavor: ActionProp
}) {
  const [selected, setSelected] = useState<string>('')
  const [duplicateNotice, setDuplicateNotice] = useState<string>('')
  const [expectedDuplicateLabel, setExpectedDuplicateLabel] = useState<string>('')
  const [isDuplicating, startDuplicateTransition] = useTransition()
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sortedFlavors = useMemo(() => {
    return [...flavors].sort((a, b) => {
      const aId = flavorSortValue(a)
      const bId = flavorSortValue(b)
      if (aId !== null && bId !== null) return bId - aId
      return flavorLabel(a).localeCompare(flavorLabel(b))
    })
  }, [flavors])

  useEffect(() => {
    if (!selected && sortedFlavors.length > 0) {
      setSelected(flavorId(sortedFlavors[0]))
    }
  }, [sortedFlavors, selected])

  useEffect(() => {
    if (!expectedDuplicateLabel) return
    const match = sortedFlavors.find(
      (row) => flavorLabel(row).trim().toLowerCase() === expectedDuplicateLabel.trim().toLowerCase()
    )
    if (match) {
      setSelected(flavorId(match))
      setDuplicateNotice(`Success! Duplicate saved as ${expectedDuplicateLabel}.`)
      setExpectedDuplicateLabel('')

      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current)
      }
      noticeTimeoutRef.current = setTimeout(() => {
        setDuplicateNotice('')
        noticeTimeoutRef.current = null
      }, 3500)
    }
  }, [sortedFlavors, expectedDuplicateLabel])

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current)
      }
    }
  }, [])

  const activeFlavor = useMemo(
    () => sortedFlavors.find((row) => flavorId(row) === selected) ?? null,
    [sortedFlavors, selected]
  )

  const activeSteps = useMemo(
    () =>
      steps
        .filter((row) => stepFlavorId(row) === selected)
        .sort((a, b) => stepOrder(a) - stepOrder(b)),
    [steps, selected]
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Humor Flavors + Steps</h2>
        <p className="text-sm text-slate-500">
          Master-detail pipeline view. Select a flavor to inspect its sequence of prompt steps.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="space-y-1">
            {sortedFlavors.map((flavor, index) => {
              const id = flavorId(flavor)
              const isActive = selected === id
              return (
                <button
                  key={id || index}
                  className={`w-full rounded-lg px-3 py-2 text-left ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 hover:bg-slate-100'
                  }`}
                  onClick={() => setSelected(id)}
                  type="button"
                >
                  <p className="text-sm font-semibold">{flavorLabel(flavor) || `Flavor ${id || index + 1}`}</p>
                  <p className={`text-xs ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>ID: {id || 'unknown'}</p>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="space-y-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Selected Flavor</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {activeFlavor ? flavorLabel(activeFlavor) || `Flavor ${flavorId(activeFlavor)}` : 'No flavor selected'}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {activeFlavor ? flavorDescription(activeFlavor) || 'No description field available.' : 'No description field available.'}
                </p>
              </div>
              {duplicateNotice ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                  {duplicateNotice}
                </p>
              ) : null}
              {activeFlavor ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    const duplicateName = buildDuplicateLabel(sortedFlavors, activeFlavor)
                    setDuplicateNotice('')
                    setExpectedDuplicateLabel(duplicateName)

                    const formData = new FormData()
                    formData.set('id', flavorId(activeFlavor))

                    startDuplicateTransition(async () => {
                      await duplicateFlavor(formData)
                    })
                  }}
                >
                  <button
                    type="submit"
                    disabled={isDuplicating}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDuplicating ? 'Duplicating…' : 'Duplicate flavor + steps'}
                  </button>
                </form>
              ) : null}
            </div>
          </article>

          <div className="space-y-2">
            {activeSteps.length ? (
              activeSteps.map((step, index) => (
                <article
                  key={asText(step.id) || index}
                  className="relative rounded-xl border border-slate-200 bg-white p-4 pl-10"
                >
                  <div className="absolute left-3 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{stepTitle(step, index)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                    {stepContent(step) || 'No step content field available.'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Order: {asText(step.order_by || step.step_order || step.order_index || step.order) || '—'}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                No steps found for the selected flavor.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}