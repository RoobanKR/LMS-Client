"use client"

// The Profile page's focused dialogs: profile photo, password, contact details
// and help & support. All writes go through the self-service endpoint
// (PUT /user/me/profile), which acts only on the signed-in user; name, email,
// role, status and placement stay with User Management.

import { useEffect, useRef, useState } from "react"
import { Camera, Eye, EyeOff, ImageOff, Lock, Mail, Upload } from "lucide-react"
import { toast } from "sonner"
import { getToken } from "@/lib/session"
import { updateMyProfile } from "@/app/lms/pages/usermanagement/api/userService"
import { cn } from "@/lib/utils"
import {
  Avatar, DialogFrame, DiscardDialog, Field, PButton, hasRealPhoto, inputCls,
} from "./profileUi"

export interface ProfileUser {
  _id: string; firstName: string; lastName: string; email: string
  phone?: string; gender?: string; profile?: string; status?: string
}

export type ProfilePatch = { profile?: string; phone?: string; gender?: string; updatedAt?: string }

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const SUPPORT_EMAIL = "support@smartcliff.com"

/** Runs one self-service update with the usual toasts; resolves to the saved
 *  user, or null when it failed (the toast has already said why). */
async function saveMine(input: Parameters<typeof updateMyProfile>[0]) {
  const token = getToken()
  if (!token) {
    toast.error("Your session has ended. Please sign in again.", { position: "top-right" })
    return null
  }
  try {
    const res = await updateMyProfile(input, token)
    toast.success(res?.message?.[0]?.value || "Profile updated", { position: "top-right" })
    return res.user
  } catch (err: any) {
    toast.error(err?.message || "Could not update your profile. Please try again.", { position: "top-right" })
    return null
  }
}

// ── Profile photo ────────────────────────────────────────────────────────────
export function ProfilePhotoDialog({ open, onClose, user, onSaved }: {
  open: boolean; onClose: () => void; user: ProfileUser; onSaved: (patch: ProfilePatch) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [remove, setRemove] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (!open) return
    setPhoto(null); setRemove(false); setError(""); setSaving(false); setConfirmDiscard(false)
    if (fileRef.current) fileRef.current.value = ""
  }, [open])

  useEffect(() => {
    if (!photo) { setPreview(null); return }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const pick = (f: File | null) => {
    if (!f) return
    if (!PHOTO_TYPES.includes(f.type)) { setError("Choose a JPG, PNG or WebP image."); return }
    if (f.size > MAX_PHOTO_BYTES) { setError("That image is larger than 5 MB. Choose a smaller one."); return }
    setError(""); setRemove(false); setPhoto(f)
  }

  const hasCurrent = hasRealPhoto(user.profile)
  const dirty = Boolean(photo) || remove
  const requestClose = () => {
    if (saving) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }
  const save = async () => {
    setSaving(true)
    const saved = await saveMine(photo ? { photo } : { removePhoto: true })
    setSaving(false)
    if (saved) { onSaved({ profile: saved.profile, updatedAt: saved.updatedAt }); onClose() }
  }

  return (
    <>
      <DialogFrame
        open={open}
        onRequestClose={requestClose}
        title="Profile photo"
        description="A clear photo helps your trainers and classmates recognise you."
        width="sm:max-w-[460px]"
        footer={
          <div className="flex w-full justify-end gap-2">
            <PButton size="sm" variant="outline" onClick={requestClose} disabled={saving}>Cancel</PButton>
            <PButton size="sm" variant="primary" onClick={save} loading={saving} disabled={!dirty}>
              {remove ? "Remove photo" : "Save photo"}
            </PButton>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            {preview ? (
              // A plain <img> for the blob: preview — next/image would need the
              // object URL whitelisted as a remote pattern.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="New profile photo" className="h-36 w-36 rounded-full object-cover ring-4 ring-[#ece8fe]" />
            ) : (
              <Avatar
                src={remove ? null : user.profile}
                firstName={user.firstName}
                lastName={user.lastName}
                className="h-36 w-36 ring-4 ring-[#ece8fe] dark:ring-white/10"
                textClassName="text-4xl"
              />
            )}
          </div>
          <p className="mt-3 text-xs text-subtle">
            {photo ? `New photo: ${photo.name}` : remove ? "Your photo will be removed and your initials shown instead." : "JPG, PNG or WebP, up to 5 MB."}
          </p>
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>}

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] || null)}
          />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <PButton size="sm" variant="soft" onClick={() => fileRef.current?.click()} disabled={saving}>
              {hasCurrent || photo ? <Camera className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
              {hasCurrent || photo ? "Choose another photo" : "Upload a photo"}
            </PButton>
            {photo && (
              <PButton size="sm" variant="ghost" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = "" }} disabled={saving}>
                Undo
              </PButton>
            )}
            {hasCurrent && !photo && !remove && (
              <PButton size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => setRemove(true)} disabled={saving}>
                <ImageOff className="h-3.5 w-3.5" /> Remove photo
              </PButton>
            )}
            {remove && (
              <PButton size="sm" variant="ghost" onClick={() => setRemove(false)} disabled={saving}>Keep my photo</PButton>
            )}
          </div>
        </div>
      </DialogFrame>
      <DiscardDialog
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); onClose() }}
        text="Your photo change has not been saved."
      />
    </>
  )
}

