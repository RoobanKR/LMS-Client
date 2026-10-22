"use client"

// Self-service profile editor: photo and password ONLY.
//
// Everything else on the profile (name, email, role, placement) is owned by
// User Management — it decides who a person is in the institution, so it is not
// editable from the person's own page. These two are the exceptions: a photo is
// cosmetic, and a password is the one field only its owner should set.

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Camera, Eye, EyeOff, Loader2, Undo2, X } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getToken } from "@/lib/session"
import { cn } from "@/lib/utils"
import { updateMyProfile } from "@/app/lms/pages/usermanagement/api/userService"

// Matches what the server's Supabase upload will accept, and keeps a 20 MB
// camera roll photo from being sent only to be rejected.
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]

interface Props {
  open: boolean
  onClose: () => void
  user: { _id: string; firstName: string; lastName: string; email: string; profile?: string }
  /** Called with the server's updated user so the page (and localStorage) can
   *  pick up the new photo without a reload. */
  onUpdated: (patch: { profile?: string; updatedAt?: string }) => void
}

const FIELD_CLS =
  "w-full h-10 rounded-control border bg-surface px-3 pr-10 text-sm text-heading " +
  "placeholder:text-faint focus:outline-none focus:ring-2 transition-colors"

/** A password input with a show / hide toggle, and one line under it: the
 *  field's problem in red, or a neutral hint. */
function PasswordField({
  id, label, value, onChange, placeholder, autoComplete, error, hint,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void
  placeholder: string; autoComplete: string; error?: string; hint?: string
}) {
  const [show, setShow] = useState(false)
  const message = error || hint
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-body">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? `${id}-msg` : undefined}
          className={cn(
            FIELD_CLS,
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
              : "border-field hover:border-field-hover focus:border-brand focus:ring-brand/15"
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-subtle transition-colors hover:text-heading"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {message && (
        <p id={`${id}-msg`} className={cn("mt-1 text-xs", error ? "text-red-600 dark:text-red-400" : "text-subtle")}>
          {message}
        </p>
      )}
    </div>
  )
}

