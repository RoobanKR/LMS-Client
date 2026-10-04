"use client";

import { useCallback, useState } from "react";
import { StaffLayout } from "@/app/lms/component/stafflayout/staff-layout";
import { DashboardSkeleton, ErrorState } from "@/features/ld-dashboard/components/states";
import { useTrainerDashboard } from "./hooks/use-trainer-dashboard";
import { TrainerHeader } from "./components/trainer-panels";
import { TeachingOverview } from "./components/teaching-overview";

/** The trainer's daily work, using dynamically configured activity categories. */
export default function StaffDashboardPage() {
  const [course, setCourse] = useState("all");
  const onReset = useCallback(() => setCourse("all"), []);
  const data = useTrainerDashboard(course, onReset);
  const { loading, error, model, courseOptions } = data;

  return (
    <StaffLayout>
      <div className="@container w-full space-y-4 sm:space-y-5">
        <TrainerHeader
          scope={model?.scope ?? "My teaching overview"}
          subline={loading ? "Loading your courses and students…" : model?.subline ?? "Your teaching courses and daily actions"}
          filtered={course !== "all"}
          onReset={onReset}
          course={course}
          courseOptions={courseOptions}
          onCourse={setCourse}
        />
        {loading ? <DashboardSkeleton /> : error || !model ? <ErrorState message={error || "No data returned for this view."} /> : <TeachingOverview data={data} />}
      </div>
    </StaffLayout>
  );
}
