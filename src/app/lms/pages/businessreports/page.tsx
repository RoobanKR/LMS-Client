"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Settings2, Store, UsersRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { pageEnter } from '@/app/lms/shared/ui'
import {
    useClientGroupsPage,
    type MappingPageFilters,
    type ServiceMapping,
} from '@/app/lms/pages/servicemapping/api/serviceMappingService'
import {
    MappingMultiFilter,
    displayLabel,
} from '@/app/lms/pages/servicemapping/components/MappingReportFilters'
import { collapseAll, scopeByClients, pruneToScope } from '@/app/lms/pages/servicemapping/components/filterScope'
import {
    reportTotals,
    loadServiceReport,
    type ReportClientBlock,
    type ReportTable,
} from '@/app/lms/pages/servicemapping/components/serviceReport'
import { businessModelDisplayName } from '@/app/lms/pages/clientmanagement/features/lib'
import { useClients, type Client } from '@/app/lms/pages/clientmanagement/api/clientManagementService'
import {
    activeFormat, fetchReportSettings, newFormat,
    type ReportFormat, type ReportSettings,
} from '@/app/lms/pages/reportsettings/api/reportSettingsService'
import { BRAND_FALLBACK } from '@/app/lms/pages/reportsettings/api/brand'
import { fetchInstitutionById } from '@/app/lms/pages/instutionmanagement/api/institutionService'
import { PrintPreviewModal } from './components/PrintPreviewModal'
import {
    FilterLabel, REPORT_FIELD, REPORT_PAGE_BG, REPORT_ROW_HOVER, REPORT_TABLE_CARD, REPORT_TD, REPORT_TH, REPORT_WRAP,
    ReportActionRow, ReportEmptyState, ReportHeading, ReportNoMatches, ReportPager, ReportShowingRow,
    chipLabel, reportRowRule, useNextStepNudge, usePaged, type ReportChip,
} from '@/app/lms/shared/report/reportKit'

/* Client Management ▸ Reports.
 *
 * Two things live on this page: a filter form for choosing what the report
 * covers, and — once Generate is pressed — a review table of the actual data.
 * That's it. Print opens ONE modal that carries the preview, the field
 * toggles and the layout settings on its own, so there is no wizard here
 * and no separate route to reach.
 *
 * NOTHING loads until Generate report is pressed. The dropdowns are a draft;
 * the report below is a snapshot of the draft as it was at generate time, so
 * fiddling with a filter afterwards cannot silently disagree with the table
 * you are reading.
 *
 * An empty dropdown means "everything" — leaving all four alone and pressing
 * Generate reports on every client, which is the common case and should not
 * require ticking every box. */

/** The year control has two modes; the switch beside it swaps them.
 *  'years' — tick individual years (2024, 2026) — is the default, because
 *  picking one or two named years is the common case and a range picker makes
 *  that a two-step job. 'range' is for a span (2024–2026). */
type PeriodMode = 'years' | 'range'

type Draft = {
    clients: string[]
    /** Which CLIENT CREATED years the client picker is narrowed to. Empty =
     *  every year. Not the service-providing year below: this one is about
     *  when the client was taken on, and it selects WHICH CLIENTS the report
     *  covers rather than which of their services. */
    clientYears: string[]
    businessModels: string[]
    serviceModels: string[]
    /** Individually ticked years. Used in 'years' mode. */
    years: string[]
    /** Span bounds. Used in 'range' mode. */
    yearFrom: string
    yearTo: string
    period: PeriodMode
}

const EMPTY: Draft = {
    clients: [], clientYears: [], businessModels: [], serviceModels: [],
    years: [], yearFrom: '', yearTo: '', period: 'years',
}

/** Facets are institution-wide, so the query that fetches them asks for the
 *  smallest possible page — it is the `facets` envelope we are after, not rows. */
const NO_FILTERS: MappingPageFilters = {}

/** "active" → "Active". Small enough not to warrant a util file; used in a
 *  couple of places where the client / service status flows into a table. */
const capitalise = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value

/** Split the stored `clientAddress` string back into the parts the report's
 *  Customize Fields sidebar can offer as individual columns (Address Line /
 *  City / State / Pincode). The client form combines them into a shape like
 *
 *      {Address Line}
 *      {City}, {State} - {Pincode}
 *
 *  so the parser reverses that; anything unrecognisable (legacy HTML from
 *  the old TipTap editor, say) falls through as a full Address Line with
 *  the city / state / pincode empty. Any HTML tags are stripped first. */