export default function EditProfileModal({ open, onClose, user, onUpdated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  // Reset on every open so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (!open) return
    setPhoto(null); setPreview(null)
    setCurrent(""); setNext(""); setConfirm("")
    setSaving(false); setConfirmDiscard(false)
    if (fileRef.current) fileRef.current.value = ""
  }, [open])

  // Object URLs are a leak if they are never revoked; tie each one's life to
  // the File it was made from.
  useEffect(() => {
    if (!photo) { setPreview(null); return }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const pickPhoto = (f: File | null) => {
    if (!f) return
    if (!PHOTO_TYPES.includes(f.type)) {
      toast.error(`${f.name} — must be a JPG, PNG or WebP image`, { position: "top-right" })
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    if (f.size > MAX_PHOTO_BYTES) {
      toast.error(`${f.name} — larger than the 5MB limit`, { position: "top-right" })
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    setPhoto(f)
  }

  const wantsPassword = Boolean(current || next || confirm)
  const isDirty = Boolean(photo) || wantsPassword

  // One reason string, so the button's disabled state and the hint under the
  // form can never disagree about why saving is blocked.
  const blocked = (() => {
    if (!isDirty) return "Choose a new photo or set a new password."
    if (wantsPassword) {
      if (!current) return "Enter your current password."
      if (!next) return "Enter a new password."
      if (next.length < 8) return "New password must be at least 8 characters."
      if (next === current) return "New password must differ from the current one."
      if (next !== confirm) return "New password and confirmation do not match."
    }
    return null
  })()

  // Shown under the field as the student types, so a problem is pointed at
  // where it is rather than only in the footer.
  const nextError = next && next.length < 8
    ? "Use at least 8 characters."
    : next && current && next === current
      ? "Choose a password different from your current one."
      : ""
  const confirmError = confirm && next && confirm !== next ? "Passwords don't match." : ""

  const handleSave = async () => {
    if (blocked) return
    const token = getToken()
    if (!token) { toast.error("Session ended — please log in again", { position: "top-right" }); return }

    setSaving(true)
    try {
      const res = await updateMyProfile(
        {
          photo,
          ...(wantsPassword ? { currentPassword: current, newPassword: next } : {}),
        },
        token
      )
      toast.success(res?.message?.[0]?.value || "Profile updated", { position: "top-right" })
      onUpdated({ profile: res?.user?.profile, updatedAt: res?.user?.updatedAt })
      onClose()
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile", { position: "top-right" })
    } finally {
      setSaving(false)
    }
  }

  const requestClose = () => {
    if (saving) return
    if (isDirty) { setConfirmDiscard(true); return }
    onClose()
  }

  const shownImage = preview || (user.profile && user.profile !== "default" ? user.profile : null)
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) requestClose() }}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-[760px] p-0 gap-0 overflow-hidden rounded-xl"
      >
        <DialogHeader className="border-b border-hairline px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-left">
              <DialogTitle className="text-base font-semibold text-heading">Edit profile</DialogTitle>
              <DialogDescription className="mt-1 text-[13px] leading-relaxed text-subtle">
                Change your profile photo or password. Your name, email and role are managed by your administrator.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              aria-label="Close"
              title="Close"
              className="-mr-1.5 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-control text-subtle transition-colors hover:bg-row-hover hover:text-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {/* md+: photo on the left, password on the right — everything in view,
            no scrolling. Phones stack the two and scroll. */}
        <div className="max-h-[70dvh] overflow-y-auto divide-y divide-hairline md:max-h-none md:overflow-visible md:grid md:grid-cols-[280px_minmax(0,1fr)] md:divide-y-0 md:divide-x">

          {/* ── Photo ── */}
          <section className="flex flex-col items-center px-6 py-6 text-center">
            <h3 className="self-stretch text-left text-sm font-semibold text-heading md:text-center">Profile photo</h3>
            <div className="mt-4 grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-surface-sunken ring-1 ring-hairline">
              {shownImage ? (
                // A plain <img> for the blob: preview — next/image would
                // need the object URL whitelisted as a remote pattern.
                preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="New profile photo" className="h-full w-full object-cover" />
                ) : (
                  <Image src={shownImage} alt={user.firstName} width={128} height={128} className="h-full w-full object-cover" />
                )
              ) : (
                <span className="text-3xl font-semibold text-body">{initials}</span>
              )}
            </div>
            <p className="mt-3 max-w-full truncate text-sm font-medium text-heading">{user.firstName} {user.lastName}</p>
            <p className="max-w-full truncate text-xs text-subtle">{user.email}</p>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0] || null)}
            />
            <div className="mt-4 flex w-full flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
              >
                <Camera className="h-3.5 w-3.5" /> {shownImage ? "Change photo" : "Upload photo"}
              </Button>
              {photo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = "" }}
                  disabled={saving}
                >
                  <Undo2 className="h-3.5 w-3.5" /> Undo
                </Button>
              )}
            </div>
            <p className="mt-2 max-w-full truncate text-xs text-subtle">
              {photo ? `Selected: ${photo.name}` : "JPG, PNG or WebP, up to 5 MB."}
            </p>
          </section>

          {/* ── Password ── */}
          <section className="px-6 py-6">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-semibold text-heading">Change password</h3>
              <span className="text-xs text-subtle">Optional</span>
            </div>
            <p className="mt-0.5 text-xs text-subtle">Leave these blank to keep your current password.</p>
            <div className="mt-4 space-y-4">
              <PasswordField
                id="profile-current-password"
                label="Current password"
                value={current}
                onChange={setCurrent}
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
              <PasswordField
                id="profile-new-password"
                label="New password"
                value={next}
                onChange={setNext}
                placeholder="Enter a new password"
                autoComplete="new-password"
                error={nextError}
                hint="At least 8 characters."
              />
              <PasswordField
                id="profile-confirm-password"
                label="Confirm new password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Re-enter the new password"
                autoComplete="new-password"
                error={confirmError}
              />
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-hairline bg-surface-sunken/50 px-6 py-3">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            {/* Why Save is off — only once something has been entered. */}
            <p className="min-w-0 flex-1 text-xs text-subtle sm:truncate">{isDirty && blocked ? blocked : ""}</p>
            <div className="flex flex-shrink-0 justify-end gap-2">
              <Button variant="outline" size="sm" onClick={requestClose} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || Boolean(blocked)}>
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : "Save changes"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
      {/* Discard confirmation — only when something has been entered */}
      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent showCloseButton={false} className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Discard these changes?</DialogTitle>
            <DialogDescription>
              {photo && wantsPassword
                ? "Your new photo and password entry will be cleared."
                : photo
                  ? "Your new photo will be cleared."
                  : "Your password entry will be cleared."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => { setConfirmDiscard(false); onClose() }}
            >
              Discard &amp; close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
