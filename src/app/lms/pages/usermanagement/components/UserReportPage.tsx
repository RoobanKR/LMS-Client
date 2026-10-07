"use client"

/* User Management ▸ Reports.
 *
 * Mirrors the shape of Course Setup ▸ Report (a filter form, then a
 * snapshotted review table on Generate, plus a Print button that opens
 * the shared PrintPreviewModal) but is sourced from the users export
 * rather than course-structure records. What the reader is looking at
 * is a per-client roll-up of every user attached to the institution.
 *
 * Nothing loads until Generate report is pressed — the dropdowns are a
 * draft, and the table below is a snapshot of the draft at the moment
 * it was generated, so a filter fiddle after the fact cannot silently
 * disagree with the rows on screen. Leaving all filters alone and
 * pressing Generate reports on every user, which is the common case. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, BookOpen, CalendarDays, Settings2, ShieldCheck, Store, UsersRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pageEnter } from '@/app/lms/shared/ui'
import {
    MappingMultiFilter,
    displayLabel,
} from '@/app/lms/pages/servicemapping/components/MappingReportFilters'
import { businessModelDisplayName } from '@/app/lms/pages/clientmanagement/features/lib'
import { useClients, type Client } from '@/app/lms/pages/clientmanagement/api/clientManagementService'
import { useServiceMappings, type ServiceMapping } from '@/app/lms/pages/servicemapping/api/serviceMappingService'
import { fetchUsersForExport, type ServiceIndexEntry } from '../api/userService'
import {
    activeFormat, fetchReportSettings, newFormat,
    type ReportFormat, type ReportSettings,
} from '@/app/lms/pages/reportsettings/api/reportSettingsService'
import { BRAND_FALLBACK } from '@/app/lms/pages/reportsettings/api/brand'
import { fetchInstitutionById } from '@/app/lms/pages/instutionmanagement/api/institutionService'
import type { ReportClientBlock } from '@/app/lms/pages/servicemapping/components/serviceReport'
import { PrintPreviewModal, type FieldRow } from '@/app/lms/pages/businessreports/components/PrintPreviewModal'
import {
    FilterLabel, REPORT_FIELD, REPORT_PAGE_BG, REPORT_ROW_HOVER, REPORT_TABLE_CARD, REPORT_TD, REPORT_TH, REPORT_WRAP,
    ReportActionRow, ReportEmptyState, ReportHeading, ReportNoMatches, ReportPager, ReportShowingRow,
    chipLabel, reportRowRule, useNextStepNudge, usePaged, type ReportChip,
} from '@/app/lms/shared/report/reportKit'

/* ── Filter draft ─────────────────────────────────────────────────────
 *  Order mirrors the Users tab's filter panel:
 *    Business Model → Service Providing Year → Service Model →
 *    Client → Course → Role, with Status still available for the
 *    account-state narrowing. The `services` key holds Business Model
 *    values in this codebase (see Course Setup's MappingFilterPanel). */
type Draft = {
    roles: string[]
    services: string[]
    serviceModels: string[]
    statuses: string[]
    clients: string[]
    providingYears: string[]
    courses: string[]
}

const EMPTY: Draft = {
    roles: [], services: [], serviceModels: [], statuses: [], clients: [],
    providingYears: [], courses: [],
}

/** "active" → "Active". */
const capitalise = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value

/** The stored clientAddress carries the three lines the client form
 *  builds — Address Line, City, State - Pincode. This helper reverses
 *  that so the report can offer City / State / Pincode as their own
 *  columns instead of dumping the whole string. Kept in step with the
 *  mirror in coursestructure/components/CourseReportPage.tsx. */
