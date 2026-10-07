"use client";
import { getToken } from "@/lib/session";

// You Do · Mock programming test — the multi-file editor with the exam layer
// (components/YouDo/MockMultiFileTest). The instructions page routes a Mock /
// Practice programming assessment here; Final tests keep youdo/programming.

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import MockMultiFileTest from "@/app/lms/pages/courses/coursesdetailedview/components/YouDo/MockMultiFileTest";
import type { MockExercise } from "@/app/lms/pages/courses/coursesdetailedview/components/YouDo/mockTest";
import { API_ORIGIN } from "@/lib/apiBase";

const MockProgrammingContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [exerciseData, setExerciseData] = useState<MockExercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [courseId, setCourseId] = useState("");
  const [courseName, setCourseName] = useState("Course");
  const [hierarchy, setHierarchy] = useState<string[]>([]);

  const subcategory = searchParams.get("subcategory") || "";
  const exerciseName = searchParams.get("exerciseName") || "";
  const urlCourseId = searchParams.get("courseId") || "";
  const urlCourseName = searchParams.get("courseName") || "";
  const exerciseId = searchParams.get("exerciseId") || "";
  const nodeId = searchParams.get("nodeId") || "";
  const nodeName = searchParams.get("nodeName") || "";
  const nodeType = searchParams.get("nodeType") || "";
  const hierarchyParam = searchParams.get("hierarchy") || "";
  const securityAck = searchParams.get("securityAck") === "1";

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const applyHierarchy = (fallback?: string[]) => {
        if (hierarchyParam) setHierarchy(hierarchyParam.split(",").map((s) => s.trim()).filter(Boolean));
        else if (fallback) setHierarchy(fallback);
      };

      // 1) The exercise the instructions page stored on Start (only if it is
      //    this one — a stale entry from another test must not stand in).
      try {
        const stored = localStorage.getItem("currentProgrammingExercise");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!exerciseId || !parsed?._id || parsed._id === exerciseId) {
            setExerciseData(parsed);
            setCourseId(urlCourseId || parsed.courseId || parsed.context?.courseId || "");
            setCourseName(urlCourseName || parsed.courseName || "Course");
            applyHierarchy(parsed.context?.hierarchy);
            setIsLoading(false);
            return;
          }
        }
      } catch { /* fall through to the API */ }

      // 2) Reload after storage was cleared — fetch by id from the URL.
      if (!exerciseId) { setIsLoading(false); return; }
      try {
        const token = getToken() || localStorage.getItem("token") || "";
        const res = await fetch(`${API_ORIGIN}/exercise/${exerciseId}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          const ex = data.data?.exercise || data.data || data;
          if (ex?._id) {
            setExerciseData(ex);
            setCourseId(urlCourseId || ex.courseId || "");
            setCourseName(urlCourseName || ex.courseName || "Course");
            applyHierarchy();
          }
        }
      } catch (err) {
        console.error("Failed to fetch mock programming test:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [exerciseId, urlCourseId, urlCourseName, hierarchyParam]);

  // Back to the assessment list, on the same node and tab.
  const backToList = () => {
    localStorage.removeItem("currentProgrammingExercise");
    if (!courseId) { router.back(); return; }
    const qs = new URLSearchParams();
    if (nodeId) qs.set("restoreNodeId", nodeId);
    qs.set("method", "you-do");
    if (subcategory) qs.set("activity", subcategory);
    qs.set("refresh", "true");
    router.push(`/lms/pages/courses/coursesdetailedview/${courseId}?${qs.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!exerciseData) {
    return (
      <div className="w-full h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load this test.</p>
          <button onClick={backToList} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Go Back</button>
        </div>
      </div>
    );
  }

  const exerciseInfo = exerciseData.exerciseInformation || {};
  return (
    <MockMultiFileTest
      exercise={exerciseData}
      courseId={courseId}
      courseName={courseName}
      nodeId={nodeId || exerciseData.context?.nodeId || ""}
      nodeName={nodeName || exerciseInfo.exerciseName || exerciseName}
      nodeType={nodeType || exerciseData.context?.nodeType || ""}
      subcategory={subcategory}
      hierarchy={hierarchy}
      securityAck={securityAck}
      onExit={backToList}
    />
  );
};

export default function YouDoMockProgrammingPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        </div>
      }
    >
      <MockProgrammingContent />
    </Suspense>
  );
}
