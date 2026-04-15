"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Brain, Users, HelpCircle, FileText, Video, FileArchive,
  Link2, BookOpen, FolderPlus, Download, Eye, RefreshCw,
  Settings, X, Loader2, Folder, Globe, Lock, EyeOff,
  Upload, File as FileIcon, Plus, BookPlus, AlertCircle,
  Presentation, Trash2, Home, Library, FolderOpen,
  File as FileLucide, Sun, Moon, Monitor, ChevronRight,
  GraduationCap, LayoutDashboard, BookMarked, Layers,
  User, LogOut, UserCheck2, Zap,
  ChevronDown,
  FilePlus2,
  Target
} from "lucide-react";
import dynamic from "next/dynamic";
import { getCurrentUser } from "@/apiServices/tokenVerify"
import "react-quill/dist/quill.snow.css";
import { useQuery } from "@tanstack/react-query";
import {
  courseDataApi, entityApi,
  type CourseStructureData, type Module, type SubModule,
  type Topic, type SubTopic, updateFileSettingsInComponent,
} from "@/apiServices/coursesData";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { showErrorToast, showSuccessToast } from "@/components/ui/toastUtils";
import PDFViewer from "../../../component/pdfView";
import VideoViewer from "../../../component/videosViewer";
import ZipViewer from "../../../component/zipViewer";
import PPTViewer from "../../../component/pptView";
import { updateURL } from "@/apiServices/urlParams";
import { StudentNavbar } from "@/app/lms/component/student/student-navbar";

import { CourseSidebar } from "./components/Coursesidebar";
import { CourseContent } from "./components/Coursecontent";
import { NotionResourceModal } from "./components/Notionresourcemodal";

import {
  CourseNode, FolderItem, UploadedFile, ContentData, SubcategoryData,
  Tag, FileTypeConfig, VideoItem, BreadcrumbItem, FolderNavState, isFolderItem, isUploadedFile
} from "../uploadcourseresources/components/Types";
import toast from "react-hot-toast";
import TipTapEditor from "@/app/lms/component/tiptopEditor";

const Editor = dynamic(() => import("primereact/editor").then((m) => m.Editor), { ssr: false });

// ─── Design tokens ────────────────────────────────────────────────────────────
// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  orange: '#F27757',
  orangeDark: '#E0623F',
  orangeGlow: 'rgba(242,119,87,0.22)',
  orangeLight: 'rgba(242,119,87,0.08)',
  orangeMid: 'rgba(242,119,87,0.15)',
  blue: '#3B82F6', // Added blue color
  blueLight: 'rgba(59,130,246,0.08)',
  textMain: '#1a1a2e',
  textSub: '#6b6b7e',
  textMuted: '#8b8b9e',
  textHint: '#bcbccc',
  textDark: '#000000', // Explicit black
  border: '#e4e4ed',
  bg: '#ffffff',
  pageBg: '#f7f7f9',
};
// ─── Transform Helpers ─────────────────────────────────────────────────────────
function transformToCourseNodes(courseData: CourseStructureData): CourseNode[] {
  return [{
    id: courseData._id, name: courseData.courseName, type: "course", level: 0,
    originalData: courseData,
    children: courseData.modules.map((module: Module) => ({
      id: module._id, name: module.title, type: "module" as const, level: 1,
      originalData: module,
      children: [
        ...module.topics.map((topic: Topic) => ({
          id: topic._id, name: topic.title, type: "topic" as const, level: 2,
          originalData: topic,
          children: topic.subTopics.map((st: SubTopic) => ({
            id: st._id, name: st.title, type: "subtopic" as const, level: 3, originalData: st,
          })),
        })),
        ...module.subModules.map((sm: SubModule) => ({
          id: sm._id, name: sm.title, type: "submodule" as const, level: 2,
          originalData: sm,
          children: sm.topics.map((topic: Topic) => ({
            id: topic._id, name: topic.title, type: "topic" as const, level: 3,
            originalData: topic,
            children: topic.subTopics.map((st: SubTopic) => ({
              id: st._id, name: st.title, type: "subtopic" as const, level: 4, originalData: st,
            })),
          })),
        })),
      ],
    })),
  }];
}

const toBackendTab = (tab: "I_Do" | "We_Do" | "You_Do" | null): "I_Do" | "We_Do" | "You_Do" => {
  if (tab === "We_Do") return "We_Do";
  if (tab === "You_Do") return "You_Do";
  return "I_Do";
};

// ─── Dark Mode Hook ────────────────────────────────────────────────────────────
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lms_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return saved ? saved === 'dark' : prefersDark;
    }
    return false;
  });



  useEffect(() => {
    const root = document.documentElement;
    if (isDark) { root.classList.add('dark'); localStorage.setItem('lms_theme', 'dark'); }
    else { root.classList.remove('dark'); localStorage.setItem('lms_theme', 'light'); }
  }, [isDark]);

  return { isDark, toggleDark: () => setIsDark(prev => !prev) };
};

// ─── Orange Toggle ────────────────────────────────────────────────────────────
const OrangeToggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
    <div
      className="w-10 h-5 rounded-full transition-colors relative"
      style={{ background: checked ? T.orange : T.border }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
        style={{ left: checked ? '22px' : '2px' }}
      />
    </div>
  </label>
);

// ─── Breadcrumb Icon map ───────────────────────────────────────────────────────
const CRUMB_ICON: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={13} />,
  courses: <BookMarked size={13} />,
  course: <GraduationCap size={13} />,
  module: <Layers size={13} />,
  submodule: <Layers size={13} />,
  topic: <BookOpen size={13} />,
  subtopic: <FileText size={13} />,
};