type AddressParts = { line: string; city: string; state: string; pincode: string }
function parseClientAddress(raw: string): AddressParts {
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

/* ── Column set the modal renders ─────────────────────────────────────
 *  Order top-to-bottom here is the sidebar's initial order, which the
 *  sheet then reads left-to-right. Client-scope rows rowspan once per
 *  block; service-scope rows render one per user under the client. */
const USER_FIELDS: FieldRow[] = [
    // Client scope
    { key: 'clientName', label: 'Client Name', required: true, scope: 'client', column: 'Client', dataKey: 'client' },
    { key: 'clientId', label: 'Client ID', scope: 'client', column: 'Client ID', dataKey: 'clientId' },
    { key: 'businessModel', label: 'Business Model', scope: 'client', column: 'Business Model', dataKey: 'business' },
    // Service scope — the mapping the user belongs to.
    { key: 'service', label: 'Service', scope: 'service', column: 'Service', dataKey: 'service' },
    { key: 'serviceModel', label: 'Service Model', scope: 'service', column: 'Service Model', dataKey: 'serviceModel' },
    // User scope — mapped to `service` scope so the paginator emits one
    // row per user, the same shape ReportClientBlock and PrintPreviewModal
    // already understand.
    { key: 'userName', label: 'User Name', required: true, scope: 'service', column: 'User Name', dataKey: 'userName' },
    { key: 'userEmail', label: 'Email', scope: 'service', column: 'Email', dataKey: 'userEmail' },
    { key: 'userRole', label: 'Role', scope: 'service', column: 'Role', dataKey: 'userRole' },
    { key: 'userStatus', label: 'Status', scope: 'service', column: 'Status', dataKey: 'userStatus' },
    { key: 'userPhone', label: 'Phone', scope: 'service', column: 'Phone', dataKey: 'userPhone' },
]

/* Default Customize Fields set — the five user-scope columns the
 * reader wants on the printed sheet by default. Client / Business
 * Model / Service / Service Model are all AVAILABLE (see USER_FIELDS
 * above) but start unticked; toggling them on switches the printed
 * sheet to the per-client rowspanned layout, and toggling them off
 * gives the sheet ONE ROW PER USER with its own S. No. */
const USER_DEFAULT_ENABLED = new Set(['userName', 'userEmail', 'userPhone', 'userRole', 'userStatus'])

/* ── Reading a user record ────────────────────────────────────────────
 *  The export payload types users as `any`; this narrows the fields
 *  the report actually consumes. Legacy top-level clientId/serviceModel/
 *  serviceMappingId is treated as the FIRST enrolment; anything in
 *  `services[]` was added later by Reassign Users. */
type ClientRef = { _id?: unknown; clientCompany?: string; businessModel?: string }
type MappingRef = { _id?: unknown; service?: string }
type ServiceEntry = { clientId?: unknown; clientName?: unknown; serviceMappingId?: unknown; serviceModel?: unknown }
type UserRecord = {
    _id?: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    status?: string
    role?: { renameRole?: string; originalRole?: string; _id?: string } | string
    clientId?: unknown
    clientName?: unknown
    serviceMappingId?: unknown
    serviceModel?: unknown
    services?: ServiceEntry[]
}

const asClient = (value: unknown): ClientRef | undefined =>
    value && typeof value === 'object' ? value as ClientRef : undefined
const asMapping = (value: unknown): MappingRef | undefined =>
    value && typeof value === 'object' ? value as MappingRef : undefined
const idOf = (value: unknown): string => {
    if (!value) return ''
    if (typeof value === 'string') return value
    const record = value as { _id?: unknown }
    return record._id ? String(record._id) : String(value)
}

const UNASSIGNED = '__no_client__'

/** Every (client, service, service model) a user belongs to — one entry
 *  per enrolment. A user enrolled with two clients belongs under both. */
type Enrolment = {
    clientKey: string
    clientName: string
    service: string
    serviceModel: string
    serviceMappingId: string
}

/* Users created before `serviceMappingId` existed carry a service-model
   name and nothing else — this resolves those: given the client and the
   model, the mapping that offers it names the service. Ambiguous cases
   (two of the client's services offer the same model) resolve to nothing
   rather than to a guess. */
function serviceResolver(index: ServiceIndexEntry[]) {
    const byPair = new Map<string, string | null>()
    ;(index || []).forEach((mapping) => {
        const client = String(mapping.client || '')
        if (!client || !mapping.service) return
        ;(mapping.serviceModels || []).forEach((model) => {
            const key = `${client}|${String(model).trim().toLowerCase()}`
            if (!byPair.has(key)) byPair.set(key, mapping.service as string)
            else if (byPair.get(key) !== mapping.service) byPair.set(key, null)
        })
    })
    return (clientKey: string, model: string) =>
        byPair.get(`${clientKey}|${model.trim().toLowerCase()}`) || ''
}

function enrolmentsOf(entry: UserRecord): Enrolment[] {
    const rows: Enrolment[] = []
    const push = (rawClient: unknown, rawName: unknown, rawMapping: unknown, rawModel: unknown) => {
        const client = asClient(rawClient)
        const mapping = asMapping(rawMapping)
        const clientKey = idOf(rawClient) || String(rawName ?? '').trim()
        const name = client?.clientCompany || String(rawName ?? '').trim()
        const service = mapping?.service || ''
        const model = String(rawModel ?? '').trim()
        // An entry with nothing in it at all is a schema artefact — an
        // empty `services[]` slot left by an earlier edit.
        if (!clientKey && !name && !service && !model) return
        rows.push({
            clientKey: clientKey || UNASSIGNED,
            clientName: name,
            service,
            serviceModel: model,
            serviceMappingId: idOf(rawMapping),
        })
    }

    push(entry.clientId, entry.clientName, entry.serviceMappingId, entry.serviceModel)
    const extra = Array.isArray(entry.services) ? entry.services : []
    extra.forEach((item) => push(item?.clientId, item?.clientName, item?.serviceMappingId, item?.serviceModel))

    // A user with no client at all still belongs in the report under
    // "No client assigned" — dropping them would make the totals lie.
    if (!rows.length) rows.push({ clientKey: UNASSIGNED, clientName: '', service: '', serviceModel: '', serviceMappingId: '' })

    // Two identical enrolments (the legacy pair duplicated into services[])
    // is one enrolment as far as the reader is concerned.
    const seen = new Set<string>()
    return rows.filter((row) => {
        const key = `${row.clientKey}|${row.service}|${row.serviceModel}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}

const roleName = (role: UserRecord['role']): string => {
    if (!role) return ''
    if (typeof role === 'string') return role
    return role.renameRole || role.originalRole || ''
}
const roleId = (role: UserRecord['role']): string => {
    if (!role) return ''
    if (typeof role === 'string') return role
    return role._id || ''
}

/** The chips the "Showing:" row can carry — one per filter, keyed by the
 *  draft field. */
type ChipKey = keyof Draft

export default function UserReportPage() {
    const [draft, setDraft] = useState<Draft>({ ...EMPTY })
    const { isFresh, seen: nudgeSeen, markGenerated, markSeen, clear: clearGenerated } = useNextStepNudge(draft)
    const [snapshot, setSnapshot] = useState<{ draft: Draft; rows: UserRecord[]; serviceIndex: ServiceIndexEntry[]; generated: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [printModalOpen, setPrintModalOpen] = useState(false)

    /* ── Auth ── The institution and token the users endpoint needs.
     *  Read from localStorage on mount, the same shape the rest of the
     *  page uses. Absent when the reader is not signed in — the query
     *  stays disabled until both are present. */
    const [institutionId, setInstitutionId] = useState<string | null>(null)
    const [token, setToken] = useState<string | null>(null)
    useEffect(() => {
        if (typeof window === 'undefined') return
        setInstitutionId(localStorage.getItem('smartcliff_institution'))
        setToken(localStorage.getItem('smartcliff_token'))
    }, [])

    /* ── The full users export. Shares its own cache entry — pulling the
     *  whole directory a second time when the Print modal opens would
     *  be wasteful. `enabled` waits for the auth pair to arrive. */
    const { data: exportRes, isLoading: usersLoading } = useQuery({
        queryKey: ['usermanagement', 'reportExport', institutionId] as const,
        queryFn: async () => {
            if (!institutionId || !token) return { rows: [] as UserRecord[], serviceIndex: [] as ServiceIndexEntry[] }
            const rows = await fetchUsersForExport(institutionId, token, {}) as UserRecord[] & { serviceIndex?: ServiceIndexEntry[] }
            const serviceIndex = Array.isArray(rows.serviceIndex) ? rows.serviceIndex : []
            return { rows: rows as UserRecord[], serviceIndex }
        },
        enabled: Boolean(institutionId && token),
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
    const users: UserRecord[] = useMemo(() => exportRes?.rows ?? [], [exportRes])
    const serviceIndex: ServiceIndexEntry[] = useMemo(() => exportRes?.serviceIndex ?? [], [exportRes])

    const { data: clientList } = useClients()
    const clientById = useMemo(() => {
        const map = new Map<string, Client>()
        for (const client of clientList ?? []) map.set(String(client._id), client)
        return map
    }, [clientList])

    /* ── Mapping lookup for Course and Providing Year ─────────────────
     *  A user's enrolment carries a serviceMappingId; the mapping
     *  carries the "Providing Year" and the list of courses it teaches.
     *  Same pattern Course Setup ▸ Report uses (CourseReportPage), so
     *  both reports read the same source of truth. */
    const { data: mappings } = useServiceMappings()
    const mappingById = useMemo(() => {
        const map = new Map<string, ServiceMapping>()
        for (const mapping of mappings ?? []) map.set(String(mapping._id), mapping)
        return map
    }, [mappings])

    /* ── The letterhead a designed export prints. Same pattern as the
     *  course-structure report — one fetch per mount, silent fall-back
     *  to the built-in layout / brand wording when neither exists. */
    const [reportSettings, setReportSettings] = useState<ReportSettings | undefined>()
    const [letterhead, setLetterhead] = useState<{ org: string; address: string; contact: string }>(BRAND_FALLBACK)
    useEffect(() => {
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
                    address: institution?.address?.trim() || '',
                    contact: institution?.phone?.trim() || '',
                })
            })
            .catch(() => { /* fallback wording */ })
        return () => { cancelled = true }
    }, [institutionId])

    /* ── Facet options ────────────────────────────────────────────────
     *  Every unique role / service / model / status / client the loaded
     *  export contains. Client labels come from the clients query so
     *  the dropdown shows the company name rather than the raw id. */
    const resolveServiceFor = useMemo(() => serviceResolver(serviceIndex), [serviceIndex])
    const options = useMemo(() => {
        const roleIds = new Map<string, string>()
        const services = new Set<string>()
        const serviceModels = new Set<string>()
        const statuses = new Set<string>()
        const clientIds = new Set<string>()
        // Course + Providing Year come off the SERVICE MAPPING each user is
        // enrolled with, not off the user record. Following each user's
        // serviceMappingId into mappingById gives the mapping's `year` and
        // `courses[]` — the same source of truth Course Setup ▸ Report reads.
        const providingYears = new Set<string>()
        const courseNames = new Map<string, string>() // key: lower-case name, value: display name
        for (const user of users) {
            const rId = roleId(user.role)
            const rName = roleName(user.role)
            if (rId && !roleIds.has(rId)) roleIds.set(rId, rName || rId)
            const status = String(user.status || '').trim()
            if (status) statuses.add(status)
            for (const enrolment of enrolmentsOf(user)) {
                if (enrolment.clientKey && enrolment.clientKey !== UNASSIGNED) clientIds.add(enrolment.clientKey)
                const svc = enrolment.service || resolveServiceFor(enrolment.clientKey, enrolment.serviceModel)
                if (svc) services.add(svc)
                if (enrolment.serviceModel) serviceModels.add(enrolment.serviceModel)
                const mapping = enrolment.serviceMappingId ? mappingById.get(enrolment.serviceMappingId) : undefined
                if (mapping) {
                    const year = String(mapping.year ?? '').trim()
                    if (year) providingYears.add(year)
                    for (const course of mapping.courses ?? []) {
                        const name = String(course.courseName ?? '').trim()
                        if (!name) continue
                        const key = name.toLowerCase()
                        if (!courseNames.has(key)) courseNames.set(key, name)
                    }
                }
            }
        }
        const clientOpts = [...clientIds].map((id) => {
            const record = clientById.get(id)
            return { value: id, label: record?.clientCompany || id }
        }).sort((a, b) => a.label.localeCompare(b.label))
        return {
            roles: [...roleIds.entries()].map(([id, label]) => ({ value: id, label }))
                .sort((a, b) => a.label.localeCompare(b.label)),
            services: [...services].sort().map((value) => ({ value, label: value })),
            serviceModels: [...serviceModels].sort().map((value) => ({ value, label: value })),
            statuses: [...statuses].sort().map((value) => ({ value, label: capitalise(value) })),
            clients: clientOpts,
            providingYears: [...providingYears].sort().map((value) => ({ value, label: value })),
            courses: [...courseNames.entries()]
                .map(([value, label]) => ({ value, label }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        }
    }, [users, clientById, resolveServiceFor, mappingById])

    /* ── Seed every filter as "everything selected" once the users have
     *  loaded, so pressing Generate right away answers "show me the
     *  whole directory" without any setup. Seeded once. */
    const seeded = useRef(false)
    useEffect(() => {
        if (seeded.current || !users.length) return
        seeded.current = true
        setDraft((d) => ({
            ...d,
            roles: options.roles.map((o) => o.value),
            services: options.services.map((o) => o.value),
            serviceModels: options.serviceModels.map((o) => o.value),
            statuses: options.statuses.map((o) => o.value),
            clients: options.clients.map((o) => o.value),
            providingYears: options.providingYears.map((o) => o.value),
            courses: options.courses.map((o) => o.value),
        }))
    }, [users.length, options.roles, options.services, options.serviceModels, options.statuses, options.clients, options.providingYears, options.courses])

    const hasDraft = Boolean(
        draft.roles.length || draft.services.length || draft.serviceModels.length
        || draft.statuses.length || draft.clients.length
        || draft.providingYears.length || draft.courses.length,
    )

    /** Builds the snapshot from `source` (the current draft unless a chip
     *  removal hands in the next one before state has settled). */
    const generate = useCallback((source?: Draft) => {
        const from = source ?? draft
        setLoading(true)
        setError('')
        const asked: Draft = { ...from }
        try {
            // "Everything ticked" collapses to "no narrowing" so the
            // filter is a real narrowing, not a set-equality check.
            const roleSet = asked.roles.length && asked.roles.length < options.roles.length
                ? new Set(asked.roles) : null
            const serviceSet = asked.services.length && asked.services.length < options.services.length
                ? new Set(asked.services) : null
            const modelSet = asked.serviceModels.length && asked.serviceModels.length < options.serviceModels.length
                ? new Set(asked.serviceModels) : null
            const statusSet = asked.statuses.length && asked.statuses.length < options.statuses.length
                ? new Set(asked.statuses) : null
            const clientSet = asked.clients.length && asked.clients.length < options.clients.length
                ? new Set(asked.clients) : null
            const yearSet = asked.providingYears.length && asked.providingYears.length < options.providingYears.length
                ? new Set(asked.providingYears) : null
            const courseSet = asked.courses.length && asked.courses.length < options.courses.length
                ? new Set(asked.courses) : null

            const rows = users.filter((user) => {
                if (roleSet && !roleSet.has(roleId(user.role))) return false
                if (statusSet && !statusSet.has(String(user.status || ''))) return false
                if (clientSet || serviceSet || modelSet || yearSet || courseSet) {
                    // The user's enrolments must include at least one that
                    // matches every enrolment-scoped filter simultaneously.
                    const matches = enrolmentsOf(user).some((enrolment) => {
                        if (clientSet && !clientSet.has(enrolment.clientKey)) return false
                        const svc = enrolment.service || resolveServiceFor(enrolment.clientKey, enrolment.serviceModel)
                        if (serviceSet && !serviceSet.has(svc)) return false
                        if (modelSet && !modelSet.has(enrolment.serviceModel)) return false
                        // Year + Course come off the enrolment's SERVICE
                        // MAPPING — same source of truth the option list uses.
                        if (yearSet || courseSet) {
                            const mapping = enrolment.serviceMappingId ? mappingById.get(enrolment.serviceMappingId) : undefined
                            if (yearSet) {
                                const year = String(mapping?.year ?? '').trim()
                                if (!year || !yearSet.has(year)) return false
                            }
                            if (courseSet) {
                                const teaches = (mapping?.courses ?? []).some((course) => {
                                    const key = String(course.courseName ?? '').trim().toLowerCase()
                                    return key && courseSet.has(key)
                                })
                                if (!teaches) return false
                            }
                        }
                        return true
                    })
                    if (!matches) return false
                }
                return true
            })

            setSnapshot({ draft: asked, rows, serviceIndex, generated: new Date().toLocaleString() })
            markGenerated(from)
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : 'Could not build the report. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [draft, markGenerated, users, serviceIndex, resolveServiceFor, mappingById, options.roles.length, options.services.length, options.serviceModels.length, options.statuses.length, options.clients.length, options.providingYears.length, options.courses.length])

    /* ── Group into per-client blocks with rowspan-friendly shape ──── */
    const generatedTimestamp = snapshot?.generated ?? ''
    const report = useMemo(() => {
        if (!snapshot) return null
        const resolveService = serviceResolver(snapshot.serviceIndex)
        type Node = { clientKey: string; clientName: string; rows: { user: UserRecord; enrolment: Enrolment; service: string }[] }
        const byClient = new Map<string, Node>()
        for (const user of snapshot.rows) {
            const enrolments = enrolmentsOf(user).filter((enrolment) => {
                const asked = snapshot.draft
                if (asked.clients.length && asked.clients.length < options.clients.length
                    && !asked.clients.includes(enrolment.clientKey)) return false
                const svc = enrolment.service || resolveService(enrolment.clientKey, enrolment.serviceModel)
                if (asked.services.length && asked.services.length < options.services.length
                    && !asked.services.includes(svc)) return false
                if (asked.serviceModels.length && asked.serviceModels.length < options.serviceModels.length
                    && !asked.serviceModels.includes(enrolment.serviceModel)) return false
                const narrowedYear = asked.providingYears.length && asked.providingYears.length < options.providingYears.length
                const narrowedCourse = asked.courses.length && asked.courses.length < options.courses.length
                if (narrowedYear || narrowedCourse) {
                    const mapping = enrolment.serviceMappingId ? mappingById.get(enrolment.serviceMappingId) : undefined
                    if (narrowedYear) {
                        const year = String(mapping?.year ?? '').trim()
                        if (!year || !asked.providingYears.includes(year)) return false
                    }
                    if (narrowedCourse) {
                        const teaches = (mapping?.courses ?? []).some((course) => {
                            const key = String(course.courseName ?? '').trim().toLowerCase()
                            return key && asked.courses.includes(key)
                        })
                        if (!teaches) return false
                    }
                }
                return true
            })
            if (!enrolments.length) continue
            for (const enrolment of enrolments) {
                const clientKey = enrolment.clientKey || UNASSIGNED
                const clientRecord = clientById.get(clientKey)
                const name = clientRecord?.clientCompany
                    || enrolment.clientName
                    || (clientKey === UNASSIGNED ? 'No client assigned' : 'Unnamed client')
                const node = byClient.get(clientKey) || { clientKey, clientName: name, rows: [] }
                const svc = enrolment.service || resolveService(clientKey, enrolment.serviceModel)
                node.rows.push({ user, enrolment, service: svc })
                byClient.set(clientKey, node)
            }
        }

        const blocks: ReportClientBlock[] = [...byClient.values()]
            .sort((a, b) => {
                if (a.clientKey === UNASSIGNED) return 1
                if (b.clientKey === UNASSIGNED) return -1
                return a.clientName.localeCompare(b.clientName)
            })
            .map((node) => {
                const clientRecord = clientById.get(node.clientKey)
                const rawBusiness = clientRecord?.businessModel || ''
                const business = rawBusiness
                    ? businessModelDisplayName(rawBusiness) || rawBusiness
                    : 'No business model'
                const addressParts = parseClientAddress(clientRecord?.clientAddress || '')
                const clientExtras: Record<string, string> = {
                    clientId: clientRecord?.clientId || '—',
                    businessModel: business,
                    clientStatus: clientRecord?.status ? capitalise(clientRecord.status) : '—',
                    address: clientRecord?.clientAddress || '—',
                    addressLine: addressParts.line || '—',
                    city: addressParts.city || '—',
                    state: addressParts.state || '—',
                    pincode: addressParts.pincode || '—',
                }
                const services: Record<string, string>[] = [...node.rows]
                    .sort((a, b) => {
                        const na = `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim().toLowerCase()
                        const nb = `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim().toLowerCase()
                        return na.localeCompare(nb)
                    })
                    .map((row) => {
                        const first = String(row.user.firstName || '').trim()
                        const last = String(row.user.lastName || '').trim()
                        const fullName = `${first} ${last}`.trim()
                        return {
                            userName: fullName || '—',
                            userEmail: String(row.user.email || '').trim() || '—',
                            userPhone: String(row.user.phone || '').trim() || '—',
                            userRole: roleName(row.user.role) || '—',
                            userStatus: row.user.status ? capitalise(String(row.user.status)) : '—',
                            service: row.service ? displayLabel(row.service) : '—',
                            serviceModel: row.enrolment.serviceModel
                                ? displayLabel(row.enrolment.serviceModel) : '—',
                            generatedDate: generatedTimestamp,
                        }
                    })
                return { client: node.clientName, business, clientExtras, services }
            })

        return { blocks }
    }, [snapshot, clientById, generatedTimestamp, mappingById, options.clients.length, options.services.length, options.serviceModels.length, options.providingYears.length, options.courses.length])

    const totalRows = report?.blocks.reduce((sum, block) => sum + block.services.length, 0) ?? 0

    const reset = () => {
        setDraft({
            ...EMPTY,
            roles: options.roles.map((o) => o.value),
            services: options.services.map((o) => o.value),
            serviceModels: options.serviceModels.map((o) => o.value),
            statuses: options.statuses.map((o) => o.value),
            clients: options.clients.map((o) => o.value),
            providingYears: options.providingYears.map((o) => o.value),
            courses: options.courses.map((o) => o.value),
        })
        setSnapshot(null)
        clearGenerated()
        setError('')
        setLoading(false)
    }

    /* ── The design the print modal opens on ─────────────────────── */
    const initialFormat: ReportFormat = useMemo(
        () => activeFormat(reportSettings) ?? newFormat('Report layout', false),
        [reportSettings],
    )

    /* ── The "Filtered by …" line the printed sheet carries ───────── */
    const filterSummary = useMemo(() => {
        if (!snapshot) return ''
        const asked = snapshot.draft
        const parts: string[] = []
        const roleLabelFor = (id: string) => options.roles.find((o) => o.value === id)?.label || id
        const describe = (label: string, values: string[], total: number, formatter?: (value: string) => string) => {
            if (!values.length || values.length >= total) return
            const format = formatter ?? displayLabel
            parts.push(values.length <= 4
                ? `${label}: ${values.map(format).join(', ')}`
                : `${label}: ${values.slice(0, 3).map(format).join(', ')} +${values.length - 3} more`)
        }
        const courseLabelFor = (value: string) => options.courses.find((o) => o.value === value)?.label || value
        describe('Business Model', asked.services, options.services.length)
        describe('Providing Year', asked.providingYears, options.providingYears.length, (v) => v)
        describe('Service Model', asked.serviceModels, options.serviceModels.length)
        describe('Course', asked.courses, options.courses.length, courseLabelFor)
        describe('Role', asked.roles, options.roles.length, roleLabelFor)
        describe('Status', asked.statuses, options.statuses.length, capitalise)
        return parts.length ? `Filtered by  ·  ${parts.join('  ·  ')}` : ''
    }, [snapshot, options.roles, options.services.length, options.serviceModels.length, options.statuses.length, options.providingYears.length, options.courses])

    /* ── "Showing:" chips — read off the GENERATED snapshot ────────── */
    const showingChips = useMemo((): ReportChip<ChipKey>[] => {
        if (!snapshot) return []
        const asked = snapshot.draft
        const chip = (key: ChipKey, title: string, allWord: string, opts: { value: string; label: string }[]): ReportChip<ChipKey> => {
            const values = asked[key]
            const narrowed = values.length > 0 && values.length < opts.length
            const labelOf = new Map(opts.map((o) => [o.value, o.label]))
            return { key, title, narrowed, label: chipLabel(values.map((v) => displayLabel(labelOf.get(v) || v)), narrowed, allWord) }
        }
        return [
            chip('services', 'Business Model', 'All Business Models', options.services),
            chip('providingYears', 'Service Providing Year', 'All Years', options.providingYears),
            chip('serviceModels', 'Service Model', 'All Service Models', options.serviceModels),
            chip('clients', 'Client', 'All Clients', options.clients),
            chip('courses', 'Course', 'All Courses', options.courses),
            chip('roles', 'Role', 'All Roles', options.roles),
            chip('statuses', 'Status', 'All Statuses', options.statuses),
        ]
    }, [snapshot, options])

    /** × on a chip: drop that one filter from the generated scope and
     *  regenerate, so the table and chips update together. */
    const clearFilter = (key: ChipKey) => {
        if (!snapshot) return
        const next: Draft = { ...snapshot.draft, [key]: options[key].map((o) => o.value) }
        setDraft(next)
        generate(next)
    }

    /** Preview Report opens the preview modal (it carries the Print
     *  action); opening it ends the next-step glow. */
    const openPreview = () => {
        markSeen()
        setPrintModalOpen(true)
    }

    /** One row per user, across every client block, for the table + pager. */
    const userRows = useMemo(() => report?.blocks.flatMap((block) => block.services) ?? [], [report])
    const paged = usePaged(userRows)
    const nudge = isFresh && totalRows > 0 && !nudgeSeen

    const printMeta = useMemo(() => ({
        title: 'Users report',
        scope: report
            ? `${report.blocks.length} client${report.blocks.length === 1 ? '' : 's'}  ·  ${totalRows} user${totalRows === 1 ? '' : 's'}`
            : '',
        generated: snapshot?.generated ?? '',
        filters: filterSummary,
        ...letterhead,
    }), [snapshot, report, totalRows, letterhead, filterSummary])

    return (
        <>
            <motion.div variants={pageEnter} initial="hidden" animate="visible" className={`flex h-full min-h-0 min-w-0 flex-col ${REPORT_PAGE_BG}`}>
                <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-4 sm:px-6 md:px-8">

                    {/* ── Heading + scope form ─────────────────────────────
                        Same flat layout as Course Management ▸ Report (see
                        shared/report/reportKit). Filter order mirrors the
                        Users tab's filter panel: Business Model → Service
                        Providing Year → Service Model → Client → Course →
                        Role, with Status kept at the end. */}
                    <div className="no-print shrink-0">
                        <ReportHeading />

                        <div className="mt-4 grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={Store} tone="text-brand-500">Business Model</FilterLabel>
                                <MappingMultiFilter
                                    label="Business Models"
                                    options={options.services}
                                    value={draft.services}
                                    onChange={(services) => setDraft((d) => ({ ...d, services }))}
                                    placeholder="All business models"
                                />
                            </div>
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={CalendarDays} tone="text-violet-500">Service Providing Year</FilterLabel>
                                <MappingMultiFilter
                                    label="Years"
                                    options={options.providingYears}
                                    value={draft.providingYears}
                                    onChange={(providingYears) => setDraft((d) => ({ ...d, providingYears }))}
                                    placeholder="All years"
                                />
                            </div>
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={Settings2} tone="text-brand-500">Service Model</FilterLabel>
                                <MappingMultiFilter
                                    label="Service Models"
                                    options={options.serviceModels}
                                    value={draft.serviceModels}
                                    onChange={(serviceModels) => setDraft((d) => ({ ...d, serviceModels }))}
                                    placeholder="All service models"
                                />
                            </div>
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={UsersRound} tone="text-emerald-500">Client</FilterLabel>
                                <MappingMultiFilter
                                    label="Clients"
                                    options={options.clients}
                                    value={draft.clients}
                                    onChange={(clients) => setDraft((d) => ({ ...d, clients }))}
                                    placeholder="All clients"
                                />
                            </div>
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={BookOpen} tone="text-violet-500">Course</FilterLabel>
                                <MappingMultiFilter
                                    label="Courses"
                                    options={options.courses}
                                    value={draft.courses}
                                    onChange={(courses) => setDraft((d) => ({ ...d, courses }))}
                                    placeholder="All courses"
                                />
                            </div>
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={ShieldCheck} tone="text-sky-500">Role</FilterLabel>
                                <MappingMultiFilter
                                    label="Roles"
                                    options={options.roles}
                                    value={draft.roles}
                                    onChange={(roles) => setDraft((d) => ({ ...d, roles }))}
                                    placeholder="All roles"
                                />
                            </div>
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={Activity} tone="text-pink-500">Status</FilterLabel>
                                <MappingMultiFilter
                                    label="Statuses"
                                    options={options.statuses}
                                    value={draft.statuses}
                                    onChange={(statuses) => setDraft((d) => ({ ...d, statuses }))}
                                    placeholder="All statuses"
                                />
                            </div>
                        </div>

                        <ReportActionRow
                            onReset={reset}
                            resetDisabled={loading || (!hasDraft && !snapshot)}
                            onPreview={openPreview}
                            previewDisabled={!snapshot || !totalRows}
                            nudge={nudge}
                            onGenerate={() => generate()}
                            generateDisabled={loading || usersLoading}
                            loading={loading}
                        />
                    </div>

                    {/* ── The report ───────────────────────────────────────
                        Flex column so the table can claim every pixel
                        remaining below the form. Only the table body
                        scrolls; the outer container is not scrollable so
                        the reader never sees a nested pair of scrollbars. */}
                    <div className="mt-4 min-h-0 flex-1 flex flex-col">
                        {error && (
                            <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-50 p-3 text-sm text-danger-700">
                                {error}
                                <Button variant="outline" size="sm" className="text-xs" onClick={() => generate()}>Retry</Button>
                            </div>
                        )}

                        {!snapshot && !loading && !error && <ReportEmptyState />}

                        {loading && !snapshot && (
                            <div role="status" aria-label="Generating report" className="space-y-3">
                                {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-ink-100" />)}
                            </div>
                        )}

                        {snapshot && report && (
                            <div className={`flex flex-1 min-h-0 flex-col transition-opacity ${loading ? 'opacity-50' : ''}`}>
                                <ReportShowingRow
                                    chips={showingChips}
                                    onRemove={clearFilter}
                                    loading={loading}
                                />

                                {!totalRows ? <ReportNoMatches /> : (
                                    <div className={REPORT_TABLE_CARD}>
                                        <div className="min-h-0 flex-1 overflow-auto">
                                            <table className="w-full min-w-[680px] lg:min-w-0 table-fixed border-collapse text-xs">
                                                {/* Six columns — the user-scope default
                                                    set: S. No. / User Name / Email / Phone /
                                                    Role / Status. Client and Business Model
                                                    are OFF by default; the reader ticks them
                                                    in Customize Fields for the printed sheet.
                                                    Every user is its own row and S. No.
                                                    Widths sum to 100. */}
                                                <colgroup>
                                                    <col style={{ width: '6%' }} />
                                                    <col style={{ width: '22%' }} />
                                                    <col style={{ width: '26%' }} />
                                                    <col style={{ width: '16%' }} />
                                                    <col style={{ width: '18%' }} />
                                                    <col style={{ width: '12%' }} />
                                                </colgroup>
                                                <thead>
                                                    <tr>
                                                        <th className={`${REPORT_TH} border-r text-center`}>S. No.</th>
                                                        <th className={`${REPORT_TH} border-r text-left`}>User Name</th>
                                                        <th className={`${REPORT_TH} border-r text-left`}>Email</th>
                                                        <th className={`${REPORT_TH} border-r text-left`}>Phone</th>
                                                        <th className={`${REPORT_TH} border-r text-left`}>Role</th>
                                                        <th className={`${REPORT_TH} text-center`}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paged.items.map((svc, idx) => (
                                                        <tr key={paged.start + idx} className={`${reportRowRule(false)} ${REPORT_ROW_HOVER}`}>
                                                            <td className={`${REPORT_TD} text-center tabular-nums text-subtle`}>{paged.start + idx + 1}</td>
                                                            <td className={`${REPORT_TD} font-medium text-heading`} style={REPORT_WRAP}>{svc.userName || '—'}</td>
                                                            <td className={`${REPORT_TD} text-body`} style={REPORT_WRAP}>{svc.userEmail || '—'}</td>
                                                            <td className={`${REPORT_TD} text-body`} style={REPORT_WRAP}>{svc.userPhone || '—'}</td>
                                                            <td className={`${REPORT_TD} text-body`} style={REPORT_WRAP}>{svc.userRole || '—'}</td>
                                                            <td className="px-3 py-2.5 text-center align-middle text-body">{svc.userStatus || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <ReportPager paged={paged} noun="users" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ── Print Preview modal — the same shared modal Business
                Reports and Course Setup ▸ Report use, with the Users-
                report field list. */}
            <PrintPreviewModal
                open={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                snapshot={snapshot ? { draft: snapshot.draft, rows: [] as ServiceMapping[], generated: snapshot.generated } : null}
                blocks={report?.blocks ?? []}
                letterhead={letterhead}
                initialFormat={initialFormat}
                meta={printMeta}
                fields={USER_FIELDS}
                defaultEnabled={USER_DEFAULT_ENABLED}
            />
        </>
    )
}
