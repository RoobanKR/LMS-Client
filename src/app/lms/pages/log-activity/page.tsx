// Old Log Activity links (/lms/pages/log-activity) open the Logs page, where
// the admin's and the trainer's activity logs both live (navRoutes.ts maps the
// `log-activity` grant there too).
import { redirect } from "next/navigation";

export default function LogActivityRedirect() {
  redirect("/lms/pages/logs");
}