type AddressParts = { line: string; city: string; state: string; pincode: string }
const parseClientAddress = (raw: string): AddressParts => {
    const plain = (raw || '')
        .replace(/<br\s*\/?>(\r?\n)?/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\r/g, '')
        .trim()
    if (!plain) return { line: '', city: '', state: '', pincode: '' }
    const lines = plain.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    if (lines.length >= 2) {
        const csp = lines[1].match(/^(.+?),\s*(.+?)\s*[-–]\s*(\d[\d\s]*)$/)
        if (csp) {
            const [, city, state, pincode] = csp
            return { line: lines[0], city: city.trim(), state: state.trim(), pincode: pincode.replace(/\s+/g, '') }
        }
    }
    return { line: plain, city: '', state: '', pincode: '' }
}

/** The chips the "Showing:" row can carry, keyed by the draft field. */
type ChipKey = 'businessModels' | 'serviceModels' | 'years' | 'clients' | 'clientYears'
const NO_BLOCKS: ReportClientBlock[] = []

export default function BusinessReportsPage() {
    const [draft, setDraft] = useState<Draft>({ ...EMPTY })
    const { isFresh, seen: nudgeSeen, markGenerated, markSeen, clear: clearGenerated } = useNextStepNudge(draft)
    const [snapshot, setSnapshot] = useState<{ draft: Draft; rows: ServiceMapping[]; generated: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    /** Whether the big Print Preview modal is open. Opens on Print click,
     *  closes on the modal's own X or a Done button. No wizard, no separate
     *  route — one modal handles preview, field toggles and settings. */
    const [printModalOpen, setPrintModalOpen] = useState(false)
    const request = useRef<AbortController | null>(null)
    useEffect(() => () => request.current?.abort(), [])

    const facetsQuery = useClientGroupsPage(NO_FILTERS, 1, 1)
    const facets = facetsQuery.data?.facets

    /* The page designs from System Settings ▸ Report Settings. Fetched once and
     * kept: an export has to know which letterhead a client gets, and asking at
     * click time would make the button wait on a request. A failure here is not
     * an error — no settings simply means the plain built-in layout. */
    const [reportSettings, setReportSettings] = useState<ReportSettings | undefined>()

    /* The letterhead's WORDING, as opposed to its layout. The design stores
     * {org} / {address} / {contact} as tokens, so the institution's own record
     * is what a report actually prints — correct an address in Institution
     * Management and every report picks it up with no design to reopen. */
    const [letterhead, setLetterhead] = useState<{ org: string; address: string; contact: string }>(BRAND_FALLBACK)

    useEffect(() => {
        const institutionId = typeof window === 'undefined' ? null : localStorage.getItem('smartcliff_institution')
        if (!institutionId) return
        let cancelled = false
        fetchReportSettings(institutionId)
            .then((settings) => { if (!cancelled) setReportSettings(settings) })
            .catch(() => { /* plain layout */ })
        fetchInstitutionById(institutionId)
            .then((institution) => {
                if (cancelled) return
                setLetterhead({
                    org: institution?.inst_name?.trim() || BRAND_FALLBACK.org,
                    // An institution with no address on file prints a blank
                    // line rather than the placeholder — a wrong address on a
                    // letterhead is worse than none.
                    address: institution?.address?.trim() || '',
                    contact: institution?.phone?.trim() || '',
                })
            })
            .catch(() => { /* the fallback wording */ })
        return () => { cancelled = true }
    }, [])

    // Picking clients narrows the other three to what those clients actually
    // have, so the dropdowns stop offering combinations that return nothing.
    const clientScope = useMemo(() => scopeByClients(facets, draft.clients), [facets, draft.clients])

    /* Service models are free text, so the same model exists in the data under
     * several casings — "Skilling" and "skilling" both appear. Listed raw that
     * is two identical-looking rows, and ticking one silently misses the other
     * client's mappings. So options are keyed by their DISPLAY label, and the
     * raw values behind each label travel together: one row, one tick, every
     * spelling matched. */
    const serviceModelGroups = useMemo(() => {
        const scoped = pruneToScope(facets?.serviceModels ?? [], clientScope?.serviceModels)
        const byLabel = new Map<string, string[]>()
        for (const raw of scoped) {
            const label = displayLabel(raw)
            byLabel.set(label, [...(byLabel.get(label) || []), raw])
        }
        return byLabel
    }, [facets, clientScope])

    const options = useMemo(() => ({
        clients: (facets?.clients ?? []).map(([id, name]) => ({ value: id, label: name })),
        businessModels: pruneToScope(facets?.businessModels ?? [], clientScope?.businessModels)
            .map((value) => ({ value, label: businessModelDisplayName(value) || value })),
        serviceModels: [...serviceModelGroups.keys()].sort().map((label) => ({ value: label, label })),
        years: clientScope ? clientScope.years : (facets?.years ?? []),
    }), [facets, clientScope, serviceModelGroups])

    const serviceModelYearsFor = useCallback((serviceModelLabels: string[]) => {
        if (!serviceModelLabels.length) return [...(clientScope?.years ?? facets?.years ?? [])].sort()
        const byClient = facets?.byClient
        if (!byClient) return [...(clientScope?.years ?? facets?.years ?? [])].sort()
        const selectedClients = new Set(draft.clients)
        const selectedModels = new Set(serviceModelLabels.flatMap((label) => serviceModelGroups.get(label) || [label]))
        return [...new Set(byClient
            .filter((entry) => (!selectedClients.size || selectedClients.has(entry.client))
                && entry.serviceModels.some((model) => selectedModels.has(model)))
            .flatMap((entry) => entry.years))].sort()
    }, [clientScope, draft.clients, facets, serviceModelGroups])

    const serviceModelMatchesYear = useCallback((serviceModelLabel: string) => {
        const byClient = facets?.byClient
        if (!byClient) return true
        const selectedClients = new Set(draft.clients)
        const rawModels = new Set(serviceModelGroups.get(serviceModelLabel) || [serviceModelLabel])
        const matchesYear = (year: string) => draft.period === 'range'
            ? (!draft.yearFrom || year >= draft.yearFrom) && (!draft.yearTo || year <= draft.yearTo)
            : draft.years.includes(year)
        return byClient.some((entry) => (!selectedClients.size || selectedClients.has(entry.client))
            && entry.serviceModels.some((model) => rawModels.has(model))
            && entry.years.some(matchesYear))
    }, [draft, facets, serviceModelGroups])

    /* Everything ticked on arrival, so the page opens on the whole picture and
     * Generate answers "show me all of it" without any setup. Seeded ONCE. */
    const seeded = useRef(false)
    useEffect(() => {
        if (seeded.current || !facets) return
        seeded.current = true
        setDraft((d) => ({
            ...d,
            clients: (facets.clients ?? []).map(([id]) => id),
            businessModels: facets.businessModels ?? [],
            serviceModels: [...new Set((facets.serviceModels ?? []).map(displayLabel))].sort(),
            years: [...(facets.years ?? [])].sort(),
        }))
    }, [facets])

    const hasDraft = Boolean(
        draft.clients.length || draft.clientYears.length || draft.businessModels.length
        || draft.serviceModels.length
        || draft.years.length || draft.yearFrom || draft.yearTo
    )

    /** Builds the snapshot from `source` (the current draft unless a chip
     *  removal hands in the next one before state has settled). */
    const generate = useCallback(async (source?: Draft) => {
        const from = source ?? draft
        request.current?.abort()
        const controller = new AbortController()
        request.current = controller
        setLoading(true)
        setError('')
        const asked: Draft = { ...from }
        const sortedYears = [...asked.years].sort()
        try {
            const allClients = collapseAll(asked.clients, options.clients.length)
            const allBusiness = collapseAll(asked.businessModels, options.businessModels.length)
            const allServiceModels = collapseAll(asked.serviceModels, options.serviceModels.length)

            const filters: MappingPageFilters = {
                clients: allClients.length ? allClients : undefined,
                businessModels: allBusiness.length ? allBusiness : undefined,
                serviceModels: allServiceModels.length
                    ? allServiceModels.flatMap((label) => serviceModelGroups.get(label) || [label])
                    : undefined,
                yearFrom: asked.period === 'range'
                    ? (asked.yearFrom || undefined)
                    : (sortedYears[0] || undefined),
                yearTo: asked.period === 'range'
                    ? (asked.yearTo || undefined)
                    : (sortedYears[sortedYears.length - 1] || undefined),
            }
            let rows = await loadServiceReport(filters, controller.signal)

            if (asked.period === 'years' && asked.years.length && asked.years.length < options.years.length) {
                const wanted = new Set(asked.years)
                rows = rows.filter((row) => wanted.has(String(row.year || '')))
            }

            if (!controller.signal.aborted) {
                setSnapshot({
                    draft: asked,
                    rows,
                    generated: new Date().toLocaleString(),
                })
                markGenerated(from)
            }
        } catch (err) {
            if (!controller.signal.aborted) {
                setError(err instanceof Error && err.message ? err.message : 'Could not build the report. Please try again.')
            }
        } finally {
            if (!controller.signal.aborted) setLoading(false)
        }
    }, [draft, markGenerated, serviceModelGroups, options.clients.length, options.businessModels.length, options.serviceModels.length, options.years.length])

    /* Full client records — used to fill in the optional Client-level
     * columns (Client ID, Contact Number, Email, Address, Contact
     * Person) that the Print Preview modal's Customize Fields sidebar can
     * enable. The mapping endpoint only carries `MappedClientRef` which
     * has the name and business model, so the extras come from here. */
    const { data: clientList } = useClients()
    const clientById = useMemo(() => {
        const map = new Map<string, Client>()
        for (const client of clientList ?? []) map.set(String(client._id), client)
        return map
    }, [clientList])

    /* The year each client was taken on, for the Client filter's own
     * created-year picker. `createdYear` when the record carries one, else the
     * year off createdAt — the same derivation Service Mapping's client filter
     * uses, so a client is filed under the same year on both pages. */
    const clientCreatedYear = useCallback((clientId: string): string => {
        const client = clientById.get(String(clientId))
        if (!client) return ''
        const stored = (client as { createdYear?: string | number }).createdYear
        if (stored) return String(stored)
        return client.createdAt ? String(new Date(client.createdAt).getFullYear()) : ''
    }, [clientById])

    /** The created years actually present among the clients on offer — a year
     *  nobody was taken on in is not worth a row in the picker. */
    const clientYearOptions = useMemo(
        () => [...new Set(options.clients.map((option) => clientCreatedYear(option.value)).filter(Boolean))],
        [options.clients, clientCreatedYear],
    )

    /** What the Client picker LISTS: the full set, narrowed to the ticked
     *  created years. Deliberately not `options.clients` itself — that stays
     *  the whole list, because `collapseAll` measures a selection against it
     *  to decide whether "everything is ticked" means "no filter". Measured
     *  against a narrowed list, ticking every client of one year would collapse
     *  to no filter and quietly report every client in the institution. */
    const clientPickerOptions = useMemo(
        () => (draft.clientYears.length
            ? options.clients.filter((option) => draft.clientYears.includes(clientCreatedYear(option.value)))
            : options.clients),
        [options.clients, draft.clientYears, clientCreatedYear],
    )

    /** Narrowing the years drops any ticked client that falls outside them —
     *  a selection the reader can no longer see must not still be in force. */
    const setClientYears = useCallback((clientYears: string[]) => {
        setDraft((current) => ({
            ...current,
            clientYears,
            clients: clientYears.length
                ? current.clients.filter((id) => clientYears.includes(clientCreatedYear(id)))
                : current.clients,
        }))
    }, [clientCreatedYear])

    /* The report broken into per-client blocks with rowspan-friendly shape.
     * This is what the review table on this page renders AND what the print
     * modal feeds through the paginator. One source, no drift. */
    const clientNames = useMemo(
        () => new Map((facets?.clients ?? []).map(([id, name]) => [String(id), name])),
        [facets],
    )

    const report = useMemo(() => {
        if (!snapshot) return null
        type Group = { business: string; services: ServiceMapping[] }
        type Node = { client: string; clientId: string; groups: Map<string, Group> }
        const byClient = new Map<string, Node>()

        for (const row of snapshot.rows) {
            const clientObj = typeof row.client === 'object' && row.client ? row.client : null
            const clientKey = String(clientObj?._id || row.client || 'unknown')
            const name = clientObj?.clientCompany || clientNames.get(clientKey) || 'Unnamed client'
            const node = byClient.get(clientKey) || { client: name, clientId: clientKey, groups: new Map<string, Group>() }
            const rawBusiness = clientObj?.businessModel || ''
            const business = rawBusiness ? businessModelDisplayName(rawBusiness) || rawBusiness : 'No business model'
            const group = node.groups.get(business) || { business, services: [] }
            group.services.push(row)
            node.groups.set(business, group)
            byClient.set(clientKey, node)
        }

        /* Flatten each client's business groups into a single block for the
         * rowspan layout. Each service object carries every optional key
         * the modal's Customize Fields sidebar might ask for; the paginator
         * emits only the keys listed in `table.serviceColumns`, so an
         * absent field costs nothing to keep around here.
         *
         * The client-level extras (contact, email, address, primary
         * contact person) are read off the full client record, when
         * available — the mapping API only carries `MappedClientRef` which
         * has the id, company and business model. */
        const blocks: ReportClientBlock[] = [...byClient.values()]
            .sort((a, b) => a.client.localeCompare(b.client))
            .map((node) => {
                const clientRecord = clientById.get(node.clientId)
                const primary = (clientRecord?.contactPersons ?? []).find((person) => person.isPrimary)
                    ?? clientRecord?.contactPersons?.[0]
                const addressParts = parseClientAddress(clientRecord?.clientAddress || '')
                /* The client's CREATED year, drawn from the same
                 * `createdAt` timestamp Client Management shows in its
                 * own listing. Distinct from a service's Offering Year
                 * (that one lives on each service under `year`). Falls
                 * back to an em-dash when the record has no timestamp
                 * — safer than showing "NaN" or 1970 on a broken date. */
                const createdAt = clientRecord?.createdAt
                const parsedCreated = createdAt ? new Date(createdAt) : null
                const createdYear = parsedCreated && !Number.isNaN(parsedCreated.getTime())
                    ? String(parsedCreated.getFullYear())
                    : '—'
                const clientExtras: Record<string, string> = {
                    clientId: clientRecord?.clientId || '—',
                    createdYear,
                    clientStatus: clientRecord?.status ? capitalise(clientRecord.status) : '—',
                    contactPerson: primary?.name || '—',
                    // Primary vs secondary emails and phones — separate
                    // columns so a report that needs both can carry them
                    // side by side.
                    email: primary?.email || '—',
                    secondaryEmail: primary?.secondaryEmail || '—',
                    contactNumber: primary?.phoneNumber || '—',
                    secondaryPhone: primary?.secondaryPhoneNumber || '—',
                    // Organisation switchboard, distinct from the primary
                    // contact person's mobile.
                    clientPhone: clientRecord?.clientPhone || '—',
                    // Full formatted address for the legacy `address`
                    // token, plus the parsed parts so a report can
                    // include City / State / Pincode as their own
                    // columns without dumping the full string.
                    address: clientRecord?.clientAddress || '—',
                    addressLine: addressParts.line || '—',
                    city: addressParts.city || '—',
                    state: addressParts.state || '—',
                    pincode: addressParts.pincode || '—',
                }
                const groups = [...node.groups.values()]
                const services: Record<string, string>[] = groups.flatMap((g) =>
                    [...g.services].sort((a, b) =>
                        (a.year || '').localeCompare(b.year || '', undefined, { numeric: true })
                        || (a.serviceCode || '').localeCompare(b.serviceCode || '')
                    ).map((r) => ({
                        serviceModel: (r.serviceModels || []).map(displayLabel).join(', ') || r.serviceCode || '—',
                        year: r.year || '—',
                        status: r.status ? capitalise(r.status) : '—',
                        code: r.serviceCode || '—',
                        category: r.category || '—',
                        course: r.courseName || '—',
                        // Per-run generated date — same value on every row.
                        // Useful for archival prints where the reader wants
                        // to see the timestamp on the sheet itself, not
                        // just the file name.
                        generatedDate: snapshot.generated,
                    }))
                )
                const business = [...new Set(groups.map((g) => g.business))].join(', ')
                return { client: node.client, business, clientExtras, services }
            })

        // Flat rows for CSV / Excel: Client + Business Model repeated on every row.
        const flatRows: string[][] = []
        let serial = 0
        for (const block of blocks) {
            for (const service of block.services) {
                serial += 1
                flatRows.push([String(serial), block.client, block.business, service.serviceModel, service.year])
            }
        }

        const table: ReportTable = {
            headers: ['S. No.', 'Client', 'Business Model', 'Service Model', 'Providing Year'],
            rows: flatRows,
            groups: blocks,
        }

        return { blocks, table }
    }, [snapshot, clientNames, clientById])

    const table = report?.table ?? null
    const totals = useMemo(() => (snapshot ? reportTotals(snapshot.rows) : null), [snapshot])

    const reset = () => {
        request.current?.abort()
        setDraft({
            ...EMPTY,
            clients: (facets?.clients ?? []).map(([id]) => id),
            businessModels: facets?.businessModels ?? [],
            serviceModels: [...new Set((facets?.serviceModels ?? []).map(displayLabel))].sort(),
            years: [...(facets?.years ?? [])].sort(),
        })
        setSnapshot(null)
        clearGenerated()
        setError('')
        setLoading(false)
    }

    /* The design the print modal opens on. Falls back to a fresh built-in
     * letterhead when no saved template is active, so the preview always has
     * something concrete to render — an empty preview would just look like
     * the modal was broken. The fallback is `newFormat()` which seeds itself
     * with the standard SmartCliff masthead / rules / table / footer. */
    const initialFormat: ReportFormat = useMemo(
        () => activeFormat(reportSettings) ?? newFormat('Report layout', false),
        [reportSettings],
    )

    /* What the reader actually narrowed the report to, in words.
     *
     * Only dimensions that were NARROWED get a mention: leaving a dropdown
     * fully ticked means "everything", and a report covering everything
     * shouldn't carry a line claiming a filter was applied. Press Generate
     * on the default all-selected state and this comes back empty, so the
     * sheet prints without the line at all.
     *
     * CLIENT is deliberately left out even when narrowed — the table names
     * every client it covers in its own column, so repeating a list of
     * them above the table says nothing the reader can't already see.
     * Business Model, Service Model and Offering Year are the dimensions
     * the table can't fully reveal on its own. */
    const filterSummary = useMemo(() => {
        if (!snapshot) return ''
        const asked = snapshot.draft
        const parts: string[] = []

        // A long list is summarised rather than printed in full — a line
        // naming fourteen service models is no more useful than one
        // saying how many there were.
        const describe = (label: string, values: string[], total: number) => {
            if (!values.length || values.length >= total) return
            parts.push(values.length <= 4
                ? `${label}: ${values.join(', ')}`
                : `${label}: ${values.slice(0, 3).join(', ')} +${values.length - 3} more`)
        }

        describe(
            'Business Model',
            asked.businessModels.map((value) => businessModelDisplayName(value) || value),
            options.businessModels.length,
        )
        describe('Service Model', asked.serviceModels, options.serviceModels.length)

        if (asked.period === 'range') {
            if (asked.yearFrom || asked.yearTo) {
                parts.push(`Service Providing Year: ${asked.yearFrom || '…'}–${asked.yearTo || '…'}`)
            }
        } else {
            describe('Service Providing Year', [...asked.years].sort(), options.years.length)
        }

        return parts.length ? `Filtered by  ·  ${parts.join('  ·  ')}` : ''
    }, [snapshot, options.businessModels.length, options.serviceModels.length, options.years.length])

    /* ── "Showing:" chips — read off the GENERATED snapshot ────────── */
    const showingChips = useMemo((): ReportChip<ChipKey>[] => {
        if (!snapshot) return []
        const asked = snapshot.draft
        const narrowed = (values: string[], total: number) => values.length > 0 && values.length < total
        const clientName = new Map(options.clients.map((o) => [o.value, o.label]))
        const chips: ReportChip<ChipKey>[] = []
        const bm = narrowed(asked.businessModels, options.businessModels.length)
        chips.push({ key: 'businessModels', title: 'Business Model', narrowed: bm,
            label: chipLabel(asked.businessModels.map((v) => businessModelDisplayName(v) || v), bm, 'All Business Models') })
        const sm = narrowed(asked.serviceModels, options.serviceModels.length)
        chips.push({ key: 'serviceModels', title: 'Service Model', narrowed: sm,
            label: chipLabel(asked.serviceModels, sm, 'All Service Models') })
        if (asked.period === 'range') {
            const yr = Boolean(asked.yearFrom || asked.yearTo)
            chips.push({ key: 'years', title: 'Service Providing Year', narrowed: yr,
                label: yr ? `${asked.yearFrom || '…'}–${asked.yearTo || '…'}` : 'All Years' })
        } else {
            const yr = narrowed(asked.years, options.years.length)
            chips.push({ key: 'years', title: 'Service Providing Year', narrowed: yr,
                label: chipLabel([...asked.years].sort(), yr, 'All Years') })
        }
        const cl = narrowed(asked.clients, options.clients.length)
        chips.push({ key: 'clients', title: 'Client', narrowed: cl,
            label: chipLabel(asked.clients.map((id) => clientName.get(id) || id), cl, 'All Clients') })
        if (asked.clientYears.length) {
            chips.push({ key: 'clientYears', title: 'Client created year', narrowed: true,
                label: `Created ${chipLabel([...asked.clientYears].sort(), true, '')}` })
        }
        return chips
    }, [snapshot, options.clients, options.businessModels.length, options.serviceModels.length, options.years.length])

    /** × on a chip: drop that one filter from the generated scope and
     *  regenerate, so the table and chips update together. */
    const clearFilter = (key: ChipKey) => {
        if (!snapshot) return
        const asked = snapshot.draft
        const cleared: Partial<Draft> = key === 'businessModels' ? { businessModels: facets?.businessModels ?? [] }
            : key === 'serviceModels' ? { serviceModels: [...new Set((facets?.serviceModels ?? []).map(displayLabel))].sort() }
            : key === 'clients' ? { clients: (facets?.clients ?? []).map(([id]) => id), clientYears: [] }
            : key === 'clientYears' ? { clientYears: [] }
            : asked.period === 'range' ? { yearFrom: '', yearTo: '' } : { years: [...(facets?.years ?? [])].sort() }
        const next: Draft = { ...asked, ...cleared }
        setDraft(next)
        void generate(next)
    }

    /** Preview Report opens the preview modal (it carries the Print
     *  action); opening it ends the next-step glow. */
    const openPreview = () => {
        markSeen()
        setPrintModalOpen(true)
    }

    const nudge = isFresh && Boolean(table?.rows.length) && !nudgeSeen
    const paged = usePaged(report?.blocks ?? NO_BLOCKS)

    /** Tokens the design references at export time. Rebuilt whenever the
     *  snapshot or the letterhead changes. */
    const printMeta = useMemo(() => ({
        title: 'Services report',
        scope: report && table
            ? `${report.blocks.length} client${report.blocks.length === 1 ? '' : 's'}  ·  ${table.rows.length} row${table.rows.length === 1 ? '' : 's'}`
            : '',
        generated: snapshot?.generated ?? '',
        filters: filterSummary,
        ...letterhead,
    }), [snapshot, report, table, letterhead, filterSummary])

    return (
        <>
            <motion.div variants={pageEnter} initial="hidden" animate="visible" className={`flex h-full min-h-0 min-w-0 flex-col ${REPORT_PAGE_BG}`}>
                <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-4 sm:px-6 md:px-8">

                    {/* ── Heading + scope form ─────────────────────────────
                        Same flat layout as Course Management ▸ Report (see
                        shared/report/reportKit): heading, the filters in
                        one equal-width row, then Reset → Preview Report →
                        Generate Report. Preview / Print glow once a report
                        is generated, until the reader opens one or edits a
                        filter. */}
                    <div className="no-print shrink-0">
                        <ReportHeading />

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={Store} tone="text-brand-500">Business Model</FilterLabel>
                                <MappingMultiFilter
                                    label="Business models"
                                    options={options.businessModels}
                                    value={draft.businessModels}
                                    onChange={(businessModels) => setDraft((d) => ({ ...d, businessModels }))}
                                    placeholder="All business models"
                                    emptyLabel={clientScope ? 'No business models for the selected clients' : undefined}
                                />
                            </div>
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={Settings2} tone="text-brand-500">Service Model</FilterLabel>
                                <MappingMultiFilter
                                    label="Service models"
                                    options={options.serviceModels}
                                    value={draft.serviceModels}
                                    onChange={(serviceModels) => setDraft((d) => ({ ...d, serviceModels }))}
                                    placeholder="All service models"
                                    emptyLabel={clientScope ? 'No service models for the selected clients' : undefined}
                                    yearFilter={{
                                        label: 'Service Providing Year',
                                        yearsFor: serviceModelYearsFor,
                                        matches: serviceModelMatchesYear,
                                        period: draft.period,
                                        years: draft.years,
                                        from: draft.yearFrom,
                                        to: draft.yearTo,
                                        onPeriodChange: (next) => setDraft((d) => (d.period === next
                                            ? d
                                            : next === 'range'
                                                ? { ...d, period: 'range', years: [] }
                                                : { ...d, period: 'years', yearFrom: '', yearTo: '' })),
                                        onYearsChange: (years) => setDraft((d) => ({ ...d, years })),
                                        onRangeChange: (yearFrom, yearTo) => setDraft((d) => ({ ...d, yearFrom, yearTo })),
                                    }}
                                />
                            </div>
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={UsersRound} tone="text-emerald-500">Client</FilterLabel>
                                <MappingMultiFilter
                                    label="Clients"
                                    options={clientPickerOptions}
                                    value={draft.clients}
                                    onChange={(clients) => setDraft((d) => ({ ...d, clients }))}
                                    placeholder="All clients"
                                    emptyLabel={draft.clientYears.length
                                        ? 'No clients created in the selected years'
                                        : undefined}
                                    // The client's own year, inside the client
                                    // filter: "which clients — and of those,
                                    // the ones taken on in 2025".
                                    extra={{
                                        label: 'Client created year',
                                        options: clientYearOptions,
                                        value: draft.clientYears,
                                        onChange: setClientYears,
                                        allLabel: 'All years',
                                    }}
                                />
                            </div>
                        </div>

                        <ReportActionRow
                            onReset={reset}
                            resetDisabled={loading || (!hasDraft && !snapshot)}
                            onPreview={openPreview}
                            previewDisabled={!snapshot || !table?.rows.length}
                            nudge={nudge}
                            onGenerate={() => void generate()}
                            generateDisabled={loading || facetsQuery.isLoading}
                            loading={loading}
                        />
                    </div>

                    {/* ── The report ───────────────────────────────────────
                        Flex column so the table can claim every pixel
                        remaining below the form. Only the table body
                        scrolls; the outer container is not scrollable so
                        the reader never sees a nested pair of scrollbars. */}
                    <div className="mt-4 flex min-h-0 flex-1 flex-col">
                        {error && (
                            <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-50 p-3 text-sm text-danger-700">
                                {error}
                                <Button variant="outline" size="sm" className="text-xs" onClick={() => void generate()}>Retry</Button>
                            </div>
                        )}

                        {!snapshot && !loading && !error && <ReportEmptyState />}

                        {loading && !snapshot && (
                            <div role="status" aria-label="Generating report" className="space-y-3">
                                {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-ink-100" />)}
                            </div>
                        )}

                        {snapshot && table && totals && (
                            <div className={`flex flex-1 min-h-0 flex-col transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                <ReportShowingRow
                                    chips={showingChips}
                                    onRemove={clearFilter}
                                    loading={loading}
                                />

                                {!table.rows.length ? <ReportNoMatches /> : (
                                    <div className={`${REPORT_TABLE_CARD} max-lg:min-h-[360px]`}>
                                        <div className="min-h-0 flex-1 overflow-auto">
                                            <table className="w-full min-w-[640px] table-fixed border-collapse text-xs lg:min-w-0">
                                                {/* Column widths match the shared
                                                    REPORT_COLUMN_WIDTHS used by the modal
                                                    preview + PDF + print: 7 / 33 / 24 / 22 / 14. */}
                                                <colgroup>
                                                    <col style={{ width: '7%' }} />
                                                    <col style={{ width: '33%' }} />
                                                    <col style={{ width: '24%' }} />
                                                    <col style={{ width: '22%' }} />
                                                    <col style={{ width: '14%' }} />
                                                </colgroup>
                                                <thead>
                                                    <tr>
                                                        <th className={`${REPORT_TH} border-r text-center`}>S. No.</th>
                                                        <th className={`${REPORT_TH} border-r text-left`}>Client</th>
                                                        <th className={`${REPORT_TH} border-r text-left`}>Business Model</th>
                                                        <th className={`${REPORT_TH} border-r text-left`}>Service Model</th>
                                                        <th className={`${REPORT_TH} text-center`}>Providing Year</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paged.items.map((block, blockIdx) => block.services.map((svc, svcIdx) => {
                                                        const isFirst = svcIdx === 0
                                                        return (
                                                            <tr key={`${paged.start + blockIdx}-${svcIdx}`} className={`${reportRowRule(isFirst && blockIdx > 0)} ${REPORT_ROW_HOVER}`}>
                                                                {/* S. No., Client and Business Model
                                                                    rowspan the client block — one
                                                                    number per client. */}
                                                                {isFirst && (
                                                                    <>
                                                                        <td rowSpan={block.services.length} className={`${REPORT_TD} text-center tabular-nums text-subtle`}>
                                                                            {paged.start + blockIdx + 1}
                                                                        </td>
                                                                        <td rowSpan={block.services.length} className={`${REPORT_TD} font-semibold text-heading`} style={REPORT_WRAP}>
                                                                            {block.client}
                                                                        </td>
                                                                        <td rowSpan={block.services.length} className={`${REPORT_TD} text-body`} style={REPORT_WRAP}>
                                                                            {block.business}
                                                                        </td>
                                                                    </>
                                                                )}
                                                                <td className={`${REPORT_TD} text-body`} style={REPORT_WRAP}>{svc.serviceModel}</td>
                                                                <td className="px-3 py-2.5 text-center align-middle tabular-nums text-body">{svc.year}</td>
                                                            </tr>
                                                        )
                                                    }))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <ReportPager paged={paged} noun="clients" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ── Print Preview modal ─────────────────────────────────────
                Opens on Print. Owns its own working format (so edits inside
                are throwaways unless the user Applies them) and its own set
                of enabled optional fields. Preview updates live as the two
                sidebars (Customize Fields / Customize Report Settings) are
                edited. Download PDF and Print at the bottom. */}
            <PrintPreviewModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                snapshot={snapshot}
                blocks={report?.blocks ?? []}
                letterhead={letterhead}
                initialFormat={initialFormat}
                meta={printMeta}
            />
        </>
    )
}
