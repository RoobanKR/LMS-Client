"use client";

// /lms/pages/messages — people chat. Same shell choice as every shared page:
// admins in the dashboard shell, students in theirs, everyone else (trainers,
// faculty) in the staff shell.
import React, { useEffect, useState } from "react";
import { SESSION_KEYS } from "@/lib/session";
import DashboardLayout from "@/app/lms/component/layout";
import { StaffLayout } from "@/app/lms/component/stafflayout/staff-layout";
import { StudentLayout } from "@/app/lms/component/student/student-layout";
import MessagesPage from "./MessagesPage";

const ADMIN_SHELL_ROLES = ["admin", "ldhead", "subhead", "programcoordinator"];

export default function MessagesRoute() {
    const [role, setRole] = useState<string | null>(null);
    useEffect(() => {
        try {
            setRole((localStorage.getItem(SESSION_KEYS.roleValue) || localStorage.getItem(SESSION_KEYS.userRole) || "student").toLowerCase());
        } catch {
            setRole("student");
        }
    }, []);
    if (role === null) return null;
    if (ADMIN_SHELL_ROLES.includes(role)) return <DashboardLayout><MessagesPage /></DashboardLayout>;
    if (role === "student") return <StudentLayout><MessagesPage /></StudentLayout>;
    return <StaffLayout><MessagesPage /></StaffLayout>;
}