// ── Password ─────────────────────────────────────────────────────────────────
function PasswordInput({ id, value, onChange, placeholder, autoComplete, error }: {
  id: string; value: string; onChange: (v: string) => void; placeholder: string; autoComplete: string; error?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-msg`}
        className={cn(inputCls(error), "pr-10")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-[9px] text-subtle transition-colors hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b47e0]/30"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function ChangePasswordDialog({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: (patch: ProfilePatch) => void
}) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (!open) return
    setCurrent(""); setNext(""); setConfirm(""); setTouched(false); setSaving(false); setConfirmDiscard(false)
  }, [open])

  const currentError = touched && !current ? "Enter your current password." : ""
  const nextError = next && next.length < 8
    ? "Use at least 8 characters."
    : next && current && next === current
      ? "Choose a password different from your current one."
      : touched && !next ? "Enter a new password." : ""
  const confirmError = confirm && next && confirm !== next
    ? "Passwords don't match."
    : touched && !confirm ? "Re-enter the new password." : ""
  const valid = Boolean(current && next.length >= 8 && next !== current && confirm === next)
  const dirty = Boolean(current || next || confirm)

  const requestClose = () => {
    if (saving) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }
  const save = async () => {
    setTouched(true)
    if (!valid) return
    setSaving(true)
    const saved = await saveMine({ currentPassword: current, newPassword: next })
    setSaving(false)
    if (saved) { onSaved({ updatedAt: saved.updatedAt }); onClose() }
  }

  return (
    <>
      <DialogFrame
        open={open}
        onRequestClose={requestClose}
        title="Change password"
        description="Use at least 8 characters. A mix of letters, numbers and symbols is strongest."
        width="sm:max-w-[460px]"
        footer={
          <div className="flex w-full justify-end gap-2">
            <PButton size="sm" variant="outline" onClick={requestClose} disabled={saving}>Cancel</PButton>
            <PButton size="sm" variant="primary" onClick={save} loading={saving}>Update password</PButton>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); void save() }}
        >
          <Field id="pw-current" label="Current password" error={currentError}>
            <PasswordInput id="pw-current" value={current} onChange={setCurrent} placeholder="Enter your current password" autoComplete="current-password" error={currentError} />
          </Field>
          <Field id="pw-new" label="New password" error={nextError} hint="At least 8 characters.">
            <PasswordInput id="pw-new" value={next} onChange={setNext} placeholder="Enter a new password" autoComplete="new-password" error={nextError} />
          </Field>
          <Field id="pw-confirm" label="Confirm new password" error={confirmError}>
            <PasswordInput id="pw-confirm" value={confirm} onChange={setConfirm} placeholder="Re-enter the new password" autoComplete="new-password" error={confirmError} />
          </Field>
          {/* Enter submits. */}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </DialogFrame>
      <DiscardDialog
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); onClose() }}
        text="The passwords you typed will be cleared."
      />
    </>
  )
}

// ── Personal details ─────────────────────────────────────────────────────────
const GENDERS = ["Male", "Female", "Other"]

export function EditDetailsDialog({ open, onClose, user, roleName, onSaved }: {
  open: boolean; onClose: () => void; user: ProfileUser; roleName: string; onSaved: (patch: ProfilePatch) => void
}) {
  const [phone, setPhone] = useState("")
  const [gender, setGender] = useState("")
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (!open) return
    setPhone(user.phone || "")
    setGender(user.gender ? (GENDERS.find((g) => g.toLowerCase() === user.gender!.toLowerCase()) || "") : "")
    setSaving(false); setConfirmDiscard(false)
  }, [open, user.phone, user.gender])

  const digits = phone.replace(/\D/g, "")
  const phoneError = !phone.trim()
    ? "Enter your phone number."
    : !/^\+?[0-9\s-]+$/.test(phone.trim()) || digits.length < 7 || digits.length > 15
      ? "Enter a valid phone number (7 to 15 digits)."
      : ""
  const phoneChanged = phone.trim() !== (user.phone || "")
  const genderChanged = gender !== "" && gender.toLowerCase() !== (user.gender || "").toLowerCase()
  const dirty = phoneChanged || genderChanged

  const requestClose = () => {
    if (saving) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }
  const save = async () => {
    if (phoneError || !dirty) return
    setSaving(true)
    const saved = await saveMine({
      ...(phoneChanged ? { phone: phone.trim() } : {}),
      ...(genderChanged ? { gender } : {}),
    })
    setSaving(false)
    if (saved) {
      onSaved({ phone: saved.phone, gender: saved.gender, updatedAt: saved.updatedAt })
      onClose()
    }
  }

  const locked: { label: string; value: string }[] = [
    { label: "Full name", value: `${user.firstName || ""} ${user.lastName || ""}`.trim() },
    { label: "Email address", value: user.email },
    { label: "Role", value: roleName },
  ]

  return (
    <>
      <DialogFrame
        open={open}
        onRequestClose={requestClose}
        title="Edit personal details"
        description="Keep your contact details up to date."
        width="sm:max-w-[560px]"
        footer={
          <div className="flex w-full justify-end gap-2">
            <PButton size="sm" variant="outline" onClick={requestClose} disabled={saving}>Cancel</PButton>
            <PButton size="sm" variant="primary" onClick={save} loading={saving} disabled={!dirty || Boolean(phoneError)}>Save changes</PButton>
          </div>
        }
      >
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void save() }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pd-phone" label="Phone number" error={phone !== (user.phone || "") ? phoneError : ""}>
              <input
                id="pd-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className={inputCls(phone !== (user.phone || "") ? phoneError : "")}
              />
            </Field>
            <Field id="pd-gender" label="Gender">
              <select
                id="pd-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={cn(inputCls(), "cursor-pointer")}
              >
                {!gender && <option value="">Select</option>}
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>

          {/* What the institution owns — shown, not editable. */}
          <div className="rounded-xl border border-hairline bg-surface-sunken/60 p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-heading">
              <Lock className="h-3.5 w-3.5 text-subtle" /> Managed by your institution
            </p>
            <p className="mt-0.5 text-xs text-subtle">To change these, contact your administrator.</p>
            <dl className="mt-3 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              {locked.map((f) => (
                <div key={f.label} className="min-w-0">
                  <dt className="text-xs text-subtle">{f.label}</dt>
                  <dd className="truncate text-[13px] font-medium text-heading">{f.value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </DialogFrame>
      <DiscardDialog
        open={confirmDiscard}
        onKeep={() => setConfirmDiscard(false)}
        onDiscard={() => { setConfirmDiscard(false); onClose() }}
      />
    </>
  )
}

// ── Help & support ───────────────────────────────────────────────────────────
// There is no ticketing service behind the app, so the form composes an email
// to the support address in the person's own mail app — a real message to a
// real inbox, with their account details filled in.
const SUPPORT_TOPICS = ["Course content", "Assignments & assessments", "Account & sign-in", "Technical problem", "Other"]

export function SupportDialog({ open, onClose, user, roleName }: {
  open: boolean; onClose: () => void; user: ProfileUser; roleName: string
}) {
  const [topic, setTopic] = useState(SUPPORT_TOPICS[0])
  const [message, setMessage] = useState("")
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setTopic(SUPPORT_TOPICS[0]); setMessage(""); setTouched(false)
  }, [open])

  const messageError = touched && message.trim().length < 10 ? "Describe the problem in a few words (at least 10 characters)." : ""

  const send = () => {
    setTouched(true)
    if (message.trim().length < 10) return
    const subject = `[LMS support] ${topic}`
    const body = [
      message.trim(),
      "",
      "—",
      `Name: ${user.firstName} ${user.lastName}`.trim(),
      `Email: ${user.email}`,
      `Role: ${roleName}`,
      `Page: ${typeof window !== "undefined" ? window.location.href : ""}`,
    ].join("\n")
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    toast.success("Your email app is opening with the message ready to send.", { position: "top-right" })
    onClose()
  }

  return (
    <DialogFrame
      open={open}
      onRequestClose={onClose}
      title="Help & support"
      description={`Tell us what's wrong and we'll get back to you at ${user.email}.`}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-heading">
            <Mail className="h-3.5 w-3.5" /> {SUPPORT_EMAIL}
          </a>
          <div className="flex justify-end gap-2">
            <PButton size="sm" variant="outline" onClick={onClose}>Cancel</PButton>
            <PButton size="sm" variant="primary" onClick={send}>Continue in email</PButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Field id="sp-topic" label="Topic">
          <select id="sp-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className={cn(inputCls(), "cursor-pointer")}>
            {SUPPORT_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field id="sp-message" label="What do you need help with?" error={messageError}>
          <textarea
            id="sp-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe the problem, and which course or page it is on."
            className={cn(inputCls(messageError), "h-auto resize-y py-2.5 leading-relaxed")}
          />
        </Field>
      </div>
    </DialogFrame>
  )
}
