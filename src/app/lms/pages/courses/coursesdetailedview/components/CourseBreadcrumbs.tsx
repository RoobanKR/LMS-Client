// components/CourseBreadcrumbs.tsx
//
// The course view's "Dashboard › My Courses › <course>" trail — the same look
// as Upload Resources' breadcrumb row (orange links, the current page in slate,
// chevrons between), so the trainer's and the learner's course screens read
// alike.
import React from "react"
import { ChevronRight } from "lucide-react"
import { T } from "./types/constants"

export interface CourseCrumb {
  label: string
  icon?: React.ComponentType<any>
  onClick?: () => void
}

const LINK = "#F97316"
const LINK_HOVER = "#EA580C"
const CURRENT = "#475569"
const MUTED = "#94A3B8"

export const CourseBreadcrumbs: React.FC<{ items: CourseCrumb[]; right?: React.ReactNode }> = ({ items, right }) => {
  if (!items.length && !right) return null
  return (
    // The row is positioned above the tab bar so a dropdown from `right`
    // (Notifications) opens over the page instead of under it.
    <div
      className="relative z-30 flex items-center flex-shrink-0"
      style={{
        paddingInline: "clamp(16px, 2vw, 32px)",
        minHeight: 48,
        gap: 12,
        background: T.bg,
      }}
    >
    <nav
      aria-label="Breadcrumb"
      className="flex flex-1 items-center min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gap: 2 }}
    >
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1
        const Icon = crumb.icon
        const color = isLast ? CURRENT : LINK
        return (
          <div key={`${crumb.label}-${i}`} className="flex items-center min-w-0">
            <button
              type="button"
              onClick={crumb.onClick}
              disabled={!crumb.onClick}
              aria-current={isLast ? "page" : undefined}
              className="group flex items-center min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              style={{
                gap: 6,
                padding: "3px 6px",
                background: "transparent",
                border: "none",
                cursor: crumb.onClick ? "pointer" : "default",
                color,
              }}
              onMouseEnter={(e) => {
                if (isLast || !crumb.onClick) return
                e.currentTarget.style.color = LINK_HOVER
              }}
              onMouseLeave={(e) => {
                if (isLast || !crumb.onClick) return
                e.currentTarget.style.color = LINK
              }}
            >
              {Icon && <Icon size={13} strokeWidth={2} className="flex-shrink-0" />}
              <span
                className={`truncate ${!isLast && crumb.onClick ? "group-hover:underline" : ""}`}
                style={{
                  maxWidth: isLast ? 360 : 200,
                  fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif",
                  fontWeight: isLast ? 600 : 500,
                  fontSize: 12.5,
                  letterSpacing: "-0.005em",
                  lineHeight: 1.2,
                }}
              >
                {crumb.label}
              </span>
            </button>
            {!isLast && <ChevronRight size={12} strokeWidth={2} className="flex-shrink-0" style={{ color: MUTED, margin: "0 2px" }} />}
          </div>
        )
      })}
    </nav>
    {/* Notes and Notifications sit at the row's end. */}
    {right && <div className="ml-auto flex flex-shrink-0 items-center">{right}</div>}
    </div>
  )
}
