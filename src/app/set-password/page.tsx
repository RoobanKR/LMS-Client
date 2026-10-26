"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, MailIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_ORIGIN } from "@/lib/apiBase";
import { routeForPermissionKey } from "@/app/lms/shared/navRoutes";

// First login (Server: UserSignIn → mustSetPassword). A student signs in with
// the password they were sent, lands here, and sets their own before going
// anywhere else — providers.tsx sends them back here from any page until the
// new password is saved.

// Where the login page would have sent a student: their first permission's
// page, else the student dashboard.
const homeRoute = () => {
  const key = localStorage.getItem("smartcliff_firstPermissionKey");
  return key ? routeForPermissionKey(key) : "/lms/pages/studentdashboard";
};

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          autoComplete="new-password"
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
        >
          {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          <span className="sr-only">{show ? "Hide password" : "Show password"}</span>
        </Button>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Not signed in → log in first; nothing left to set → go on.
    if (!localStorage.getItem("smartcliff_token")) {
      window.location.href = "/login";
      return;
    }
    if (localStorage.getItem("smartcliff_mustSetPassword") !== "true") {
      window.location.href = homeRoute();
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem("smartcliff_userData") || "{}");
      setEmail(user.email || "");
      setFirstName(user.firstName || "");
    } catch {
      /* the email line just stays empty */
    }
  }, []);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSave = password.length >= 8 && password === confirm && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_ORIGIN}/user/me/first-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("smartcliff_token")}`,
        },
        body: JSON.stringify({ newPassword: password }),
      });
      const data = await res.json().catch(() => null);
      // 409 = already set (another tab, say) — nothing left to do here either.
      if (!res.ok && res.status !== 409) {
        throw new Error(data?.message?.[0]?.value || "Couldn't set your password. Please try again.");
      }
      localStorage.removeItem("smartcliff_mustSetPassword");
      localStorage.setItem("showWelcomeToast", "true");
      window.location.href = homeRoute();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set your password. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 px-4 py-6">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="flex flex-col items-center gap-2 pb-0">
          <KeyRoundIcon className="h-10 w-10 text-orange-600 mb-2" />
          <CardTitle className="text-xl sm:text-2xl text-center font-bold text-gray-900">
            Set your password
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Welcome{firstName ? `, ${firstName}` : ""}! This is your first login — choose your own
            password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 text-sm text-red-600 font-medium text-center" role="alert">
              {error}
            </div>
          )}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Input id="email" value={email} readOnly className="pl-10 bg-gray-50 text-gray-700" />
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <PasswordInput
                id="new-password"
                label="New Password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
              />
              {tooShort && <p className="mt-1 text-xs text-red-600">Use at least 8 characters.</p>}
            </div>
            <div>
              <PasswordInput
                id="confirm-password"
                label="Confirm Password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Type the same password again"
              />
              {mismatch && <p className="mt-1 text-xs text-red-600">The passwords don't match.</p>}
            </div>
            <Button
              type="submit"
              disabled={!canSave}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {saving ? "Saving…" : "Save & Login"}
              {!saving && <ArrowRightIcon className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
