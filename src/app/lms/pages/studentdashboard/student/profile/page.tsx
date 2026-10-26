"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Retired address. /lms/pages/profile is the one profile page for every role;
// this route only forwards old links and bookmarks there. Forwarded from the
// client: a server-side redirect() never fires here, because the auth gate
// holds the page back until the session has been checked.
export default function Page() {
  const router = useRouter();
  useEffect(() => { router.replace("/lms/pages/profile"); }, [router]);
  return null;
}
