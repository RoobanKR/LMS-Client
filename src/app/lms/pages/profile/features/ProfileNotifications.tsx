"use client"

// Notifications on the Profile page — one page at a time from the shared
// notifications service, under the shared ['notifications'] key, so marking
// one read here updates the sidebar's unread badge too.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle, Bell, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink,
  GraduationCap, Info, XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  notificationKeys, notificationsService, type Notification,
} from "@/app/lms/pages/notifications/api/notifications"
import { ACCENT_TEXT, EmptyState, PButton, Panel, Skeleton, fmtDateTime, relTime } from "./profileUi"

const PAGE_SIZE = 10
type Filter = "all" | "unread" | "read"

const TYPE_STYLE: Record<string, { icon: React.ElementType; cls: string }> = {
  success: { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  warning: { icon: AlertTriangle, cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  error: { icon: XCircle, cls: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
  enrollment: { icon: GraduationCap, cls: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" },
  info: { icon: Info, cls: "bg-[#f1eefe] text-[#5b47e0] dark:bg-[#7a6af0]/15 dark:text-[#a396f7]" },
}

/** Where a notification leads, when it says: a link the sender attached, or
 *  the course it is about. */
function destinationOf(n: Notification): string | null {
  const meta: any = n.metadata || {}
  if (typeof meta.redirectUrl === "string" && meta.redirectUrl) return meta.redirectUrl
  const rid: any = n.relatedEntityId
  const id = typeof rid === "string" ? rid : rid?.$oid
  if (n.relatedEntity === "course" && id) return `/lms/pages/courses/coursesdetailedview/${id}`
  if (typeof meta.courseId === "string" && meta.courseId) return `/lms/pages/courses/coursesdetailedview/${meta.courseId}`
  return null
}

export function NotificationsTab() {
  const router = useRouter()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<Filter>("all")
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [...notificationKeys.all, "profile-page", filter, page],
    queryFn: () => notificationsService.fetchNotificationsPage({ page, limit: PAGE_SIZE, filter }),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  })
  const items: Notification[] = query.data?.notifications || query.data?.data || []
  const unread = query.data?.unreadCount ?? 0
  const totalPages = Math.max(1, query.data?.totalPages || 1)

  const refresh = () => qc.invalidateQueries({ queryKey: notificationKeys.all })
  const markOne = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: refresh,
    onError: () => toast.error("Could not mark it as read.", { position: "top-right" }),
  })
  const markAll = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => { toast.success("All notifications marked as read", { position: "top-right" }); refresh() },
    onError: () => toast.error("Could not mark them as read.", { position: "top-right" }),
  })

  const open = (n: Notification) => {
    if (!n.isRead) markOne.mutate(n._id)
    const to = destinationOf(n)
    if (to) router.push(to)
  }

  return (
    <Panel
      icon={Bell}
      title="Notifications"
      subtitle={query.isLoading ? "Loading…" : unread > 0 ? `${unread} unread` : "You're all caught up"}
      action={
        <PButton size="sm" variant="soft" onClick={() => markAll.mutate()} loading={markAll.isPending} disabled={unread === 0}>
          <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
        </PButton>
      }
      bodyClassName="px-0 py-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3">
        <div role="tablist" aria-label="Filter notifications" className="inline-flex rounded-[9px] border border-hairline bg-surface-sunken p-0.5">
          {(["all", "unread", "read"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={filter === k}
              onClick={() => { setFilter(k); setPage(1) }}
              className={cn(
                "h-8 rounded-[7px] px-3 text-[13px] font-medium capitalize transition-colors",
                filter === k ? "bg-surface text-heading shadow-xs" : "text-subtle hover:text-heading",
              )}
            >
              {k}{k === "unread" && unread > 0 ? ` (${unread})` : ""}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => router.push("/lms/pages/notifications")}
          className={cn("inline-flex items-center gap-1 text-[13px] font-medium hover:underline", ACCENT_TEXT)}
        >
          Notification center <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {query.isLoading ? (
        <div className="space-y-4 px-5 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="mt-2 h-3 w-4/5" /></div>
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <EmptyState icon={Bell} title="Couldn't load notifications" text="Check your connection and try again." action={<PButton size="sm" variant="outline" onClick={() => query.refetch()}>Try again</PButton>} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "No unread notifications" : filter === "read" ? "Nothing read yet" : "No notifications yet"}
          text={filter === "all" ? "Updates about your courses, assignments and account appear here." : undefined}
        />
      ) : (
        <ul className={cn("divide-y divide-hairline", query.isFetching && "opacity-70")}>
          {items.map((n) => {
            const t = TYPE_STYLE[n.type] || TYPE_STYLE.info
            const Icon = t.icon
            const to = destinationOf(n)
            return (
              <li key={n._id} className={cn("flex items-start gap-3 px-5 py-3.5", !n.isRead && "bg-[#faf9ff] dark:bg-[#7a6af0]/[0.06]")}>
                <span className={cn("mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-full", t.cls)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className={cn("flex min-w-0 items-center gap-1.5 break-words text-[13px] text-heading", !n.isRead ? "font-semibold" : "font-medium")}>
                      {!n.isRead && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#5b47e0]" aria-label="Unread" />}
                      {n.title || "Notification"}
                    </p>
                    <time className="flex-shrink-0 text-xs text-subtle" title={fmtDateTime(n.createdAt)}>{relTime(n.createdAt)}</time>
                  </div>
                  {n.message && <p className="mt-0.5 break-words text-[13px] leading-relaxed text-body">{n.message}</p>}
                  {(to || !n.isRead) && (
                    <div className="mt-1.5 flex flex-wrap gap-3">
                      {to && (
                        <button type="button" onClick={() => open(n)} className={cn("text-xs font-medium hover:underline", ACCENT_TEXT)}>
                          Open
                        </button>
                      )}
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markOne.mutate(n._id)}
                          disabled={markOne.isPending && markOne.variables === n._id}
                          className="text-xs font-medium text-subtle hover:text-heading hover:underline disabled:opacity-50"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-3">
          <span className="text-xs text-subtle">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <PButton size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </PButton>
            <PButton size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </PButton>
          </div>
        </div>
      )}
    </Panel>
  )
}