function UserMenuButton({
  user, userLoading, showUserMenu, setShowUserMenu, userRef,
  isDummyStudent, originalRoleInfo, isLoggingOut,
  getUserInitials, isActualStudent,
  handleProfileClick, handleSwitchToStudent, handleSwitchBackToOriginal, handleLogout,
}: any) {
  const initials = getUserInitials()
  const isDark = false // or wire up your theme state if needed

  return (
    <div ref={userRef} className="relative">
      {/* Pill trigger button */}
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-2.5 transition-all"
        style={{
          background: showUserMenu ? "#FFF4F1" : "#ffffff",
          borderRadius: "999px",
          border: `1.5px solid ${showUserMenu ? T.orange + "55" : "#e8e4eb"}`,
          padding: "5px 12px 5px 6px",
          boxShadow: showUserMenu
            ? `0 2px 12px rgba(242,119,87,0.25)`
            : "0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
        }}
        onMouseEnter={e => {
          if (!showUserMenu) {
            (e.currentTarget as HTMLElement).style.background = "#f6f4f7"
              ; (e.currentTarget as HTMLElement).style.boxShadow = "0 3px 12px rgba(0,0,0,0.10)"
          }
        }}
        onMouseLeave={e => {
          if (!showUserMenu) {
            (e.currentTarget as HTMLElement).style.background = "#ffffff"
              ; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)"
          }
        }}
      >
        {userLoading ? (
          <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: T.border }} />
        ) : (
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`,
              boxShadow: `0 2px 8px rgba(242,119,87,0.25)`,
            }}
          >
            {initials}
          </div>
        )}
        <div className="hidden sm:block text-left">
          <p className="text-[12.5px] font-semibold leading-tight" style={{ color: T.textMain }}>
            {user?.firstName || "User"}
          </p>
          <p className="text-[10px] leading-tight mt-0.5" style={{ color: T.textMuted }}>
            {isDummyStudent ? "Student View" : user?.role?.renameRole || "Account"}
          </p>
        </div>
        <ChevronDown
          className="hidden sm:block ml-0.5"
          size={14}
          style={{
            color: "#bcbccc",
            transform: showUserMenu ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Dropdown */}
      {showUserMenu && (
        <div
          className="absolute top-full right-0 mt-2 w-64 z-[9999] overflow-hidden"
          style={{
            background: T.bg,
            borderRadius: "18px",
            border: `1px solid ${T.border}`,
            boxShadow: "0 16px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)",
            animation: "scDrop .18s cubic-bezier(.16,1,.3,1) both",
            transformOrigin: "top right",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3"
            style={{ background: "#f6f4f7", borderBottom: `1px solid ${T.border}` }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`,
                  boxShadow: `0 4px 14px rgba(242,119,87,0.25)`,
                }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold truncate" style={{ color: T.textMain }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] truncate" style={{ color: T.textMuted }}>{user?.email}</p>
                <span
                  className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5"
                  style={{ background: T.orangeLight, color: T.orange }}
                >
                  {isDummyStudent ? "⚡ Student View" : user?.role?.renameRole || "Account"}
                </span>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            {!isActualStudent() && !isDummyStudent && (
              <UMRow
                icon={UserCheck2}
                label="Switch to Student"
                sub="Preview student experience"
                color="#3b82f6"
                hoverBg="#eff6ff"
                onClick={handleSwitchToStudent}
              />
            )}
            {isDummyStudent && originalRoleInfo && (
              <UMRow
                icon={Zap}
                label={`Back to ${originalRoleInfo.renameRole}`}
                sub="Return to original role"
                color="#f59e0b"
                hoverBg="#fffbeb"
                onClick={handleSwitchBackToOriginal}
              />
            )}
            <div className="h-px my-1 mx-1" style={{ background: T.border }} />
            <UMRow icon={User} label="My Profile" sub="" color={T.textMuted} hoverBg="#f6f4f7" onClick={handleProfileClick} />
            <UMRow icon={Settings} label="Settings" sub="" color={T.textMuted} hoverBg="#f6f4f7" onClick={() => setShowUserMenu(false)} />
            <UMRow icon={HelpCircle} label="Help & Support" sub="" color={T.textMuted} hoverBg="#f6f4f7" onClick={() => setShowUserMenu(false)} />
          </div>

          {/* Sign out */}
          <div className="p-1.5" style={{ borderTop: `1px solid ${T.border}` }}>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff5f5" }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >
              <LogOut size={14} style={{ color: "#e53e3e" }} />
              <span className="text-[12px] font-semibold" style={{ color: "#e53e3e" }}>
                {isLoggingOut ? "Signing out…" : "Sign Out"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Reusable menu row
function UMRow({ icon: Icon, label, sub, color, hoverBg, onClick }: {
  icon: React.ElementType; label: string; sub: string
  color: string; hoverBg: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors"
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      <Icon size={14} className="flex-shrink-0" style={{ color }} />
      <div className="min-w-0">
        <p className="text-[12px] font-medium" style={{ color: T.textMain }}>{label}</p>
        {sub && <p className="text-[10px]" style={{ color: T.textMuted }}>{sub}</p>}
      </div>
    </button>
  )
}
// ─── Enhanced Breadcrumb Bar ──────────────────────────────────────────────────
const BreadcrumbBar = ({
  breadcrumbs,
  activeTab,
  activeSubcategory,
}: {
  breadcrumbs: BreadcrumbItem[];
  activeTab: "I_Do" | "We_Do" | "You_Do" | null;
  activeSubcategory: string;
}) => {
  const router = useRouter();
  
  if (!breadcrumbs.length) return null;

  const tabLabel: Record<string, string> = {
    I_Do: "I Do",
    We_Do: "We Do",
    You_Do: "You Do",
  };

  // Separate dashboard and courses from the rest
  const dashboardCourses = breadcrumbs.filter(
    crumb => crumb.type === "dashboard" || crumb.type === "courses"
  );
  
  const hierarchyBreadcrumbs = breadcrumbs.filter(
    crumb => crumb.type !== "dashboard" && crumb.type !== "courses"
  );

  const allCrumbs = [
    ...hierarchyBreadcrumbs,
    ...(activeTab ? [{ label: tabLabel[activeTab] ?? activeTab, type: "tab", id: activeTab }] : []),
    ...(activeSubcategory
      ? [{ label: activeSubcategory.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), type: "subcategory", id: activeSubcategory }]
      : []),
  ];

  const handleCrumbClick = (crumb: BreadcrumbItem, isLast: boolean) => {
    if (isLast) return;
    
    if (crumb.type === "dashboard") {
      router.push("/lms/pages/dashboard");
      return;
    }
    
    if (crumb.type === "courses") {
      router.push("/lms/pages/courses");
      return;
    }
    
    if (crumb.onClick) {
      crumb.onClick();
    }
  };

  return (
    <div
      className="flex-shrink-0 flex flex-col"
      style={{
        background: T.bg,
        padding: '8px 20px',
        marginBottom: 0,
        gap: '4px',
      }}
    >
      {/* First Row - Dashboard and Courses */}
      {dashboardCourses.length > 0 && (
        <div className="flex items-center" style={{ gap: 0 }}>
          {dashboardCourses.map((crumb, index) => {
            const isLast = index === dashboardCourses.length - 1;
            const icon = CRUMB_ICON[crumb.type] ?? null;
            const textColor = T.blue;

            return (
              <React.Fragment key={crumb.id}>
                <div
                  className="flex items-center gap-1 flex-shrink-0 select-none"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => {
                    const textEl = e.currentTarget.querySelector('.crumb-text') as HTMLElement;
                    if (textEl) textEl.style.color = T.orange;
                  }}
                  onMouseLeave={e => {
                    const textEl = e.currentTarget.querySelector('.crumb-text') as HTMLElement;
                    if (textEl) textEl.style.color = T.blue;
                  }}
                  onClick={() => handleCrumbClick(crumb, isLast)}
                >
                  {icon && (
                    <span style={{ display: 'flex', alignItems: 'center', color: textColor }}>
                      {icon}
                    </span>
                  )}
                  <span
                    className="crumb-text"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: textColor,
                      whiteSpace: 'nowrap',
                      lineHeight: 1.4,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {crumb.label}
                  </span>
                </div>

                {!isLast && (
                  <span style={{ margin: '0 4px', color: T.textHint }}>
                    <ChevronRight size={12} strokeWidth={2.5} />
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Second Row - Course hierarchy and tabs */}
      {(allCrumbs.length > 0 || activeTab || activeSubcategory) && (
        <div 
          className="flex items-center overflow-x-auto"
          style={{ 
            gap: 0,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            paddingBottom: '2px',
          }}
        >
          {allCrumbs.map((crumb, index) => {
            const isLast = index === allCrumbs.length - 1;
            const isCourse = crumb.type === "course";
            const icon = CRUMB_ICON[crumb.type] ?? null;

            let textColor = T.textDark;
            if (isCourse && !isLast) {
              textColor = T.orange;
            }

            return (
              <React.Fragment key={crumb.id}>
                <div
                  className="flex items-center gap-1 flex-shrink-0 select-none"
                  style={{ cursor: !isLast ? 'pointer' : 'default' }}
                  onMouseEnter={e => {
                    if (!isLast) {
                      const textEl = e.currentTarget.querySelector('.crumb-text') as HTMLElement;
                      if (textEl) textEl.style.color = T.orange;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isLast) {
                      const textEl = e.currentTarget.querySelector('.crumb-text') as HTMLElement;
                      if (textEl) {
                        if (isCourse) {
                          textEl.style.color = T.orange;
                        } else {
                          textEl.style.color = T.textDark;
                        }
                      }
                    }
                  }}
                  onClick={() => handleCrumbClick(crumb, isLast)}
                >
                  {icon && (
                    <span style={{ display: 'flex', alignItems: 'center', color: textColor }}>
                      {icon}
                    </span>
                  )}
                  <span
                    className="crumb-text"
                    style={{
                      fontSize: isLast ? '14px' : '13px',
                      fontWeight: isLast ? 700 : 600,
                      color: textColor,
                      whiteSpace: 'nowrap',
                      lineHeight: 1.4,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: 'color 0.15s ease',
                      textTransform: (crumb.type === 'tab' || crumb.type === 'subcategory') ? 'capitalize' : 'none',
                    }}
                  >
                    {crumb.label}
                  </span>
                </div>

                {!isLast && (
                  <span style={{ margin: '0 4px', color: T.textHint }}>
                    <ChevronRight size={12} strokeWidth={2.5} />
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
// ─── Accordion Header ─────────────────────────────────────────────────────────
const AccordionHeader = ({ icon, iconColor, iconBg, title, subtitle, sectionKey, currentKey, onToggle }: any) => (
  <button
    className="flex items-center justify-between w-full p-3 text-left transition-colors cursor-pointer"
    style={{ background: currentKey === sectionKey ? T.pageBg : T.bg, borderBottom: `1px solid ${T.border}` }}
    onClick={() => onToggle(currentKey === sectionKey ? null : sectionKey)}
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.pageBg}
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = currentKey === sectionKey ? T.pageBg : T.bg}
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl" style={{ background: iconBg }}>{React.cloneElement(icon, { size: 15, style: { color: iconColor } })}</div>
      <div><h4 className="text-[12.5px] font-bold" style={{ color: T.textMain }}>{title}</h4>{subtitle && <p className="text-[11px] mt-0.5" style={{ color: T.textMuted }}>{subtitle}</p>}</div>
    </div>
    <svg className="w-4 h-4 transition-transform" style={{ color: T.textHint, transform: currentKey === sectionKey ? 'rotate(180deg)' : 'none' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
  </button>
);

const FolderBreadcrumbBar = ({ 
  currentFolderPath, 
  currentFolderId,
  onNavigateUp,
  onNavigateToRoot,
  onNavigateToFolder
}: { 
  currentFolderPath: string[];
  currentFolderId: string | null;
  onNavigateUp: () => void;
  onNavigateToRoot: () => void;
  onNavigateToFolder: (folderName: string, index: number) => void;
}) => {
  if (!currentFolderId && currentFolderPath.length === 0) return null;
  
  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 mb-3"
      style={{
        background: T.warm,
        borderBottom: `1px solid ${T.border}`,
        borderLeft: `3px solid ${T.orange}`,
        borderRadius: '8px',
      }}
    >
      {/* Back button */}
      <button
        onClick={onNavigateUp}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
        style={{
          background: T.bg,
          color: T.textSub,
          border: `1px solid ${T.border}`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = T.orange;
          (e.currentTarget as HTMLElement).style.color = T.orange;
          (e.currentTarget as HTMLElement).style.background = T.orangeLight;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = T.border;
          (e.currentTarget as HTMLElement).style.color = T.textSub;
          (e.currentTarget as HTMLElement).style.background = T.bg;
        }}
      >
        <ArrowLeft size={12} strokeWidth={2.5} />
        Back
      </button>

      {/* Separator */}
      <div className="w-px h-5" style={{ background: T.border }} />

      {/* Folder icon */}
      <Folder size={14} style={{ color: T.orange }} />

      {/* Breadcrumb path */}
      <div className="flex items-center gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
        {/* Root button */}
        <button
          onClick={onNavigateToRoot}
          className="flex-shrink-0 text-[10.5px] font-semibold px-1.5 py-0.5 rounded transition-all cursor-pointer"
          style={{ 
            color: currentFolderPath.length === 0 ? T.orange : T.textHint,
            background: currentFolderPath.length === 0 ? T.orangeLight : 'transparent',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = T.orange;
            (e.currentTarget as HTMLElement).style.background = T.orangeLight;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = currentFolderPath.length === 0 ? T.orange : T.textHint;
            (e.currentTarget as HTMLElement).style.background = currentFolderPath.length === 0 ? T.orangeLight : 'transparent';
          }}
        >
          Root
        </button>

        {/* Breadcrumb segments */}
        {currentFolderPath.map((segment, idx) => {
          const isLast = idx === currentFolderPath.length - 1;
          return (
            <div key={idx} className="flex items-center gap-1 flex-shrink-0">
              <ChevronRight size={9} style={{ color: T.textHint }} />
              <button
                onClick={() => !isLast && onNavigateToFolder(segment, idx)}
                className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded max-w-[120px] truncate transition-all"
                style={{
                  color: isLast ? T.orange : T.textSub,
                  background: isLast ? T.orangeLight : "transparent",
                  border: isLast ? `1px solid ${T.orange}20` : "1px solid transparent",
                  cursor: isLast ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isLast) {
                    (e.currentTarget as HTMLElement).style.color = T.orange;
                    (e.currentTarget as HTMLElement).style.background = T.orangeLight;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLast) {
                    (e.currentTarget as HTMLElement).style.color = T.textSub;
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                {segment}
              </button>
            </div>
          );
        })}
      </div>

      {/* Item count badge */}
      <div className="flex-shrink-0 ml-auto">
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-full"
          style={{
            background: T.orangeLight,
            color: T.orange,
          }}
        >
          {currentFolderPath.length > 0 ? 'Folder' : 'Root'}
        </span>
      </div>
    </div>
  );
};
// ─── Main Component ────────────────────────────────────────────────────────────
export default function DynamicLMSCoordinator() {
  const { isDark, toggleDark } = useDarkMode();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId");
  const { data: courseStructureResponse } = useQuery(courseDataApi.getById(courseId || ""));

  const getLS = (key: string) => (typeof window !== "undefined" ? localStorage.getItem(key) || "" : "");
  const setLS = (key: string, val: string) => localStorage.setItem(key, val);
  const delLS = (key: string) => localStorage.removeItem(key);

  // ── Core state ────────────────────────────────────────────────────────────────
  const [courseData, setCourseData] = useState<CourseNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<CourseNode | null>(null);
  const [activeTab, setActiveTab] = useState<"I_Do" | "We_Do" | "You_Do" | null>(() => getLS("lms_selected_tab") as any || null);
  const [activeSubcategory, setActiveSubcategory] = useState(() => getLS("lms_selected_subcategory"));
  const [contentData, setContentData] = useState<Record<string, ContentData>>({});
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [folderNavState, setFolderNavState] = useState<Record<string, FolderNavState>>({});
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRestoringFromAnalytics, setIsRestoringFromAnalytics] = useState(false);
  const [currentPPTFileId, setCurrentPPTFileId] = useState("");
  const [currentVideoFileId, setCurrentVideoFileId] = useState("");
  const [currentPDFFileId, setCurrentPDFFileId] = useState("");

  const [showNotionModal, setShowNotionModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileDisplayNames, setFileDisplayNames] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState<Tag[]>([]);
  const [uploadCurrentTag, setUploadCurrentTag] = useState("");
  const [uploadTagColor, setUploadTagColor] = useState("#3B82F6");
  const [uploadAccessLevel, setUploadAccessLevel] = useState("private");
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [expandedUploadSection, setExpandedUploadSection] = useState<string | null>("description");
  const [text, setText] = useState("");
  const [folderUrl, setFolderUrl] = useState("");
  const [urlFileName, setUrlFileName] = useState("");
  const [urlFileType, setUrlFileType] = useState("url/link");
  const [documentSettings, setDocumentSettings] = useState<Record<string, { studentShow: boolean; downloadAllow: boolean }>>({});
  const [folderTags, setFolderTags] = useState<Tag[]>([]);
  const [tagColor, setTagColor] = useState("");
  const [currentTag, setCurrentTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [updateFileId, setUpdateFileId] = useState<string | null>(null);
  const [updateFileType, setUpdateFileType] = useState("");
  const [updateTabType, setUpdateTabType] = useState<"I_Do" | "We_Do" | "You_Do">("I_Do");
  const [updateSubcategory, setUpdateSubcategory] = useState("");
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>("folderName");
  const [accessLevel, setAccessLevel] = useState("private");
  const [hideStudentSettings, setHideStudentSettings] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "folder" | "file"; item: any; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentPDFUrl, setCurrentPDFUrl] = useState("");
  const [currentPDFName, setCurrentPDFName] = useState("");
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [currentVideoName, setCurrentVideoName] = useState("");
  const [currentVideoResolutions, setCurrentVideoResolutions] = useState<string[]>([]);
  const [currentVideoFileUrlMap, setCurrentVideoFileUrlMap] = useState<Record<string, string>>({});
  const [videoPlaylist, setVideoPlaylist] = useState<VideoItem[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showZipViewer, setShowZipViewer] = useState(false);
  const [currentZipUrl, setCurrentZipUrl] = useState("");
  const [currentZipName, setCurrentZipName] = useState("");
  const [showPPTViewer, setShowPPTViewer] = useState(false);
  const [currentPPTUrl, setCurrentPPTUrl] = useState("");
  const [currentPPTName, setCurrentPPTName] = useState("");
  const router = useRouter() // add this if not present
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDummyStudent, setIsDummyStudent] = useState(false)
  const [originalRoleInfo, setOriginalRoleInfo] = useState<{ roleName: string; renameRole: string } | null>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null);
const hasInitialized = useRef(false);
const isFetchingRef = useRef<string | null>(null);
const lastFetchedDataRef = useRef<string>("");
const initialDataLoadedRef = useRef(false);
const [isInitialLoad, setIsInitialLoad] = useState(true);
const [isNodeSelected, setIsNodeSelected] = useState(false);

// Add these state variables with your other state declarations
const [isContentLoading, setIsContentLoading] = useState(false);
const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const subcategories = useMemo(() => {
    if (!courseStructureResponse?.data) return { I_Do: [], We_Do: [], You_Do: [] };
    const d = courseStructureResponse.data;
    return {
      I_Do: d.I_Do.map((item: string) => ({ key: item.toLowerCase().replace(/\s+/g, "_"), label: item, icon: <Brain size={14} />, component: null })),
      We_Do: d.We_Do.map((item: string) => ({ key: item.toLowerCase().replace(/\s+/g, "_"), label: item, icon: <Users size={14} />, component: item.toLowerCase().replace(/\s+/g, "_") === "project_development" ? "Practical" : null })),
      You_Do: d.You_Do.map((item: string) => ({ key: item.toLowerCase().replace(/\s+/g, "_"), label: item, icon: <HelpCircle size={14} />, component: null })),
    };
  }, [courseStructureResponse]);

const fileTypes: FileTypeConfig[] = useMemo(() => {
  // Static file types that are always available
  const staticFileTypes: FileTypeConfig[] = [
    { key: "folder", label: "New Folder", icon: <FolderPlus size={22} />, color: T.orange, tooltip: "Create a new folder" },
    { key: "page_creation", label: "Page Builder", icon: <FilePlus2 size={22} />, color: T.orange, tooltip: "Build rich content pages with editable blocks" },
    { key: "zip", label: "ZIP File", icon: <FileArchive size={22} />, color: "#a855f7", tooltip: "Upload ZIP archives", accept: ".zip,.rar,.7z,.tar,.gz" },
    { key: "reference", label: "REFERENCE", icon: <BookOpen size={22} />, color: "#8b5cf6", tooltip: "Upload reference materials", accept: "*" },
  ];

  // Dynamic file types based on resourcesType.iDo configuration
  const dynamicFileTypes: FileTypeConfig[] = [];
  
  // Check if resourcesType and iDo exist
  if (courseStructureResponse?.data?.resourcesType?.iDo) {
    const iDoResources = courseStructureResponse.data.resourcesType.iDo;
    
    // Video resource
    if (iDoResources.video?.enabled === true) {
      dynamicFileTypes.push({
        key: "video",
        label: "Video",
        icon: <Video size={22} />,
        color: "#3b82f6",
        tooltip: "Upload video files",
        accept: "video/*,.mp4,.avi,.mov,.mkv"
      });
    }
    
    // PPT resource
    if (iDoResources.ppt?.enabled === true) {
      dynamicFileTypes.push({
        key: "ppt",
        label: "PPT",
        icon: <FileText size={22} />,
        color: "#f97316",
        tooltip: "Upload PowerPoint files",
        accept: ".ppt,.pptx"
      });
    }
    
    // PDF resource
    if (iDoResources.pdf?.enabled === true) {
      dynamicFileTypes.push({
        key: "pdf",
        label: "PDF",
        icon: <FileText size={22} />,
        color: "#ef4444",
        tooltip: "Upload PDF documents",
        accept: ".pdf"
      });
    }
    
    // URL resource
    if (iDoResources.url?.enabled === true) {
      dynamicFileTypes.push({
        key: "url",
        label: "URL",
        icon: <Link2 size={22} />,
        color: "#10b981",
        tooltip: "Add external URLs",
        accept: "url"
      });
    }
  }
  
  const result = [...staticFileTypes, ...dynamicFileTypes];
  
  return result;
}, [courseStructureResponse]);


// Add this state
const [configuredLanguages, setConfiguredLanguages] = useState<{
  coreProgram: string[];
  frontend: string[];
  database: string[];
}>({
  coreProgram: [],
  frontend: [],
  database: []
});

// Function to find the module for the selected node
const findModuleForNode = useCallback((node: CourseNode | null): any | null => {
  if (!node || !courseStructureResponse?.data?.modules) return null;
  
  const modules = courseStructureResponse.data.modules;
  
  // Helper to search recursively for the module containing this node
  const findModuleInTree = (module: any, targetId: string): any | null => {
    // Check if this module matches
    if (module._id === targetId) return module;
    
    // Check topics in module
    if (module.topics) {
      for (const topic of module.topics) {
        if (topic._id === targetId) return module;
        if (topic.subTopics) {
          for (const subtopic of topic.subTopics) {
            if (subtopic._id === targetId) return module;
          }
        }
      }
    }
    
    // Check submodules
    if (module.subModules) {
      for (const submodule of module.subModules) {
        if (submodule._id === targetId) return module;
        if (submodule.topics) {
          for (const topic of submodule.topics) {
            if (topic._id === targetId) return module;
            if (topic.subTopics) {
              for (const subtopic of topic.subTopics) {
                if (subtopic._id === targetId) return module;
              }
            }
          }
        }
      }
    }
    
    return null;
  };
  
  // Search through all modules
  for (const module of modules) {
    const found = findModuleInTree(module, node.id);
    if (found) return found;
  }
  
  return null;
}, [courseStructureResponse, selectedNode]);

// Extract skill set from the selected node's own testConfiguration (flat format)
useEffect(() => {
  if (selectedNode) {
    const tc = selectedNode.originalData?.testConfiguration;
    setConfiguredLanguages({
      coreProgram: (tc?.coreProgram ?? []).filter(Boolean),
      frontend: (tc?.frontend ?? []).filter(Boolean),
      database: (tc?.database ?? []).filter(Boolean),
    });
  } else {
    setConfiguredLanguages({ coreProgram: [], frontend: [], database: [] });
  }
}, [selectedNode]);
  const setActiveTabPersistent = (tab: "I_Do" | "We_Do" | "You_Do" | null) => { setActiveTab(tab); if (tab) setLS("lms_selected_tab", tab); else delLS("lms_selected_tab"); };
  const setActiveSubcategoryPersistent = (sub: string) => { setActiveSubcategory(sub); setLS("lms_selected_subcategory", sub); };
  const setSelectedNodePersistent = (node: CourseNode | null) => {
    setSelectedNode(node);
    if (node) { setLS("lms_selected_node_id", node.id); setLS("lms_selected_node_name", node.name); delLS("lms_restore_node_id"); }
    else { delLS("lms_selected_node_id"); delLS("lms_selected_node_name"); }
  };

  const getCurrentNavKey = () => `${activeTab}-${activeSubcategory}`;
  const getCurrentNavState = useCallback((): FolderNavState => folderNavState[getCurrentNavKey()] || { currentFolderPath: [], currentFolderId: null }, [activeTab, activeSubcategory, folderNavState]);
  const updateNavState = (updates: Partial<FolderNavState>) => { const key = getCurrentNavKey(); setFolderNavState((prev) => ({ ...prev, [key]: { ...getCurrentNavState(), ...updates } })); };

  const findPathToNode = useCallback((nodes: CourseNode[], targetId: string, path: string[] = []): string[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) return path;
      if (node.children?.length) { const found = findPathToNode(node.children, targetId, [...path, node.id]); if (found) return found; }
    }
    return null;
  }, []);

  const getCurrentFolderContents = useCallback(() => {
    if (!selectedNode || !activeTab) return { folders: [] as FolderItem[], files: [] as UploadedFile[] };
    const navState = getCurrentNavState();
    const tabData = contentData[selectedNode.id]?.[activeTab] || {};
    const subcatData = tabData[activeSubcategory] || [];
    if (!navState.currentFolderId) {
      return { folders: subcatData.filter((i): i is FolderItem => isFolderItem(i) && !i.parentId), files: subcatData.filter((i): i is UploadedFile => isUploadedFile(i) && !i.folderId) };
    }
    const findContents = (items: FolderItem[], id: string): { folders: FolderItem[]; files: UploadedFile[] } => {
      for (const f of items) { if (f.id === id) return { folders: f.subfolders || [], files: f.files || [] }; const res = findContents(f.subfolders || [], id); if (res.folders.length || res.files.length) return res; }
      return { folders: [], files: [] };
    };
    const rootFolders = subcatData.filter((i): i is FolderItem => isFolderItem(i) && !i.parentId);
    return findContents(rootFolders, navState.currentFolderId);
  }, [selectedNode, activeTab, activeSubcategory, contentData, getCurrentNavState]);

  const getFolderItemCount = useCallback((folderId: string): number => {
    if (!selectedNode || !activeTab) return 0;
    const count = (items: FolderItem[], id: string): number => { for (const f of items) { if (f.id === id) return (f.files?.length || 0) + (f.subfolders?.length || 0); const c = count(f.subfolders || [], id); if (c >= 0 && (f.subfolders?.some((s) => s.id === id) || f.subfolders?.some((s) => count([s], id) >= 0))) return c; } return 0; };
    const tabData = contentData[selectedNode.id]?.[activeTab] || {};
    const roots = (tabData[activeSubcategory] || []).filter((i): i is FolderItem => isFolderItem(i) && !i.parentId);
    return count(roots, folderId);
  }, [selectedNode, activeTab, activeSubcategory, contentData]);

const refreshContentData = useCallback(async (node: CourseNode, backendData?: any) => {
  const data = backendData || node.originalData;
  if (!data?.pedagogy) return;
  
  // Create a cache key to prevent redundant processing
  const cacheKey = `${node.id}-${JSON.stringify(data.pedagogy)}`;
  if (lastFetchedDataRef.current === cacheKey) return;
  lastFetchedDataRef.current = cacheKey;
  const processPedagogy = (backendTab: "I_Do" | "We_Do" | "You_Do", frontendTab: "I_Do" | "We_Do" | "You_Do"): SubcategoryData => {
    const section = data.pedagogy[backendTab];
    if (!section) return {};
    
    const result: SubcategoryData = {};
    
    Object.keys(section).forEach((subcatKey) => {
      const subcatData = section[subcatKey];
      if (!subcatData) return;
      
      const frontendKey = subcatKey.toLowerCase().replace(/\s+/g, "_");
      const items: (FolderItem | UploadedFile)[] = [];
      
      // Process ALL items together - folders, files, and pages
      
      // 1. Process folders and their files
      if (subcatData.folders && Array.isArray(subcatData.folders)) {
        const processFolders = (foldersArr: any[], parentId: string | null = null, pathArr: string[] = []): FolderItem[] => {
          const foldersOut: FolderItem[] = [];
          
          (foldersArr || []).forEach((folder) => {
            if (!folder || !folder.name) return;
            
            const fid = folder._id;
            if (!fid) return;
            
            const folderPath = [...pathArr, folder.name];
            
            // Process files inside this folder
            const folderFiles: UploadedFile[] = (folder.files || []).map((file: any) => {
              if (!file) return null;
              
              const fileId = file._id;
              if (!fileId) return null;
              
              const url = typeof file.fileUrl === "string" ? file.fileUrl : file.fileUrl?.base || "";
              const rawMap: Record<string, string> = typeof file.fileUrl === "object" && file.fileUrl !== null ? file.fileUrl : {};
              const resNames: string[] = file.availableResolutions?.length ? file.availableResolutions : Object.keys(rawMap).filter(k => rawMap[k]);
              
              return {
                id: fileId,
                name: file.fileName || "Unnamed",
                type: file.fileType || "unknown",
                size: typeof file.size === "string" ? parseInt(file.size) : (file.size || 0),
                url: url,
                uploadedAt: new Date(file.uploadedAt || Date.now()),
                subcategory: subcatKey,
                folderId: fid,
                folderPath: folderPath.join("/"),
                tags: file.tags?.map((t: any) => ({ 
                  tagName: t.tagName || t.name || "", 
                  tagColor: t.tagColor || t.color || "#3B82F6" 
                })) || [],
                fileSettings: file.fileSettings ? { 
                  showToStudents: file.fileSettings.showToStudents ?? true, 
                  allowDownload: file.fileSettings.allowDownload ?? true 
                } : undefined,
                availableResolutions: resNames,
                fileUrlMap: rawMap,
                description: file.fileDescription || file.description || "",
                isReference: file.fileType === "reference" || file.isReference === true,
                isVideo: file.fileType?.includes("video") || false,
              };
            }).filter(Boolean) as UploadedFile[];
            
            // Process subfolders recursively
            const subfolders = processFolders(folder.subfolders || [], fid, folderPath);
            
            const folderItem: FolderItem = {
              id: fid,
              name: folder.name,
              type: "folder",
              parentId: parentId,
              children: [...subfolders, ...folderFiles],
              tabType: frontendTab,
              subcategory: subcatKey,
              files: folderFiles,
              subfolders: subfolders,
              folderPath: folderPath.join("/"),
              tags: folder.tags || []
            };
            
            foldersOut.push(folderItem);
            items.push(folderItem, ...folderFiles);
          });
          
          return foldersOut;
        };
        
        processFolders(subcatData.folders || []);
      }
      
      // 2. Process root-level files
      if (subcatData.files && Array.isArray(subcatData.files)) {
        const rootFiles: UploadedFile[] = subcatData.files.map((file: any) => {
          if (!file) return null;
          
          const fileId = file._id;
          if (!fileId) return null;
          
          let fileType = file.fileType || "unknown";
          let fileUrl = typeof file.fileUrl === "string" ? file.fileUrl : file.fileUrl?.base || "";
          
          if (fileType?.includes("url") || fileType?.includes("link")) {
            fileType = "url/link";
          }
          
          const rawFileUrlMap: Record<string, string> = typeof file.fileUrl === "object" && file.fileUrl !== null ? file.fileUrl : {};
          const resolvedResolutions: string[] = file.availableResolutions?.length 
            ? file.availableResolutions 
            : Object.keys(rawFileUrlMap).filter(k => rawFileUrlMap[k]);
          
          return {
            id: fileId,
            name: file.fileName || "Unnamed",
            type: fileType,
            size: typeof file.size === "string" ? parseInt(file.size) : (file.size || 0),
            url: fileUrl,
            uploadedAt: new Date(file.uploadedAt || Date.now()),
            subcategory: subcatKey,
            folderId: null,
            tags: file.tags?.map((t: any) => ({ 
              tagName: t.tagName || "", 
              tagColor: t.tagColor || "#3B82F6" 
            })) || [],
            fileSettings: file.fileSettings ? { 
              showToStudents: file.fileSettings.showToStudents ?? true, 
              allowDownload: file.fileSettings.allowDownload ?? true 
            } : undefined,
            availableResolutions: resolvedResolutions,
            fileUrlMap: rawFileUrlMap,
            description: file.fileDescription || file.description || "",
            isReference: fileType === "reference" || file.isReference === true,
            isVideo: fileType?.includes("video") || false,
          };
        }).filter(Boolean) as UploadedFile[];
        
        items.push(...rootFiles);
      }
      
      // 3. Process pages - ADD THEM TO THE SAME ITEMS ARRAY IMMEDIATELY
      if (subcatData.pages && Array.isArray(subcatData.pages)) {
        const pagesMap = new Map();
        
        subcatData.pages.forEach((page: any) => {
          if (!page || !page._id) return;
          if (!pagesMap.has(page._id)) {
            pagesMap.set(page._id, page);
          }
        });
        
        const pagesAsFiles: UploadedFile[] = Array.from(pagesMap.values()).map((page: any) => ({
          id: page._id,
          name: page.title || "Untitled Page",
          type: "page",
          size: 0,
          url: "",
          uploadedAt: new Date(page.createdAt || Date.now()),
          subcategory: subcatKey,
          folderId: null,
          tags: [],
          _combinedCode: page.combinedCode || "",
          _pageCount: page.pageCount || 1,
          _blocks: page.blocks || [],
        }));
        
        // Add pages to the same items array - they will render immediately with other content
        items.push(...pagesAsFiles);
      }
      
      result[frontendKey] = items;
    });
    
    return result;
  };
  
  const updated: ContentData = {
    I_Do: processPedagogy("I_Do", "I_Do"),
    We_Do: processPedagogy("We_Do", "We_Do"),
    You_Do: processPedagogy("You_Do", "You_Do")
  };
  
  // Update contentData in one batch
  setContentData((prev) => ({ ...prev, [node.id]: updated }));
    if (!initialDataLoadedRef.current) {
    initialDataLoadedRef.current = true;
    setInitialLoadComplete(true);
  }
  // Collect all folders for navigation
  const allFolders: FolderItem[] = [];
  const collectFolders = (items: (FolderItem | UploadedFile)[]) => {
    items.forEach((i) => {
      if (isFolderItem(i)) {
        allFolders.push(i);
        collectFolders(i.children || []);
      }
    });
  };
  
  Object.values(updated).forEach((tabData) => {
    Object.values(tabData).forEach(collectFolders);
  });
  
  setFolders(allFolders);
    setInitialLoadComplete(true);
  setIsInitialLoad(false);
}, []);


const fetchAndRefresh = useCallback(async (node: CourseNode) => {
  const fetchKey = `${node.id}`;
  if (isFetchingRef.current === fetchKey) return;
  isFetchingRef.current = fetchKey;
  
  // Set loading state
  setIsContentLoading(true);
  
  try {
    const BASE_URL = "http://localhost:5533";
    const token = typeof window !== "undefined" ? localStorage.getItem("smartcliff_token") : null;
    
    const courseRes = await fetch(`${BASE_URL}/getAll/courses-data/${courseId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    
    if (!courseRes.ok) {
      await refreshContentData(node);
      return;
    }
    
    const courseJson = await courseRes.json();
    if (!courseJson?.data) {
      await refreshContentData(node);
      return;
    }
    
    const findInFresh = (modules: any[]): any | null => {
      for (const mod of modules) {
        if (mod._id === node.id) return mod;
        for (const topic of mod.topics || []) {
          if (topic._id === node.id) return topic;
          for (const st of topic.subTopics || []) {
            if (st._id === node.id) return st;
          }
        }
        for (const sm of mod.subModules || []) {
          if (sm._id === node.id) return sm;
          for (const topic of sm.topics || []) {
            if (topic._id === node.id) return topic;
            for (const st of topic.subTopics || []) {
              if (st._id === node.id) return st;
            }
          }
        }
      }
      return null;
    };
    
    const freshNodeData = findInFresh(courseJson.data.modules || []);
    if (freshNodeData) {
      const freshNode: CourseNode = { ...node, originalData: freshNodeData };
      
      const nodeChanged = JSON.stringify(node.originalData) !== JSON.stringify(freshNodeData);
      
      if (nodeChanged) {
        const transformed = transformToCourseNodes(courseJson.data);
        setCourseData(transformed);
        setSelectedNode(freshNode);
      }
      
      await refreshContentData(freshNode);
    } else {
      await refreshContentData(node);
    }
    
    setInitialLoadComplete(true);
  } catch (err) {
    console.error("fetchAndRefresh error:", err);
    await refreshContentData(node);
  } finally {
    setIsContentLoading(false);
    isFetchingRef.current = null;
  }
}, [courseId, refreshContentData]);

  const generateBreadcrumbs = useCallback((node: CourseNode | null): BreadcrumbItem[] => {
    const base: BreadcrumbItem[] = [{ label: "Dashboard", type: "dashboard", id: "dashboard", path: "/lms/pages/dashboard" }, { label: "Courses", type: "courses", id: "courses", path: "/lms/pages/courses" }];
    if (!node || !courseData.length) return base;
    const findPath = (nodes: CourseNode[], id: string, path: CourseNode[] = []): CourseNode[] | null => { for (const n of nodes) { if (n.id === id) return [...path, n]; const found = findPath(n.children || [], id, [...path, n]); if (found) return found; } return null; };
    const nodePath = findPath(courseData, node.id);
    if (!nodePath) return [...base, { label: courseStructureResponse?.data?.courseName || "Course", type: "course", id: courseId || "" }];
    return [...base, { label: courseStructureResponse?.data?.courseName || "Course", type: "course", id: nodePath.find((n) => n.type === "course")?.id || courseId || "" }, ...nodePath.filter((n) => n.type !== "course").map((n) => ({ label: n.name, type: n.type, id: n.id }))];
  }, [courseData, courseStructureResponse, courseId]);

  const selectNode = useCallback(async (node: CourseNode) => {
  // Prevent duplicate selections
  if (selectedNode?.id === node.id) return;
  
  setContentData((prev) => {
    const n = { ...prev };
    delete n[node.id];
    return n;
  });
  
setIsNodeSelected(true);
  setIsContentLoading(true);
  
  setContentData((prev) => {
    const n = { ...prev };
    delete n[node.id];
    return n;
  });
  
  setSelectedNodePersistent(node);  
  const findModuleId = (n: CourseNode, nodes: CourseNode[]): string | null => {
    if (n.type === "module") return n.id;
    const findInPath = (ns: CourseNode[], tid: string, path: CourseNode[] = []): CourseNode | null => {
      for (const x of ns) {
        if (x.id === tid) return path.find((p) => p.type === "module") || null;
        const found = findInPath(x.children || [], tid, [...path, x]);
        if (found) return found;
      }
      return null;
    };
    return findInPath(nodes, n.id)?.id || null;
  };
  
  const prevModuleId = selectedNode ? findModuleId(selectedNode, courseData) : null;
  const newModuleId = findModuleId(node, courseData);
  const isSameModule = prevModuleId === newModuleId && prevModuleId !== null;
  
  if (node.type === "topic" || node.type === "subtopic") {
    if (isSameModule && activeTab && activeSubcategory) {
      updateURL({ nodeId: node.id, activeTab, activeSubcategory });
    } else {
      setActiveTabPersistent("I_Do");
      const firstSub = subcategories.I_Do[0]?.key || "";
      setActiveSubcategoryPersistent(firstSub);
      updateURL({ nodeId: node.id, activeTab: "I_Do", activeSubcategory: firstSub });
    }
  } else {
    updateURL({ nodeId: node.id, activeTab, activeSubcategory });
  }
  
  const path = findPathToNode(courseData, node.id);
  if (path?.length) {
    setExpandedNodes((prev) => {
      const n = new Set(prev);
      path.forEach((id) => n.add(id));
      setLS("lms_expanded_nodes", JSON.stringify([...n]));
      return n;
    });
  }
  
  updateNavState({ currentFolderPath: [], currentFolderId: null });
  setBreadcrumbs(generateBreadcrumbs(node));
  
  // Only fetch if needed
  if (!contentData[node.id] && !isContentLoading) {
    await fetchAndRefresh(node);
  }
  
  setIsContentLoading(false);
}, [courseData, selectedNode, activeTab, activeSubcategory, subcategories, findPathToNode, generateBreadcrumbs, fetchAndRefresh, contentData, isContentLoading]);



const getParentNodeName = useCallback((node: CourseNode, targetType: string): string => {
    const findParent = (nodes: CourseNode[], id: string, parent: CourseNode | null = null): CourseNode | null => { for (const n of nodes) { if (n.id === id) return parent; const found = findParent(n.children || [], id, n); if (found) return found; } return null; };
    const parent = findParent(courseData, node.id);
    if (!parent) return ""; if (parent.type === targetType) return parent.name; return getParentNodeName(parent, targetType);
  }, [courseData]);

  const toggleNode = (nodeId: string) => { setExpandedNodes((prev) => { const n = new Set(prev); if (n.has(nodeId)) n.delete(nodeId); else n.add(nodeId); setLS("lms_expanded_nodes", JSON.stringify([...n])); return n; }); };

  const navigateToFolder = (folderId: string, folderName: string) => {
    const findFolder = (items: (FolderItem | UploadedFile)[], id: string): FolderItem | null => { for (const item of items) { if (isFolderItem(item)) { if (item.id === id) return item; const found = findFolder(item.subfolders || [], id); if (found) return found; } } return null; };
    if (selectedNode && activeTab) { const tabData = contentData[selectedNode.id]?.[activeTab] || {}; const subcatData = tabData[activeSubcategory] || []; const found = findFolder(subcatData, folderId); if (found) { const fullPath = found.folderPath ? found.folderPath.split("/") : [found.name]; updateNavState({ currentFolderId: folderId, currentFolderPath: fullPath }); return; } }
    const findInFolders = (fols: FolderItem[], id: string): FolderItem | null => { for (const f of fols) { if (f.id === id) return f; const found = findInFolders(f.subfolders || [], id); if (found) return found; } return null; };
    const fromState = findInFolders(folders, folderId);
    if (fromState) updateNavState({ currentFolderId: folderId, currentFolderPath: fromState.folderPath ? fromState.folderPath.split("/") : [fromState.name] });
    else { showErrorToast(`Folder "${folderName}" not found`); updateNavState({ currentFolderPath: [], currentFolderId: null }); }
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !selectedNode) return;
    setIsButtonLoading(true);
    try {
      const navState = getCurrentNavState();
      const response = await entityApi.createFolder(selectedNode.type as any, selectedNode.id, { tabType: toBackendTab(activeTab), subcategory: activeSubcategory, folderName: newFolderName.trim(), folderPath: navState.currentFolderPath.join("/"), courses: selectedNode.originalData?.courses || "", topicId: selectedNode.originalData?.topicId || "", index: selectedNode.originalData?.index || 0, title: selectedNode.originalData?.title || "", description: selectedNode.originalData?.description || "", duration: selectedNode.originalData?.duration || "", level: selectedNode.originalData?.level || "", action: "createFolder", tags: folderTags.map((t) => ({ tagName: t.tagName, tagColor: t.tagColor })) });
      await fetchAndRefresh(selectedNode);
      setNewFolderName(""); setShowCreateFolderModal(false); setFolderTags([]); setEditingFolder(null);
      showSuccessToast("Folder created!");
    } catch { showErrorToast("Failed to create folder"); } finally { setIsButtonLoading(false); }
  };

const saveEditFolder = async () => {
  if (!editingFolder || !editFolderName.trim() || !selectedNode) return;
  try {
    const navState = getCurrentNavState();
    const response = await entityApi.updateFolder(
      selectedNode.type as any, 
      selectedNode.id, 
      { 
        tabType: toBackendTab(activeTab), 
        subcategory: activeSubcategory, 
        folderName: editFolderName.trim(), 
        folderPath: navState.currentFolderPath.join("/"), 
        originalFolderName: editingFolder.name, 
        courses: selectedNode.originalData?.courses || "", 
        topicId: selectedNode.originalData?.topicId || "", 
        action: "updateFolder",
        tags: folderTags.map((t) => ({ tagName: t.tagName, tagColor: t.tagColor })) // ← ADD THIS
      }
    );
    await fetchAndRefresh(selectedNode);
    setShowCreateFolderModal(false); 
    setEditingFolder(null); 
    setEditFolderName(""); 
    setFolderTags([]);
    showSuccessToast("Updated successfully");
  } catch { 
    showErrorToast("Failed to update folder"); 
    await refreshContentData(selectedNode); 
  }
};

  // deleteFolder — replace both refresh calls
  const deleteFolder = async (folder: FolderItem) => {
    if (!selectedNode) return;
    setIsDeleting(true);
    try {
      const pathParts = (folder.folderPath || folder.name).split("/").filter(Boolean);
      const folderName = pathParts.pop();
      await entityApi.deleteFolder(selectedNode.type as any, selectedNode.id, {
        tabType: toBackendTab(activeTab),
        subcategory: activeSubcategory,
        folderName: folderName || "",
        folderPath: pathParts.join("/"),
        courses: selectedNode.originalData?.courses || "",
        action: "deleteFolder",
      });
      await fetchAndRefresh(selectedNode);       // ← server fetch first
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      showSuccessToast(`Folder "${folder.name}" deleted!`);
    } catch {
      showErrorToast("Failed to delete folder");
      await fetchAndRefresh(selectedNode);
    } finally {
      setIsDeleting(false);
    }
  };

  // deleteFile — replace refresh call
  const deleteFile = async (fileId: string) => {
    if (!selectedNode) return;
    setIsDeleting(true);
    try {
      const navState = getCurrentNavState();
      await entityApi.deleteFile(selectedNode.type as any, selectedNode.id, {
        tabType: toBackendTab(activeTab),
        subcategory: activeSubcategory,
        folderPath: navState.currentFolderPath.join("/"),
        action: "deleteFile",
        updateFileId: fileId,
      });
      await fetchAndRefresh(selectedNode);       // ← server fetch first
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      showSuccessToast("File deleted!");
    } catch {
      showErrorToast("Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  // handleDeletePage — replace refresh call


const resetUploadModalStates = () => { 
  setShowUploadModal(false); 
  setSelectedFileType(""); 
  setUploadingFiles([]); 
  setUpdateFileId(null); 
  setFileNames({}); 
  setSelectedFiles([]); 
  setUploadDescription(""); 
  setUploadTags([]); 
  setUploadCurrentTag(""); 
  setUploadTagColor("#3B82F6"); 
  setUploadAccessLevel("private"); 
  setFolderUrl(""); 
  setUrlFileName(""); 
  setUrlFileType("url/link"); 
  setIsButtonLoading(false); 
  setText(""); 
  // Clear file display names for update mode
  setFileDisplayNames({});
};
const handleFileSelection = (files: FileList | null) => {
  if (!files?.length) return;
  
  // For update mode - REPLACE the existing selection with the new file
  if (updateFileId) {
    const existingFileName = fileDisplayNames[updateFileId] || "";
    
    // IMPORTANT: Clear all existing selections and uploading files first
    setSelectedFiles([]);
    setUploadingFiles([]);
    
    const newDisplay: Record<string, string> = {};
    const newSelectedFiles = Array.from(files);
    
    // Set the display name for the new file
    newSelectedFiles.forEach((f) => {
      newDisplay[f.name] = existingFileName || (selectedFileType === "reference" ? "Reference Material" : f.name);
    });
    
    setFileDisplayNames({ ...newDisplay });
    setSelectedFiles(newSelectedFiles);
    
    // Create the new uploading file
    const newUploadingFiles: UploadedFile[] = newSelectedFiles.map((f, i) => ({ 
      id: `${Date.now()}-${i}-${Math.random()}`, // Always use a unique ID for the new file
      name: newDisplay[f.name] || f.name, 
      progress: 0, 
      status: "preparing" as const, 
      subcategory: activeSubcategory, 
      folderId: getCurrentNavState().currentFolderId, 
      type: f.type || "unknown", 
      size: f.size, 
      url: "", 
      uploadedAt: new Date(), 
      tags: [], 
      folderPath: getCurrentNavState().currentFolderPath.join("/"), 
      isReference: selectedFileType === "reference", 
      isVideo: f.type.startsWith("video/") 
    }));
    
    setUploadingFiles(newUploadingFiles);
    
    // Simulate upload progress for the new file
    newUploadingFiles.forEach((u) => { 
      let p = 0; 
      const interval = setInterval(() => { 
        p += 10; 
        if (p < 100) {
          setUploadingFiles((prev) => prev.map((f) => f.id === u.id ? { ...f, progress: p, status: "uploading" } : f));
        } else { 
          clearInterval(interval); 
          setUploadingFiles((prev) => prev.map((f) => f.id === u.id ? { ...f, progress: 100, status: "ready" } : f)); 
        } 
      }, 100); 
    });
    
  } else {
    // For new files (multiple files allowed)
    const newDisplay: Record<string, string> = {};
    const newSelectedFiles = Array.from(files);
    
    newSelectedFiles.forEach((f) => {
      newDisplay[f.name] = selectedFileType === "reference" ? "Reference Material" : f.name;
    });
    
    setFileDisplayNames((prev) => ({ ...prev, ...newDisplay }));
    setSelectedFiles(newSelectedFiles);
    
    const newUploadingFiles: UploadedFile[] = newSelectedFiles.map((f, i) => ({ 
      id: `${Date.now()}-${i}`, 
      name: newDisplay[f.name] || f.name, 
      progress: 0, 
      status: "preparing" as const, 
      subcategory: activeSubcategory, 
      folderId: getCurrentNavState().currentFolderId, 
      type: f.type || "unknown", 
      size: f.size, 
      url: "", 
      uploadedAt: new Date(), 
      tags: [], 
      folderPath: getCurrentNavState().currentFolderPath.join("/"), 
      isReference: selectedFileType === "reference", 
      isVideo: f.type.startsWith("video/") 
    }));
    
    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);
    
    // Simulate upload progress for new files
    newUploadingFiles.forEach((u) => { 
      let p = 0; 
      const interval = setInterval(() => { 
        p += 10; 
        if (p < 100) {
          setUploadingFiles((prev) => prev.map((f) => f.id === u.id ? { ...f, progress: p, status: "uploading" } : f));
        } else { 
          clearInterval(interval); 
          setUploadingFiles((prev) => prev.map((f) => f.id === u.id ? { ...f, progress: 100, status: "ready" } : f)); 
        } 
      }, 100); 
    });
  }
};
// Add this useEffect to reset file input when selections are cleared
useEffect(() => {
  if (uploadingFiles.length === 0 && fileInputRef.current) {
    fileInputRef.current.value = '';
  }
}, [uploadingFiles]);
const handleFileUpload = async (files: FileList | null, tabType: "I_Do" | "We_Do" | "You_Do" | null, subcategory: string) => {
  if (!files || !selectedNode) return;
  
  const navState = getCurrentNavState();
  const formData = new FormData();
  
  // Add hierarchy info
  if (selectedNode.originalData) { 
    formData.append("courses", selectedNode.originalData.courses || ""); 
    formData.append("topicId", selectedNode.originalData.topicId || ""); 
    formData.append("index", String(selectedNode.originalData.index || 0)); 
    formData.append("title", selectedNode.originalData.title || ""); 
  }
  
  // Add file type
  if (selectedFileType) formData.append("selectedFileType", selectedFileType);
  
  // Add file settings
  const fileId = updateFileId || "temp"; 
  const fSettings = documentSettings[fileId];
  formData.append("showToStudents", fSettings ? String(fSettings.studentShow) : "true");
  formData.append("allowDownload", fSettings ? String(fSettings.downloadAllow) : "true");
  
  // Add files
  Array.from(files).forEach((f) => formData.append("files", f));
  
  // Add tab and subcategory info
  formData.append("tabType", toBackendTab(tabType)); 
  formData.append("subcategory", subcategory);
  
  // Add folder path
  const fp = navState.currentFolderPath.join("/"); 
  if (fp) formData.append("folderPath", fp);

  // Add tags and description
  const validTags = uploadTags.filter(t => t.tagName && t.tagName.trim());
  if (validTags.length) formData.append("tags", JSON.stringify(validTags));
  if (uploadDescription) formData.append("fileDescription", uploadDescription);

  formData.append("isUpdate", "false");

  try {
    const response = await entityApi.updateEntity(selectedNode.type as any, selectedNode.id, formData);
    if (response.data) {
      setUploadingFiles((prev) => prev.map((f) => f.status === "uploading" ? { ...f, status: "completed", progress: 100 } : f));
      await fetchAndRefresh(selectedNode);
      setUploadingFiles([]);
      resetUploadModalStates();
      showSuccessToast("Upload completed!");
    }
  } catch (err: any) { 
    setUploadingFiles((prev) => prev.map((f) => f.status === "uploading" ? { ...f, status: "error" } : f)); 
    setIsButtonLoading(false); 
    const _msg = axios.isAxiosError(err) ? (typeof err.response?.data?.message === "string" ? err.response?.data?.message : JSON.stringify(err.response?.data ?? err.message)) : (err?.message || String(err)); 
    showErrorToast(`Upload failed: ${_msg}`); 
  }
};

  const buildFullHierarchyInfo = useCallback((): HierarchyInfo | undefined => {
    if (!selectedNode || !courseData.length) return undefined;
    const findNodePath = (nodes: CourseNode[], targetId: string, path: CourseNode[] = []): CourseNode[] | null => { for (const node of nodes) { if (node.id === targetId) return [...path, node]; if (node.children?.length) { const found = findNodePath(node.children, targetId, [...path, node]); if (found) return found; } } return null; };
    const path = findNodePath(courseData, selectedNode.id) ?? [selectedNode];
    const navState = getCurrentNavState();
    const courseNode = path.find((n) => n.type === "course"); const moduleNode = path.find((n) => n.type === "module"); const submoduleNode = path.find((n) => n.type === "submodule"); const topicNode = path.find((n) => n.type === "topic"); const subtopicNode = path.find((n) => n.type === "subtopic");
    return { courseId: courseNode?.id ?? courseData[0]?.id ?? "", courseName: courseNode?.name ?? courseStructureResponse?.data?.courseName ?? "", moduleId: moduleNode?.id, moduleName: moduleNode?.name, subModuleId: submoduleNode?.id, subModuleName: submoduleNode?.name, topicId: topicNode?.id, topicName: topicNode?.name, subTopicId: subtopicNode?.id, subTopicName: subtopicNode?.name, tabType: activeTab ?? undefined, subcategory: activeSubcategory || undefined, folderPath: navState.currentFolderPath.length > 0 ? navState.currentFolderPath : undefined, folderId: navState.currentFolderId ?? undefined, nodeType: selectedNode.type };
  }, [selectedNode, courseData, courseStructureResponse, activeTab, activeSubcategory, getCurrentNavState]);

const handleFileUpdate = async (files: FileList | null) => {
  // If no files selected and we're in update mode, update metadata only
  if ((!files || files.length === 0) && updateFileId) {
    const navState = getCurrentNavState();
    const formData = new FormData();
    
    // Add hierarchy info
    if (selectedNode?.originalData) { 
      formData.append("courses", selectedNode.originalData.courses || ""); 
      formData.append("topicId", selectedNode.originalData.topicId || ""); 
      formData.append("index", String(selectedNode.originalData.index || 0)); 
      formData.append("title", selectedNode.originalData.title || "");
    }
    
    // Add update metadata
    formData.append("tabType", toBackendTab(updateTabType)); 
    formData.append("subcategory", updateSubcategory); 
    formData.append("isUpdate", "true"); 
    formData.append("updateFileId", updateFileId);
    formData.append("updateFileName", fileDisplayNames[updateFileId] || "");
    formData.append("metadataOnly", "true"); // Flag to indicate metadata-only update
    
    // Add file settings
    const fSettings = documentSettings[updateFileId] || { studentShow: true, downloadAllow: true };
    formData.append("showToStudents", String(fSettings.studentShow)); 
    formData.append("allowDownload", String(fSettings.downloadAllow));
    
    // Add folder path
    const fp = navState.currentFolderPath.join("/"); 
    if (fp) formData.append("folderPath", fp);
    
    // Add tags and description
    if (uploadTags.length) formData.append("tags", JSON.stringify(uploadTags));
    if (uploadDescription) formData.append("fileDescription", uploadDescription); // Make sure this is sent
    
    try {
      const response = await entityApi.updateEntity(selectedNode.type as any, selectedNode.id, formData);
      await fetchAndRefresh(selectedNode);
      setUploadingFiles([]);
      resetUploadModalStates();
      showSuccessToast("File metadata updated successfully!");
      setIsButtonLoading(false);
    } catch (err: any) { 
      setIsButtonLoading(false); 
      showErrorToast(`Update failed: ${axios.isAxiosError(err) ? err.response?.data?.message : err.message}`); 
    }
    return;
  }

  
  // If files are selected, proceed with file content update
  if (!files || !selectedNode || !updateFileId || files.length !== 1) {
    if (updateFileId) {
      setIsButtonLoading(false);
      showErrorToast("Please select a file to update");
    }
    return;
  }
  
  const file = files[0]; 
  const navState = getCurrentNavState(); 
  const formData = new FormData();
  
  // Add hierarchy info
  if (selectedNode.originalData) { 
    formData.append("courses", selectedNode.originalData.courses || ""); 
    formData.append("topicId", selectedNode.originalData.topicId || ""); 
    formData.append("index", String(selectedNode.originalData.index || 0)); 
    formData.append("title", selectedNode.originalData.title || "");
  }
  
  // Add file and update info
  formData.append("files", file); 
  formData.append("tabType", toBackendTab(updateTabType)); 
  formData.append("subcategory", updateSubcategory); 
  formData.append("isUpdate", "true"); 
  formData.append("updateFileId", updateFileId);
  formData.append("updateFileName", fileDisplayNames[updateFileId] || "");
  formData.append("metadataOnly", "false");
  
  // Add file settings
  const fSettings = documentSettings[updateFileId] || { studentShow: true, downloadAllow: true };
  formData.append("showToStudents", String(fSettings.studentShow)); 
  formData.append("allowDownload", String(fSettings.downloadAllow));
  
  // Add folder path
  const fp = navState.currentFolderPath.join("/"); 
  if (fp) formData.append("folderPath", fp);
  
  // Add tags and description
  if (uploadTags.length) formData.append("tags", JSON.stringify(uploadTags));
  if (uploadDescription) formData.append("fileDescription", uploadDescription);
  
  try {
    const response = await entityApi.updateEntity(selectedNode.type as any, selectedNode.id, formData);
    await fetchAndRefresh(selectedNode);
    setUploadingFiles([]);
    resetUploadModalStates();
    showSuccessToast("File updated successfully!");
    setIsButtonLoading(false);
  } catch (err: any) { 
    setIsButtonLoading(false); 
    showErrorToast(`Update failed: ${axios.isAxiosError(err) ? err.response?.data?.message : err.message}`); 
  }
};

const initiateFileUpdate = (file: UploadedFile, tabType: "I_Do" | "We_Do" | "You_Do", subcategory: string) => {
  console.log("Initiating file update for:", file);
  console.log("File description from data:", file.description); // Use file.description directly
  
  setUpdateFileId(file.id); 
  setUpdateTabType(tabType); 
  setUpdateSubcategory(subcategory);
  
  const fileType = file.type || ""; 
  const matchedFileType = fileTypes.find((t) => fileType.includes(t.key));
  const selectedTypeKey = matchedFileType?.key || "";
  
  setUpdateFileType(selectedTypeKey); 
  setSelectedFileType(selectedTypeKey);
  
  // IMPORTANT: Set the file display name for the update
  setFileDisplayNames({ [file.id]: file.name });
  
  // FIX: Use file.description directly since that's where it's stored in the UploadedFile type
  const fileDescription = file.description || "";
  setUploadDescription(fileDescription);
  
  setUploadTags(file.tags || []); 
  setUploadAccessLevel(file.accessLevel || "private");
  
  if (file.id) {
    setDocumentSettings((prev) => ({ 
      ...prev, 
      [file.id]: { 
        studentShow: file.fileSettings?.showToStudents ?? true, 
        downloadAllow: file.fileSettings?.allowDownload ?? true 
      } 
    }));
  }
  
  // Handle URL files
  if (fileType.includes("url") || fileType.includes("link")) { 
    let url = typeof file.url === "string" ? file.url : (file.url as any)?.base || ""; 
    setFolderUrl(url); 
    setUrlFileName(file.name || ""); 
    setUrlFileType(file.type || "url/link"); 
  } else { 
    setFolderUrl(""); 
    setUrlFileName(""); 
    setUrlFileType("url/link"); 
  }
  
  setSelectedFiles([]); 
  setUploadingFiles([]); 
  setShowUploadModal(true);
};
useEffect(() => {
  if (showUploadModal && uploadDescription) {
    // Force a small delay to ensure Editor is mounted
    const timer = setTimeout(() => {
      // Trigger a re-render of the Editor by toggling a key
      setEditorKey(Date.now());
    }, 100);
    return () => clearTimeout(timer);
  }
}, [showUploadModal, uploadDescription]);

// Add state for editor key
const [editorKey, setEditorKey] = useState(Date.now());
  const handleFileClick = (file: UploadedFile, tabType: "I_Do" | "We_Do" | "You_Do" | null, subcategory: string) => {
    const fileUrl = typeof file.url === "string" ? file.url : (file.url as any)?.base || "";
    if (!fileUrl) { alert("File URL is missing"); return; }
    const name = (file.name || "").toLowerCase(); const type = (file.type || "").toLowerCase();
    if (type.includes("url") || type.includes("link")) { window.open(fileUrl, "_blank", "noopener,noreferrer"); return; }
    if (name.endsWith(".pdf") || type.includes("pdf")) { setCurrentPDFUrl(fileUrl); setCurrentPDFName(file.name); setCurrentPDFFileId(file.id); setShowPDFViewer(true); return; }
    if (name.endsWith(".ppt") || name.endsWith(".pptx") || type.includes("presentation")) { setCurrentPPTUrl(fileUrl); setCurrentPPTName(file.name); setCurrentPPTFileId(file.id); setShowPPTViewer(true); return; }
    const videoExts = [".mp4", ".avi", ".mov", ".mkv", ".webm"];
    if (type.includes("video") || videoExts.some((e) => name.endsWith(e))) { const all = extractVideos(selectedNode!); const idx = all.findIndex((v) => v.id === file.id || v.fileName === file.name); setCurrentVideoUrl(fileUrl); setCurrentVideoName(file.name); setCurrentVideoFileId(file.id); setCurrentVideoResolutions(file.availableResolutions || []); setCurrentVideoFileUrlMap(file.fileUrlMap || {}); setVideoPlaylist(all); setCurrentVideoIndex(idx >= 0 ? idx : 0); setShowVideoViewer(true); return; }
    const zipExts = [".zip", ".rar", ".7z", ".tar", ".gz"];
    if (type.includes("zip") || zipExts.some((e) => name.endsWith(e))) { setCurrentZipUrl(fileUrl); setCurrentZipName(file.name); setShowZipViewer(true); return; }
    window.open(fileUrl, "_blank");
  };

  const extractVideos = (node: CourseNode): VideoItem[] => {
    const videos: VideoItem[] = []; if (!node.originalData?.pedagogy) return videos;
    const process = (section: any) => { if (!section) return; Object.values(section).forEach((sub: any) => { sub?.files?.forEach((f: any) => { if (f.isVideo || f.fileType?.includes("video")) { const url = typeof f.fileUrl === "string" ? f.fileUrl : f.fileUrl?.base || ""; const rawMap: Record<string, string> = typeof f.fileUrl === "object" && f.fileUrl !== null ? f.fileUrl : {}; const resNames: string[] = f.availableResolutions?.length ? f.availableResolutions : Object.keys(rawMap).filter(k => rawMap[k]); videos.push({ id: f._id || `${Date.now()}`, title: f.fileName, fileName: f.fileName, fileUrl: url, availableResolutions: resNames, fileUrlMap: rawMap, isVideo: true }); } }); }); };
    process(node.originalData.pedagogy.I_Do); process(node.originalData.pedagogy.We_Do); process(node.originalData.pedagogy.You_Do);
    return videos;
  };

  const extractFileNameFromUrl = (url: string) => { try { return decodeURIComponent(url).split("/").pop()?.split("?")[0] || "link"; } catch { return "link"; } };
  const addTag = async (name: string, color: string = "#3B82F6") => { if (!name || folderTags.some((t) => t.tagName === name)) return; setLoading(true); setSuccess(false); await new Promise((r) => setTimeout(r, 500)); setFolderTags((prev) => [...prev, { tagName: name, tagColor: color }]); setCurrentTag(""); setLoading(false); setSuccess(true); };
  const removeTag = (i: number) => setFolderTags((prev) => prev.filter((_, idx) => idx !== i));
  const addUploadTag = async (name: string, color: string) => { if (!name || uploadTags.some((t) => t.tagName === name)) return; setUploadTags((prev) => [...prev, { tagName: name, tagColor: color }]); setUploadCurrentTag(""); };
  const removeUploadTag = (i: number) => setUploadTags((prev) => prev.filter((_, idx) => idx !== i));
  const doDeletePage = async (pageId: string, name: string) => {
    if (!selectedNode) return;
    setIsDeleting(true);
    try {
      const navState = getCurrentNavState();
      await entityApi.deletePage(
        selectedNode.type as "module" | "submodule" | "topic" | "subtopic",
        selectedNode.id,
        pageId,
        {
          tabType: toBackendTab(activeTab),
          subcategory: activeSubcategory,
          folderPath: navState.currentFolderPath.length > 0
            ? navState.currentFolderPath.join(",")
            : "",
        }
      );
      await fetchAndRefresh(selectedNode);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      showSuccessToast(`Page "${name}" deleted`);
    } catch (err) {
      console.error("Delete page failed:", err);
      showErrorToast("Failed to delete page. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePage = async (pageId: string, name: string) => {
    if (!selectedNode) return;
    // Remove the confirm() alert — use the modal instead
    setDeleteTarget({ type: "file", item: { id: pageId, isPage: true }, name });
    setShowDeleteConfirm(true);
  };
useEffect(() => {
  if (courseStructureResponse?.data && !hasInitialized.current) {
    hasInitialized.current = true;
    const transformed = transformToCourseNodes(courseStructureResponse.data);
    setCourseData(transformed);
    
    // Only expand root node once
    const savedExpanded = getLS("lms_expanded_nodes");
    if (!savedExpanded) {
      setExpandedNodes(new Set([courseStructureResponse.data._id]));
    } else {
      try {
        setExpandedNodes(new Set(JSON.parse(savedExpanded)));
      } catch {
        setExpandedNodes(new Set([courseStructureResponse.data._id]));
      }
    }
    
    // REMOVE auto-selection - let user choose from sidebar
    // Don't automatically select first module
  }
}, [courseStructureResponse?.data]);

  useEffect(() => { setBreadcrumbs(generateBreadcrumbs(selectedNode)); }, [selectedNode, courseData, generateBreadcrumbs]);
useEffect(() => {
  if (selectedNode && !isRestoringFromAnalytics && !contentData[selectedNode.id]) {
    fetchAndRefresh(selectedNode);
  }
}, [selectedNode?.id]); // Only depends on node ID, not the whole object
useEffect(() => {
  if (!courseData.length) return;
  
  const params = new URLSearchParams(window.location.search);
  if (params.get("fromAnalytics") === "true") {
    setIsRestoringFromAnalytics(true);
    
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("fromAnalytics");
    window.history.replaceState({}, "", cleanUrl.toString());
    
    const storedTab = getLS("lms_selected_tab") as "I_Do" | "We_Do" | "You_Do" | null;
    const storedSub = getLS("lms_selected_subcategory");
    const storedId = getLS("lms_selected_node_id");
    
    if (storedTab) setActiveTabPersistent(storedTab);
    if (storedSub) setActiveSubcategoryPersistent(storedSub);
    
    if (storedId) {
      const findNode = (nodes: CourseNode[]): CourseNode | null => {
        for (const n of nodes) {
          if (n.id === storedId) return n;
          const found = findNode(n.children || []);
          if (found) return found;
        }
        return null;
      };
      
      const found = findNode(courseData);
      if (found) {
        setSelectedNodePersistent(found);
        const path = findPathToNode(courseData, storedId);
        if (path) {
          setExpandedNodes((prev) => {
            const n = new Set(prev);
            path.forEach((id) => n.add(id));
            return n;
          });
        }
      }
    }
    
    setTimeout(() => setIsRestoringFromAnalytics(false), 300);
  }
}, [courseData]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => { if (e.clientX >= 200 && e.clientX <= 500) setSidebarWidth(e.clientX); };
    const onUp = () => setIsResizing(false);
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [isResizing]);

  const handleUpdateFileSettings = async (fileId: string, settings: { studentShow: boolean; downloadAllow: boolean }) => {
    if (!selectedNode) return;
    try {
      const navState = getCurrentNavState();
      await updateFileSettingsInComponent(selectedNode.type as any, selectedNode.id, { tabType: toBackendTab(activeTab), subcategory: activeSubcategory, fileId, studentShow: settings.studentShow, downloadAllow: settings.downloadAllow, folderPath: navState.currentFolderPath.join("/"), originalData: selectedNode.originalData });
      setDocumentSettings((prev) => ({ ...prev, [fileId]: settings })); showSuccessToast("File settings updated!");
    } catch { showErrorToast("Failed to update file settings"); }
  };



  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem("smartcliff_token"),
  })
  const user = userData?.user || null

  const checkDummyStudentStatus = () => {
    try {
      const stored = localStorage.getItem('smartcliff_roleSwitch')
      if (stored) {
        const data = JSON.parse(stored)
        setIsDummyStudent(data.isDummyStudent || false)
        if (data.originalRole || data.originalRenameRole) {
          setOriginalRoleInfo({ roleName: data.originalRole || '', renameRole: data.originalRenameRole || '' })
        }
      }
    } catch { }
  }

  useEffect(() => {
    checkDummyStudentStatus()
    const handleStorage = () => checkDummyStudentStatus()
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getUserInitials = () => {
    if (!user) return "SC"
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const isActualStudent = () => {
    if (!user) return false
    return user.role?.roleName?.toLowerCase().includes('student') || user.role?.renameRole?.toLowerCase().includes('student')
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      localStorage.clear()
      toast.success("Logged out successfully")
      router.push("/login")
    } catch { toast.error("Logout failed") }
    finally { setIsLoggingOut(false) }
  }

  const handleProfileClick = () => {
    setShowUserMenu(false)
    router.push("/lms/pages/studentdashboard/student/profile")
  }

  const handleSwitchToStudent = () => {
    try {
      const data = { isDummyStudent: true, originalRole: user?.role?.roleName || '', originalRenameRole: user?.role?.renameRole || '', switchTimestamp: Date.now() }
      localStorage.setItem('smartcliff_roleSwitch', JSON.stringify(data))
      localStorage.setItem('smartcliff_isDummyStudent', 'true')
      setIsDummyStudent(true)
      setOriginalRoleInfo({ roleName: user?.role?.roleName || '', renameRole: user?.role?.renameRole || '' })
      setShowUserMenu(false)
      toast.success("Switched to Student View")
      router.push("/lms/pages/courses")
      setTimeout(() => window.dispatchEvent(new Event('storage')), 100)
    } catch { toast.error("Failed to switch role") }
  }

  const handleSwitchBackToOriginal = () => {
    try {
      localStorage.removeItem('smartcliff_roleSwitch')
      localStorage.removeItem('smartcliff_isDummyStudent')
      setIsDummyStudent(false)
      setOriginalRoleInfo(null)
      setShowUserMenu(false)
      toast.success(`Switched back to ${originalRoleInfo?.renameRole || 'your original role'}`)
      const role = originalRoleInfo?.renameRole?.toLowerCase() || ''
      if (role.includes('poc')) router.push("/lms/pages/poc/dashboard")
      else if (role.includes('admin')) router.push("/lms/pages/admin/dashboard")
      else router.push("/lms/pages/dashboard")
      setTimeout(() => window.dispatchEvent(new Event('storage')), 100)
    } catch { toast.error("Failed to switch role") }
  }
// Add this loading component inside your DynamicLMSCoordinator (before the return)
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-full w-full" style={{ background: T.bg }}>
    <div className="relative">
      {/* Main spinner */}
      <div className="w-16 h-16 border-4 rounded-full" style={{ borderColor: `${T.orange}20`, borderTopColor: T.orange }}>
        <div className="absolute inset-0 border-4 rounded-full animate-spin" style={{ borderColor: T.orange, borderTopColor: 'transparent' }} />
      </div>
      
      {/* Inner dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: T.orange }} />
      </div>
    </div>
    
    <div className="mt-6 text-center">
      <p className="text-[13px] font-semibold" style={{ color: T.textMain }}>Loading Course Content</p>
      <p className="text-[11px] mt-1.5" style={{ color: T.textMuted }}>Please wait while we prepare your resources...</p>
    </div>
    
    {/* Animated dots */}
    <div className="flex gap-1.5 mt-4">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: T.orange,
            animation: `pulseDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
);

// Add the keyframes for the animation in your global styles
const LoadingStyles = () => (
  <style jsx global>{`
    @keyframes pulseDot {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
  `}</style>
);
  if (!courseId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.pageBg, fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
        <div className="text-center p-8 rounded-2xl" style={{ background: T.bg, border: `1.5px solid ${T.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: T.orangeLight }}>
            <BookOpen size={20} style={{ color: T.orange }} />
          </div>
          <p className="text-[14px] font-bold" style={{ color: T.textMain }}>No course ID provided</p>
          <p className="text-[12px] mt-1" style={{ color: T.textMuted }}>Please select a course first</p>
        </div>
      </div>
    );
  }
  function LMSMenuRow({ icon: Icon, label, sub, color, hoverBg, onClick }: {
    icon: React.ElementType; label: string; sub: string
    color: string; hoverBg: string; onClick: () => void
  }) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
      >
        <Icon size={14} className="flex-shrink-0" style={{ color }} />
        <div className="min-w-0">
          <p className="text-[12px] font-medium" style={{ color: T.textMain }}>{label}</p>
          {sub && <p className="text-[10px]" style={{ color: T.textMuted }}>{sub}</p>}
        </div>
      </button>
    )
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: ${T.border}; border-radius: 20px; }
        .dark .ql-toolbar { background-color: #1f2937; border-color: #374151; }
        .dark .ql-container { background-color: #111827; border-color: #374151; color: #f3f4f6; }
        .dark .ql-picker-label, .dark .ql-picker-item, .dark .ql-stroke { color: #9ca3af !important; stroke: #9ca3af !important; }
        .dark .ql-fill { fill: #9ca3af !important; }
        .dark .ql-picker-options { background-color: #1f2937; border-color: #374151; }
        @keyframes animateIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: animateIn 0.3s ease-out; }
      `}</style>

      <div style={{ height: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="flex flex-col overflow-hidden" style={{ height: '100%', background: T.pageBg }}>
          <div className="flex-1 flex overflow-hidden relative" style={{ overflow: 'visible' }}>

            {/* ── Sidebar ────────────────────────────────────────────────────── */}
            <div
              className="relative flex flex-col h-full flex-shrink-0"
              style={{ width: `${sidebarWidth}px`, background: T.bg, borderRight: `1.5px solid ${T.border}`, transition: isResizing ? 'none' : 'width 0.2s ease' }}
            >
              <CourseSidebar
                courseData={courseData}
                selectedNode={selectedNode}
                expandedNodes={expandedNodes}
                sidebarWidth={sidebarWidth}
                searchQuery={searchQuery}
                courseName={courseStructureResponse?.data?.courseName || "Course"}
                moduleCount={courseData[0]?.children?.length || 0}
                onNodeSelect={selectNode}
                onToggleNode={toggleNode}
                onSidebarWidthChange={setSidebarWidth}
                onSearchChange={setSearchQuery}
                onMouseDown={(e) => { setIsResizing(true); e.preventDefault(); }}
              />
            </div>

            {/* ── Main content ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: T.bg, gap: 0, overflow: 'visible' }}>
              {/* ── Breadcrumb + User Menu Row ─────────────────────── */}
              <div
                className="flex items-center justify-between flex-shrink-0"
                style={{
                  background: T.bg,
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                {/* Breadcrumb on the left */}
                <div className="flex-1 min-w-0">
                  <BreadcrumbBar
                    breadcrumbs={breadcrumbs}
                    activeTab={activeTab}
                    activeSubcategory={activeSubcategory}
                  />
                </div>

                {/* User menu on the right */}
                <div className="flex-shrink-0 pr-4 py-2" ref={userRef}>
                  {/* Pill trigger */}
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2.5 transition-all"
                    style={{
                      background: showUserMenu ? "#FFF4F1" : "#ffffff",
                      borderRadius: "999px",
                      border: `1.5px solid ${showUserMenu ? "#F2775755" : "#e8e4eb"}`,
                      padding: "5px 12px 5px 6px",
                      boxShadow: showUserMenu
                        ? "0 2px 12px rgba(242,119,87,0.25)"
                        : "0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
                    }}
                    onMouseEnter={e => {
                      if (!showUserMenu) {
                        (e.currentTarget as HTMLElement).style.background = "#f6f4f7"
                          ; (e.currentTarget as HTMLElement).style.boxShadow = "0 3px 12px rgba(0,0,0,0.10)"
                      }
                    }}
                    onMouseLeave={e => {
                      if (!showUserMenu) {
                        (e.currentTarget as HTMLElement).style.background = "#ffffff"
                          ; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)"
                      }
                    }}
                  >
                    {userLoading ? (
                      <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: T.border }} />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`,
                          boxShadow: `0 2px 8px rgba(242,119,87,0.25)`,
                        }}
                      >
                        {getUserInitials()}
                      </div>
                    )}
                    <div className="hidden sm:block text-left">
                      <p className="text-[12.5px] font-semibold leading-tight" style={{ color: T.textMain }}>
                        {user?.firstName || "User"}
                      </p>
                      <p className="text-[10px] leading-tight mt-0.5" style={{ color: T.textMuted }}>
                        {isDummyStudent ? "Student View" : user?.role?.renameRole || "Account"}
                      </p>
                    </div>
                    <ChevronDown
                      size={14}
                      className="hidden sm:block ml-0.5"
                      style={{
                        color: "#bcbccc",
                        transform: showUserMenu ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  </button>

                  {/* Dropdown */}
                  {showUserMenu && (
                    <div
                      className="absolute right-4 mt-2 w-64 overflow-hidden"
                      style={{
                        background: T.bg,
                        borderRadius: "18px",
                        border: `1px solid ${T.border}`,
                        boxShadow: "0 16px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)",
                        animation: "scDrop .18s cubic-bezier(.16,1,.3,1) both",
                        transformOrigin: "top right",
                        zIndex: 9999,
                      }}
                    >
                      {/* Header */}
                      <div className="px-4 py-3" style={{ background: "#f6f4f7", borderBottom: `1px solid ${T.border}` }}>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`,
                              boxShadow: `0 4px 14px rgba(242,119,87,0.25)`,
                            }}
                          >
                            {getUserInitials()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold truncate" style={{ color: T.textMain }}>
                              {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: T.textMuted }}>{user?.email}</p>
                            <span
                              className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5"
                              style={{ background: T.orangeLight, color: T.orange }}
                            >
                              {isDummyStudent ? "⚡ Student View" : user?.role?.renameRole || "Account"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="p-1.5">
                        {!isActualStudent() && !isDummyStudent && (
                          <LMSMenuRow icon={UserCheck2} label="Switch to Student" sub="Preview student experience" color="#3b82f6" hoverBg="#eff6ff" onClick={handleSwitchToStudent} />
                        )}
                        {isDummyStudent && originalRoleInfo && (
                          <LMSMenuRow icon={Zap} label={`Back to ${originalRoleInfo.renameRole}`} sub="Return to original role" color="#f59e0b" hoverBg="#fffbeb" onClick={handleSwitchBackToOriginal} />
                        )}
                        <div className="h-px my-1 mx-1" style={{ background: T.border }} />
                        <LMSMenuRow icon={User} label="My Profile" sub="" color={T.textMuted} hoverBg="#f6f4f7" onClick={handleProfileClick} />
                        <LMSMenuRow icon={Settings} label="Settings" sub="" color={T.textMuted} hoverBg="#f6f4f7" onClick={() => setShowUserMenu(false)} />
                        <LMSMenuRow icon={HelpCircle} label="Help & Support" sub="" color={T.textMuted} hoverBg="#f6f4f7" onClick={() => setShowUserMenu(false)} />
                      </div>

                      {/* Sign out */}
                      <div className="p-1.5" style={{ borderTop: `1px solid ${T.border}` }}>
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors"
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fff5f5" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                        >
                          <LogOut size={14} style={{ color: "#e53e3e" }} />
                          <span className="text-[12px] font-semibold" style={{ color: "#e53e3e" }}>
                            {isLoggingOut ? "Signing out…" : "Sign Out"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Course content — zero top gap ────────────────────────────── */}
<div className="flex-1 overflow-hidden" style={{ marginTop: 0, paddingTop: 0 }}>
  {!isNodeSelected ? (
    // Show welcome screen when no node is selected
<div className="flex flex-col items-center justify-center h-full text-center p-10" style={{ animation: "ccFadeIn 0.4s ease-out both" }}>      <div className="relative overflow-hidden w-full max-w-md mb-7 rounded-2xl"
                     style={{ background: `linear-gradient(140deg,${T.orange} 0%,#E86440 50%,${T.orangeDark} 100%)`, padding: "32px 28px", boxShadow: `0 12px 40px ${T.orangeGlow}` }}>
                     <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 480 130" fill="none">
                       <circle cx="450" cy="-5" r="90" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
                       <circle cx="450" cy="-5" r="145" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" />
                       <circle cx="30" cy="140" r="70" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" />
                     </svg>
                     <div style={{ position: "relative", zIndex: 1 }}>
                       <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 mx-auto" style={{ background: "rgba(255,255,255,0.20)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.30)" }}>
                         <BookOpen size={20} className="text-white" />
                       </div>
                       <h3 className="text-[20px] font-extrabold text-white mb-1.5 tracking-tight">Welcome to Your Course</h3>
                       <p className="text-[11.5px] font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.80)" }}>Select a module, topic, or subtopic from the sidebar to start managing resources.</p>
                     </div>
                   </div>
      <div className="grid grid-cols-3 gap-3 max-w-md w-full">
        {([
          { icon: <Target size={20} />, color: "#dc2626", bg: "rgba(220,38,38,0.09)", title: "I Do", desc: "Teacher-led instruction" },
          { icon: <Users size={20} />, color: "#ea580c", bg: "rgba(234,88,12,0.09)", title: "We Do", desc: "Guided practice" },
          { icon: <BookOpen size={20} />, color: "#059669", bg: "rgba(5,150,105,0.09)", title: "You Do", desc: "Independent work" },
        ] as any[]).map(item => (
          <div key={item.title} className="p-4 rounded-2xl text-center"
            style={{ background: item.bg, border: `1.5px solid ${item.color}18`, transition: "all 0.22s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${item.color}18`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: `${item.color}14`, color: item.color }}>{item.icon}</div>
            <h4 className="text-[12px] font-bold tracking-tight" style={{ color: T.textMain }}>{item.title}</h4>
            <p className="text-[10.5px] mt-1 font-medium leading-relaxed" style={{ color: T.textMuted }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  ) : isContentLoading || !initialLoadComplete ? (
    <LoadingSpinner />
  ) : (
    <CourseContent
                  selectedNode={selectedNode}
                  activeTab={activeTab}
                  activeSubcategory={activeSubcategory}
                  subcategories={subcategories}
                  contentData={contentData}
                  breadcrumbs={[]}
                  fileTypes={fileTypes}
                  currentFolderContents={getCurrentFolderContents()}
                  folderNavState={getCurrentNavState()}
                  courseId={courseId}
                  courseStructureName={courseStructureResponse?.data?.courseName || ""}
               configuredLanguages={configuredLanguages}  

                  onTabChange={(tab) => { setActiveTabPersistent(tab); setActiveSubcategoryPersistent(""); updateURL({ activeTab: tab, activeSubcategory: "" }); updateNavState({ currentFolderPath: [], currentFolderId: null }); }}
                  onSubcategoryChange={(sub, comp) => { setActiveSubcategoryPersistent(sub); updateURL({ activeSubcategory: sub }); updateNavState({ currentFolderPath: [], currentFolderId: null }); }}
                  onResourceModalOpen={() => setShowNotionModal(true)}
                  onFileClick={handleFileClick}
                  onNavigateToFolder={navigateToFolder}
                  onNavigateUp={() => { const navState = getCurrentNavState(); const newPath = navState.currentFolderPath.slice(0, -1); updateNavState({ currentFolderPath: newPath, currentFolderId: newPath.length ? null : null }); }}
onEditFolder={(folder) => { 
  setEditingFolder(folder); 
  setEditFolderName(folder.name); 
  setFolderTags(folder.tags || []); // ← This is correct
  setShowCreateFolderModal(true); 
}}                  onDeleteFolder={(folder) => { setDeleteTarget({ type: "folder", item: folder, name: folder.name }); setShowDeleteConfirm(true); }}
                  onDeleteFile={(id, name) => { setDeleteTarget({ type: "file", item: { id }, name }); setShowDeleteConfirm(true); }}
                  onUpdateFile={initiateFileUpdate}
                  getParentNodeName={getParentNodeName}
                  getFolderItemCount={getFolderItemCount}
                  pedagogy={selectedNode?.originalData?.pedagogy}
                  onDeletePage={handleDeletePage}
                  onBulkDelete={async (items) => {
                    for (const item of items) {
                      try {
                        if (item.type === "page") {
                          await doDeletePage(item.id, item.name);
                        } else if (item.type === "folder" && item.folderItem) {
                          await deleteFolder(item.folderItem);
                        } else if (item.type === "file") {
                          await deleteFile(item.id);
                        }
                      } catch {
                        // continue deleting remaining items even if one fails
                      }
                    }
                  }}
               />
  )}
</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notion Resource Modal ─────────────────────────────────────────────── */}
      <NotionResourceModal
        isOpen={showNotionModal}
        onClose={() => setShowNotionModal(false)}
  fileTypes={fileTypes}  // This already contains only Video (plus static folder, zip, reference)
        selectedNode={selectedNode}
        activeTab={activeTab}
        activeSubcategory={activeSubcategory}
        currentFolderPath={getCurrentNavState().currentFolderPath}
        onSelectType={(key) => { setSelectedFileType(key); setShowUploadModal(true); }}
        onCreateFolder={() => setShowCreateFolderModal(true)}
        hierarchyInfo={buildFullHierarchyInfo()}
        onPageCreated={async () => {
          if (selectedNode) {
            await fetchAndRefresh(selectedNode);
            showSuccessToast("Page created!");
          }
        }}
      />

      {/* ── Upload Modal ──────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className={`relative flex flex-col mx-4 overflow-hidden ${isButtonLoading ? 'opacity-60 pointer-events-none' : ''}`}
            style={{ background: T.bg, borderRadius: '20px', border: `1.5px solid ${T.border}`, width: '100%', maxWidth: '640px', maxHeight: '90vh', minHeight: '500px', boxShadow: `0 24px 60px rgba(0,0,0,0.16)` }}
            onClick={(e) => e.stopPropagation()}
          >
            {isButtonLoading && (
              <div className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl" style={{ background: 'rgba(255,255,255,0.85)' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-9 h-9 rounded-full animate-spin" style={{ border: `3px solid ${T.orangeLight}`, borderTopColor: T.orange }} />
                  <span className="text-[12px] font-semibold" style={{ color: T.textSub }}>{selectedFileType === "url" ? "Adding URL…" : "Uploading…"}</span>
                </div>
              </div>
            )}

            {/* Upload modal hero header */}
            <div className="relative overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F27757 0%, #ED6445 52%, #E4573A 100%)', padding: '16px 18px 22px', borderRadius: '18px 18px 0 0' }}>
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 640 80" fill="none">
                <circle cx="610" cy="-8" r="65" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
                <circle cx="610" cy="-8" r="115" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" />
              </svg>
              <div style={{ position: 'relative', zIndex: 1 }} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.30)' }}>
                    {React.cloneElement(fileTypes.find((t) => t.key === selectedFileType)?.icon as React.ReactElement || <FileLucide />, { size: 18, color: '#fff' })}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-white">{updateFileId ? "Update File" : "Upload Files"}</h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>
                      {getCurrentNavState().currentFolderPath.length > 0 ? `To "${getCurrentNavState().currentFolderPath.slice(-1)[0]}"` : "Add files with metadata"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetUploadModalStates}
                  className="p-1.5 rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.30)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {/* File Details */}
             {/* File Details */}
<div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${T.border}` }}>
  <AccordionHeader icon={<FileText />} iconColor={T.orange} iconBg={T.orangeLight} title="File Details" subtitle="Add file details and upload" sectionKey="description" currentKey={expandedUploadSection} onToggle={setExpandedUploadSection} />
  {expandedUploadSection === "description" && (
    <div className="p-4 space-y-4" style={{ background: T.bg }}>
      {selectedFileType === "url" ? (
        // URL section remains the same
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold mb-2" style={{ color: T.textSub }}>{updateFileId ? "Update URL" : "Enter URL"}</label>
            <input type="url" value={folderUrl} onChange={(e) => setFolderUrl(e.target.value)} placeholder="https://example.com" className="w-full px-3 py-2.5 text-[13px] outline-none transition-all" style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, borderRadius: '10px', color: T.textMain }}
              onFocus={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.orangeLight}`; }}
              onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold mb-2" style={{ color: T.textSub }}>Link Name <span style={{ color: T.textMuted, fontWeight: 400 }}>(display name)</span></label>
            <input
              type="text"
              value={urlFileName}
              onChange={(e) => setUrlFileName(e.target.value)}
              placeholder={folderUrl ? extractFileNameFromUrl(folderUrl) : "e.g. React Docs"}
              className="w-full px-3 py-2.5 text-[13px] outline-none transition-all"
              style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, borderRadius: '10px', color: T.textMain }}
              onFocus={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.orangeLight}`; }}
              onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>
      ) : (
        <>
   {/* File Name Input - Show existing file name when updating */}
<div>
  <label className="block text-[11px] font-bold mb-2" style={{ color: T.textSub }}>
    {updateFileId ? "File Name" : "File Name(s)"}
  </label>
  
  {/* For update mode - show the file name that will be used */}
  {updateFileId && updateFileType !== "url" && (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <input 
          type="text" 
          value={fileDisplayNames[updateFileId] || ""} 
          onChange={(e) => {
            setFileDisplayNames((prev) => ({ 
              ...prev, 
              [updateFileId]: e.target.value 
            }));
            // Also update the uploading files name if any
            if (uploadingFiles.length > 0) {
              setUploadingFiles((prev) => prev.map(f => ({
                ...f,
                name: e.target.value
              })));
            }
          }}
          className="flex-1 px-3 py-2 text-[12px] outline-none"
          style={{ 
            background: T.pageBg, 
            border: `1.5px solid ${T.border}`, 
            borderRadius: '10px', 
            color: T.textMain,
            fontFamily: "inherit"
          }}
          onFocus={e => { e.currentTarget.style.borderColor = T.orange; }}
          onBlur={e => { e.currentTarget.style.borderColor = T.border; }}
          placeholder="File name"
        />
        {/* Show status indicator */}
        {uploadingFiles.length > 0 && (
          <span className="text-[11px] text-amber-600">
            (New file selected)
          </span>
        )}
        {uploadingFiles.length === 0 && updateFileId && (
          <span className="text-[11px]" style={{ color: T.textMuted }}>
            (Current file name)
          </span>
        )}
      </div>
      
      {/* Show warning only when a new file is selected */}
      {uploadingFiles.length > 0 && (
        <p className="text-[9px] text-amber-600 mt-1">
          ⚠️ The file will be replaced with the new file you selected
        </p>
      )}
    </div>
  )}
  
  {/* For new files - show multiple file inputs */}
  {!updateFileId && selectedFiles.length > 0 && (
    <div>
      {selectedFiles.map((file) => (
        <div key={file.name} className="flex items-center gap-2 mb-2">
          <input 
            type="text" 
            value={fileDisplayNames[file.name] || file.name} 
            onChange={(e) => setFileDisplayNames((prev) => ({ ...prev, [file.name]: e.target.value }))} 
            className="flex-1 px-3 py-2 text-[12px] outline-none" 
            style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, borderRadius: '10px', color: T.textMain }} 
            onFocus={e => { e.currentTarget.style.borderColor = T.orange; }} 
            onBlur={e => { e.currentTarget.style.borderColor = T.border; }} 
          />
          <span className="text-[11px]" style={{ color: T.textMuted }}>.{file.name.split(".").pop()}</span>
        </div>
      ))}
    </div>
  )}
</div>
          
         {/* File Upload Area */}
<div>
  <label className="block text-[11px] font-bold mb-2" style={{ color: T.textSub }}>
    {updateFileId ? "Select New File (Optional)" : "File Upload"}
  </label>
  <div
    className="p-5 text-center cursor-pointer transition-all rounded-2xl"
    style={{ border: `1.5px dashed ${T.border}`, background: T.pageBg }}
    onClick={() => fileInputRef.current?.click()}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.orange; (e.currentTarget as HTMLElement).style.background = T.orangeLight; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.background = T.pageBg; }}
  >
    <div className="mb-2" style={{ color: fileTypes.find((t) => t.key === selectedFileType)?.color || T.orange }}>
      {React.cloneElement(fileTypes.find((t) => t.key === selectedFileType)?.icon as React.ReactElement || <Upload />, { size: 28 })}
    </div>
    <p className="text-[12px] font-bold mb-1" style={{ color: T.textMain }}>
      {updateFileId ? "Click to choose a new file (optional)" : "Drop files here or click to browse"}
    </p>
    <p className="text-[10px]" style={{ color: T.textMuted }}>
      {updateFileId ? "Leave empty to keep current file" : `Accepted: ${fileTypes.find((t) => t.key === selectedFileType)?.accept}`}
    </p>
    <input 
      ref={fileInputRef} 
      type="file" 
      multiple={!updateFileId} 
      accept={fileTypes.find((t) => t.key === selectedFileType)?.accept} 
      className="hidden" 
      onChange={(e) => handleFileSelection(e.target.files)} 
    />
  </div>
  
  {/* Show current file info ONLY when no new file is selected */}
  {updateFileId && updateFileType !== "url" && uploadingFiles.length === 0 && (
    <div className="mt-2 p-2 rounded-lg" style={{ background: T.orangeLight, border: `1px solid ${T.orange}30` }}>
      <p className="text-[10px] font-medium" style={{ color: T.orange }}>
        📄 Current file: {fileDisplayNames[updateFileId] || "Unknown"} (will be kept)
      </p>
    </div>
  )}
  
  {/* Show selected new file progress bar and hide current file info */}
 {/* Show selected new file progress bar with replacement info */}
{uploadingFiles.map((f) => (
  <div key={f.id} className="p-3 rounded-xl mt-2" style={{ background: T.pageBg, border: `1.5px solid ${T.border}` }}>
    <div className="flex items-center mb-1.5">
      <Upload size={11} className="mr-1.5" style={{ color: T.textMuted }} />
      <span className="text-[11px] flex-1" style={{ color: T.textMain }}>
        {f.name}
      </span>
      <span className="text-[10px]" style={{ color: T.textMuted }}>{f.progress}%</span>
    </div>
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: T.border }}>
      <div className="h-full rounded-full transition-all duration-200" style={{ 
        width: `${f.progress}%`, 
        background: f.status === "error" ? '#ef4444' : 
                   f.status === "completed" ? '#10b981' : 
                   T.orange 
      }} />
    </div>
    {f.status === "ready" && (
      <div className="text-[10px] font-semibold mt-1" style={{ color: T.orange }}>
        🔄 Ready to replace existing file
      </div>
    )}
    {f.status === "uploading" && (
      <div className="text-[10px] font-semibold mt-1" style={{ color: T.orange }}>
        ⬆️ Uploading new file...
      </div>
    )}
{updateFileId && uploadingFiles.length > 0 && (
  <div className="mt-2">
    <button
      onClick={() => {
        // Clear all file selection states
        setSelectedFiles([]);
        setUploadingFiles([]);
        setFileDisplayNames({});
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }}
      className="text-[10px] text-red-500 hover:text-red-600 flex items-center gap-1"
    >
      <X size={12} />
      Clear selection
    </button>
  </div>
)}
  </div>
))}
</div>
          
{/* Description field */}
<div>
  <label className="block text-[11px] font-bold mb-2" style={{ color: T.textSub }}>
    File Description
  </label>
  <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${T.border}` }}>
    <TipTapEditor
      value={uploadDescription}
      onChange={(value) => {
        console.log("Editor changed:", value);
        setUploadDescription(value);
      }}
      placeholder="Enter file description here..."
      minHeight="160px"
      maxHeight="200px"
      showToolbar={true}
      editable={true}
    />
  </div>
</div>
        </>
      )}
    </div>
  )}
</div>

              {/* Tags */}
              <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${T.border}` }}>
                <AccordionHeader icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} iconColor="#10b981" iconBg="rgba(16,185,129,0.08)" title="Tags" subtitle={uploadTags.length > 0 ? `${uploadTags.length} tag(s)` : "Add tags to organize"} sectionKey="tags" currentKey={expandedUploadSection} onToggle={setExpandedUploadSection} />
                {expandedUploadSection === "tags" && (
                  <div className="p-4 space-y-3" style={{ background: T.bg }}>
                    <div className="flex items-end gap-2">
                      <div className="flex-1"><label className="block text-[11px] font-bold mb-1.5" style={{ color: T.textSub }}>Tag Name</label><input type="text" value={uploadCurrentTag} onChange={(e) => setUploadCurrentTag(e.target.value)} placeholder="Tag name…" className="w-full px-3 py-2 text-[12px] outline-none" style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, borderRadius: '10px', color: T.textMain }} onFocus={e => e.currentTarget.style.borderColor = T.orange} onBlur={e => e.currentTarget.style.borderColor = T.border} /></div>
                      <div><label className="text-[11px] font-bold mb-1.5 block" style={{ color: T.textSub }}>Color</label><input type="color" value={uploadTagColor} onChange={(e) => setUploadTagColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer" style={{ border: `1.5px solid ${T.border}` }} /></div>
                      <button onClick={() => addUploadTag(uploadCurrentTag.trim(), uploadTagColor)} disabled={!uploadCurrentTag.trim()} className="px-3 py-2 text-white text-[12px] font-bold rounded-xl transition-all" style={{ background: uploadCurrentTag.trim() ? T.orange : T.border }} onMouseEnter={e => { if (uploadCurrentTag.trim()) (e.currentTarget as HTMLElement).style.background = T.orangeDark; }} onMouseLeave={e => { if (uploadCurrentTag.trim()) (e.currentTarget as HTMLElement).style.background = T.orange; }}>Add</button>
                    </div>
                    {uploadTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {uploadTags.map((tag, i) => (
                          <div key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `${tag.tagColor}15`, color: tag.tagColor, border: `1.5px solid ${tag.tagColor}35` }}>
                            {tag.tagName}<button onClick={() => removeUploadTag(i)} className="ml-1"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${T.border}` }}>
                <AccordionHeader icon={<Settings />} iconColor={T.orange} iconBg={T.orangeLight} title="File Settings" subtitle="Configure file options" sectionKey="settings" currentKey={expandedUploadSection} onToggle={setExpandedUploadSection} />
                {expandedUploadSection === "settings" && (
                  <div className="p-4 space-y-2.5" style={{ background: T.bg }}>
                    {[
                      { key: "studentShow" as const, icon: <Eye size={15} />, label: "Show to students", desc: "Make visible to students" },
                      { key: "downloadAllow" as const, icon: <Download size={15} />, label: "Allow download", desc: "Students can download" },
                    ].map(({ key, icon, label, desc }) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: T.pageBg, border: `1.5px solid ${T.border}` }}>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg" style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textSub }}>{icon}</div>
                          <div><p className="text-[12px] font-bold" style={{ color: T.textMain }}>{label}</p><p className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>{desc}</p></div>
                        </div>
                        <OrangeToggle
                          checked={documentSettings[updateFileId || "temp"]?.[key] ?? true}
                          onChange={(checked) => { const id = updateFileId || "temp"; const cur = documentSettings[id] || { studentShow: true, downloadAllow: true }; const next = { ...cur, [key]: checked }; setDocumentSettings((prev) => ({ ...prev, [id]: next })); if (updateFileId && updateFileId !== "temp") handleUpdateFileSettings(updateFileId, next); }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
          {/* Footer */}
<div className="flex justify-end gap-3 p-4 flex-shrink-0" style={{ borderTop: `1px solid ${T.border}`, background: T.pageBg }}>
  <button 
    onClick={resetUploadModalStates} 
    className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all" 
    style={{ background: T.bg, color: T.textSub, border: `1.5px solid ${T.border}` }} 
    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = T.orange} 
    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = T.border}
  >
    Cancel
  </button>
  
  <button
    onClick={async () => {
      setIsButtonLoading(true);
      
      // Handle URL type
      if (selectedFileType === "url") {
        if (!folderUrl.trim()) { 
          alert("Enter a valid URL"); 
          setIsButtonLoading(false); 
          return; 
        }
        if (!selectedNode) { 
          setIsButtonLoading(false); 
          return; 
        }
        
        const navState = getCurrentNavState();
        const formData = new FormData();
        const fields: Record<string, string> = { 
          fileUrl: folderUrl, 
          fileName: urlFileName || extractFileNameFromUrl(folderUrl), 
          fileType: urlFileType,  
          fileDescription: uploadDescription || "",
          tabType: toBackendTab(activeTab), 
          subcategory: activeSubcategory, 
          folderPath: navState.currentFolderPath.join("/"), 
          courses: selectedNode.originalData?.courses || "", 
          topicId: selectedNode.originalData?.topicId || "", 
          index: String(selectedNode.originalData?.index || 0), 
          isUpdate: updateFileId ? "true" : "false", 
          showToStudents: String(documentSettings[updateFileId || "temp"]?.studentShow ?? true), 
          allowDownload: String(documentSettings[updateFileId || "temp"]?.downloadAllow ?? true) 
        };
        
        if (updateFileId) fields.updateFileId = updateFileId;
        if (updateFileId) fields.updateFileName = urlFileName || extractFileNameFromUrl(folderUrl);

        Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
        if (uploadTags.length) formData.append("tags", JSON.stringify(uploadTags));

        try {
          await entityApi.updateEntity(selectedNode.type as any, selectedNode.id, formData);
          await fetchAndRefresh(selectedNode);
          resetUploadModalStates();
          showSuccessToast(updateFileId ? "URL updated!" : "URL added!");
        } catch { 
          showErrorToast(updateFileId ? "Failed to update URL" : "Failed to add URL"); 
        } finally { 
          setIsButtonLoading(false); 
        }
        return;
      }
      
      // Handle file updates (regular files)
      if (updateFileId) {
        // Case 1: Update metadata only (no new file selected)
        if (uploadingFiles.length === 0) {
          await handleFileUpdate(null);
        } 
        // Case 2: Update file content (new file selected)
        else {
          const allReady = uploadingFiles.every((f) => f.status === "ready");
          if (!allReady) { 
            alert("Please wait for files to finish preparing"); 
            setIsButtonLoading(false); 
            return; 
          }
          
          setUploadingFiles((prev) => prev.map((f) => ({ ...f, status: "submitting" as const })));
          
          // Create renamed files with custom display names
          const renamed = selectedFiles.map((file) => { 
            const display = fileDisplayNames[updateFileId] || fileDisplayNames[file.name] || file.name; 
            const final = selectedFileType === "reference" ? "Reference Material" : display; 
            const ext = file.name.split(".").pop(); 
            const withExt = final.includes(".") ? final : `${final}.${ext}`; 
            return withExt !== file.name ? new window.File([file], withExt, { type: file.type }) : file; 
          });
          
          const dt = new DataTransfer(); 
          renamed.forEach((f) => dt.items.add(f));
          await handleFileUpdate(dt.files);
        }
      } 
      // Handle new file upload
      else {
        const allReady = uploadingFiles.every((f) => f.status === "ready");
        if (!allReady) { 
          alert("Please wait for files to finish preparing"); 
          setIsButtonLoading(false); 
          return; 
        }
        
        setUploadingFiles((prev) => prev.map((f) => ({ ...f, status: "submitting" as const })));
        
        // Create renamed files with custom display names
        const renamed = selectedFiles.map((file) => { 
          const display = fileDisplayNames[file.name] || file.name; 
          const final = selectedFileType === "reference" ? "Reference Material" : display; 
          const ext = file.name.split(".").pop(); 
          const withExt = final.includes(".") ? final : `${final}.${ext}`; 
          return withExt !== file.name ? new window.File([file], withExt, { type: file.type }) : file; 
        });
        
        const dt = new DataTransfer(); 
        renamed.forEach((f) => dt.items.add(f));
        await handleFileUpload(dt.files, activeTab, activeSubcategory);
      }
      
      setIsButtonLoading(false);
    }}
    disabled={
      selectedFileType === "url" 
        ? !folderUrl.trim() 
        : updateFileId 
          ? false  // Always enabled for updates (can update metadata only)
          : uploadingFiles.length === 0 || !uploadingFiles.every((f) => f.status === "ready")
    }
    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all"
    style={{ background: T.orange, boxShadow: `0 4px 12px ${T.orangeGlow}` }}
    onMouseEnter={e => { 
      (e.currentTarget as HTMLElement).style.background = T.orangeDark; 
      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; 
    }}
    onMouseLeave={e => { 
      (e.currentTarget as HTMLElement).style.background = T.orange; 
      (e.currentTarget as HTMLElement).style.transform = 'none'; 
    }}
  >
    {selectedFileType === "url" ? (
      <><Link2 size={14} />{updateFileId ? "Update URL" : "Add URL"}</>
    ) : updateFileId ? (
      uploadingFiles.length > 0 ? (
        <><RefreshCw size={14} />Update File & Metadata</>
      ) : (
        <><RefreshCw size={14} />Update Metadata Only</>
      )
    ) : (
      <><Upload size={14} />Upload Files</>
    )}
  </button>
</div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Folder Modal ─────────────────────────────────────────── */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className={`relative flex flex-col mx-4 overflow-hidden ${isButtonLoading ? 'opacity-60 pointer-events-none' : ''}`} style={{ background: T.bg, borderRadius: '20px', border: `1.5px solid ${T.border}`, width: '100%', maxWidth: '560px', maxHeight: '85vh', minHeight: '380px', boxShadow: `0 24px 60px rgba(0,0,0,0.16)` }} onClick={e => e.stopPropagation()}>
            {isButtonLoading && (
              <div className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl" style={{ background: 'rgba(255,255,255,0.85)' }}>
                <div className="w-9 h-9 rounded-full animate-spin" style={{ border: `3px solid ${T.orangeLight}`, borderTopColor: T.orange }} />
              </div>
            )}

            {/* Folder modal hero header */}
            <div className="relative overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F27757 0%, #ED6445 52%, #E4573A 100%)', padding: '16px 18px 22px', borderRadius: '18px 18px 0 0' }}>
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 560 80" fill="none"><circle cx="530" cy="-8" r="65" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" /><circle cx="530" cy="-8" r="115" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" /></svg>
              <div style={{ position: 'relative', zIndex: 1 }} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.30)' }}>
                    <Folder size={18} color="#fff" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-white">{editingFolder ? "Edit Folder" : "Create New Folder"}</h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>{editingFolder ? "Update folder details" : "Organize your files"}</p>
                  </div>
                </div>
                <button onClick={() => { setShowCreateFolderModal(false); setEditingFolder(null); setEditFolderName(""); setNewFolderName(""); setFolderTags([]); }} className="p-1.5 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.30)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'}><X size={15} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${T.border}` }}>
                <AccordionHeader icon={<Folder />} iconColor={T.orange} iconBg={T.orangeLight} title="Folder Details" subtitle={<span style={{ color: '#ef4444' }}>Required *</span>} sectionKey="folderName" currentKey={expandedSection} onToggle={setExpandedSection} />
                {expandedSection === "folderName" && (
                  <div className="p-4" style={{ background: T.bg }}>
                    <label className="block text-[11px] font-bold mb-2" style={{ color: T.textSub }}>Folder Name</label>
                    <input type="text" value={editingFolder ? editFolderName : newFolderName} onChange={(e) => editingFolder ? setEditFolderName(e.target.value) : setNewFolderName(e.target.value)} placeholder="Enter folder name…" autoFocus className="w-full px-3 py-2.5 text-[13px] outline-none transition-all" style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, borderRadius: '10px', color: T.textMain }}
                      onFocus={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.orangeLight}`; }}
                      onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
                      onKeyPress={(e) => e.key === "Enter" && (editingFolder ? saveEditFolder() : createFolder())}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${T.border}` }}>
                <AccordionHeader icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} iconColor="#10b981" iconBg="rgba(16,185,129,0.08)" title="Tags" subtitle={folderTags.length > 0 ? `${folderTags.length} tag(s)` : "Add tags"} sectionKey="tags" currentKey={expandedSection} onToggle={setExpandedSection} />
                {expandedSection === "tags" && (
                  <div className="p-4 space-y-3" style={{ background: T.bg }}>
                    <div className="flex items-end gap-2">
                      <div className="flex-1"><label className="block text-[11px] font-bold mb-1.5" style={{ color: T.textSub }}>Tag Name</label><input type="text" value={currentTag} onChange={(e) => setCurrentTag(e.target.value)} placeholder="Tag name…" className="w-full px-3 py-2 text-[12px] outline-none" style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, borderRadius: '10px', color: T.textMain }} onFocus={e => e.currentTarget.style.borderColor = T.orange} onBlur={e => e.currentTarget.style.borderColor = T.border} /></div>
                      <div><label className="text-[11px] font-bold mb-1.5 block" style={{ color: T.textSub }}>Color</label><input type="color" value={tagColor} onChange={(e) => setTagColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer" style={{ border: `1.5px solid ${T.border}` }} /></div>
                      <button onClick={() => { if (currentTag.trim()) addTag(currentTag.trim(), tagColor); }} disabled={!currentTag.trim()} className="px-3 py-2 text-white text-[12px] font-bold rounded-xl" style={{ background: currentTag.trim() ? T.orange : T.border }}>Add</button>
                    </div>
                    {folderTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {folderTags.map((tag, i) => (
                          <div key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: `${tag.tagColor}15`, color: tag.tagColor, border: `1.5px solid ${tag.tagColor}35` }}>
                            {tag.tagName}<button onClick={() => removeTag(i)} className="ml-1"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!editingFolder && (
                <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${T.border}` }}>
                  <AccordionHeader icon={<Lock />} iconColor={T.orange} iconBg={T.orangeLight} title="Access" subtitle={accessLevel === "private" ? "Only you" : accessLevel === "team" ? "Your team" : "Public"} sectionKey="access" currentKey={expandedSection} onToggle={setExpandedSection} />
                  {expandedSection === "access" && (
                    <div className="p-4 space-y-2" style={{ background: T.bg }}>
                      {[{ value: "private", icon: Lock, label: "Private" }, { value: "team", icon: Users, label: "Team" }, { value: "public", icon: Globe, label: "Public" }].map(({ value, icon: Icon, label }) => (
                        <label key={value} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all" style={{ background: accessLevel === value ? T.orangeLight : T.pageBg, border: `1.5px solid ${accessLevel === value ? T.orange : T.border}` }}>
                          <input type="radio" name="accessLevel" value={value} checked={accessLevel === value} onChange={(e) => setAccessLevel(e.target.value)} className="w-3.5 h-3.5" style={{ accentColor: T.orange }} />
                          <Icon size={14} style={{ color: accessLevel === value ? T.orange : T.textMuted }} />
                          <span className="text-[12px] font-semibold" style={{ color: accessLevel === value ? T.orange : T.textMain }}>{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 flex-shrink-0" style={{ borderTop: `1px solid ${T.border}`, background: T.pageBg }}>
              <button onClick={() => { setShowCreateFolderModal(false); setEditingFolder(null); setNewFolderName(""); setFolderTags([]); }} className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all" style={{ background: T.bg, color: T.textSub, border: `1.5px solid ${T.border}` }}>Cancel</button>
              <button onClick={async () => { setIsButtonLoading(true); editingFolder ? await saveEditFolder() : await createFolder(); setIsButtonLoading(false); }} disabled={(editingFolder ? !editFolderName.trim() : !newFolderName.trim()) || isButtonLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all"
                style={{ background: T.orange, boxShadow: `0 4px 12px ${T.orangeGlow}` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.orangeDark}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = T.orange}
              >
                {isButtonLoading ? <><div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />{editingFolder ? "Updating…" : "Creating…"}</> : <><Folder size={14} />{editingFolder ? "Update Folder" : "Create Folder"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────────────── */}
      {/* ── Delete Confirm ── */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="mx-4 p-6 rounded-2xl"
            style={{ background: T.bg, border: `1.5px solid ${T.border}`, width: '100%', maxWidth: '340px', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Trash2 size={20} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <h3 className="text-[14px] font-bold" style={{ color: T.textMain }}>
                  {/* Show correct type label */}
                  Delete {deleteTarget.item?.isPage ? "page" : deleteTarget.type}
                </h3>
                <p className="text-[12px] mt-0.5" style={{ color: T.textMuted }}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-[13px] mb-5" style={{ color: T.textSub }}>
              Are you sure you want to delete "
              <span style={{ color: T.textMain, fontWeight: 700 }}>{deleteTarget.name}</span>"?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
                className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all"
                style={{ background: T.pageBg, color: T.textSub, border: `1.5px solid ${T.border}` }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteTarget.item?.isPage) {
                    // Page delete — calls the pages API
                    await doDeletePage(deleteTarget.item.id, deleteTarget.name);
                  } else if (deleteTarget.type === "folder") {
                    await deleteFolder(deleteTarget.item);
                  } else {
                    await deleteFile(deleteTarget.item.id);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: '#ef4444' }}
                onMouseEnter={e => !isDeleting && ((e.currentTarget as HTMLElement).style.background = '#dc2626')}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#ef4444'}
              >
                {isDeleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Deleting…</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Viewers ──────────────────────────────────────────────────────────────── */}
      {showZipViewer && <ZipViewer fileUrl={currentZipUrl} fileName={currentZipName} onClose={() => setShowZipViewer(false)} />}

      {showPDFViewer && (
        <PDFViewer fileUrl={currentPDFUrl} fileName={currentPDFName} fileId={currentPDFFileId} entityType={selectedNode?.type} institution={selectedNode?.originalData?.institution || ""} courses={selectedNode?.originalData?.courses || ""} entityId={selectedNode?.id} tabType={activeTab || ""} subcategory={activeSubcategory || ""} folderPath={getCurrentNavState().currentFolderPath} apiBaseUrl="http://localhost:5533" onClose={() => { setShowPDFViewer(false); setCurrentPDFUrl(""); setCurrentPDFName(""); setCurrentPDFFileId(""); }} isTeacher={true} initialMcqs={[]} sampleLiveLink="https://example.com/live-mcq-sample" />
      )}

      {showPPTViewer && (
        <PPTViewer isOpen={showPPTViewer} onClose={() => { setShowPPTViewer(false); setCurrentPPTUrl(""); setCurrentPPTName(""); setCurrentPPTFileId(""); }} pptUrl={currentPPTUrl} title={currentPPTName} fileId={currentPPTFileId} entityType={selectedNode?.type || ""} entityId={selectedNode?.id || ""} tabType={toBackendTab(activeTab)} subcategory={activeSubcategory} folderPath={getCurrentNavState().currentFolderPath} isTeacher={true} apiBaseUrl="http://localhost:5533" />
      )}

{showVideoViewer && (
  <VideoViewer
    fileUrl={currentVideoUrl} 
    fileName={currentVideoName} 
    fileId={currentVideoFileId} 
    entityType={selectedNode?.type} 
    entityId={selectedNode?.id} 
    tabType={activeTab} 
    subcategory={activeSubcategory} 
    folderPath={getCurrentNavState().currentFolderPath} 
    availableResolutions={currentVideoResolutions} 
    fileUrlMap={currentVideoFileUrlMap} 
    isVideo={true} 
    allVideos={videoPlaylist} 
    currentVideoIndex={currentVideoIndex}
    onVideoChange={(idx) => { 
      setCurrentVideoIndex(idx); 
      const v = videoPlaylist[idx]; 
      setCurrentVideoUrl(v.fileUrl || ""); 
      setCurrentVideoName(v.fileName); 
      setCurrentVideoResolutions(v.availableResolutions || []); 
      setCurrentVideoFileUrlMap(v.fileUrlMap || {}); 
      setCurrentVideoFileId(v.id); 
    }}
    onClose={() => { 
      setShowVideoViewer(false); 
      setCurrentVideoUrl(""); 
      setCurrentVideoName(""); 
      setCurrentVideoResolutions([]); 
      setCurrentVideoFileUrlMap({}); 
      setVideoPlaylist([]); 
      setCurrentVideoIndex(0); 
      setCurrentVideoFileId(""); 
    }}
    apiBaseUrl="http://localhost:5533" 
    isTeacher={true} 
  />
)}
    </>
  );
}
