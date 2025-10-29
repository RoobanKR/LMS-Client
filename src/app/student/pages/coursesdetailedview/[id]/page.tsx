"use client"

import { useState, useEffect } from "react"
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  GraduationCap,
  User,
  Presentation,
  Folder,
  Clock,
  Sun,
  Moon,
  File,
  Video,
  Loader2,
  Sparkles,
  Target,
  DollarSign as Collaboration,
  Rocket,
  Menu,
  Search,
  Bell,
  Settings,
  X,
  Link,
  Archive,
} from "lucide-react"
import VideoPlayer from "../../../component/video-player"
import PDFViewer from "../../../component/pdf-viewer"
import PPTViewer from "../../../component/ppt-viewer"
import { useParams, useSearchParams } from "next/navigation"
import React from "react"
import NotesPanel from "../../../component/notes-panel"
import AIPanel from "../../../component/ai-panel"
// Add this import with the other imports
import ZipViewer from "../../../component/zipViewer"

// ==============================
// Type Definitions
// ==============================

interface PedagogyLink {
  _id?: string;
  name: string;
  url: string;
  uploadedAt?: string;
}

interface PedagogyFile {
  _id?: string;
  fileName: string;
  fileType: string;
  size: string;
  uploadedAt?: string;
  fileUrl: string | { base?: string;[key: string]: string | undefined };
  isReference?: boolean;
}

interface PedagogyFolder {
  _id?: string;
  name: string;
  files: PedagogyFile[];
  subfolders?: PedagogyFolder[];
  uploadedAt?: string;
}

interface PedagogyItem {
  description?: string;
  files?: PedagogyFile[];
  folders?: PedagogyFolder[];
  links?: PedagogyLink[];
  _id?: string;
}

interface Pedagogy {
  I_Do?: Record<string, PedagogyItem>;
  We_Do?: Record<string, PedagogyItem>;
  You_Do?: Record<string, PedagogyItem>;
  _id?: string;
}

interface SubTopic {
  _id: string;
  title: string;
  description: string;
  duration?: string;
  level?: string;
  subTopics?: SubTopic[];
  pedagogy?: Pedagogy;
}

interface Topic {
  _id: string;
  title: string;
  description: string;
  duration?: string;
  level?: string;
  subTopics?: SubTopic[];
  pedagogy?: Pedagogy;
}

interface SubModule {
  _id: string;
  title: string;
  description: string;
  topics?: Topic[];
  pedagogy?: Pedagogy;
}

interface Module {
  _id: string;
  title: string;
  description: string;
  subModules?: SubModule[];
  topics?: Topic[];
  pedagogy?: Pedagogy;
}

interface CourseData {
  _id: string;
  courseName: string;
  courseDescription: string;
  courseHierarchy?: string[];
  I_Do?: string[];
  We_Do?: string[];
  You_Do?: string[];
  modules?: Module[];
}

type ResourceType = "video" | "pdf" | "ppt" | "folder" | "url" | "link" | "zip" | "reference";

interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  fileUrl?: string | { base?: string };
  isReference?: boolean;
  externalUrl?: string;
  fileSize?: string;
  uploadedAt?: string;
  children?: Resource[];
  duration?: string;
  fileName?: string;
  isZip?: boolean;
  zipContents?: Resource[];
  blobUrl?: string;
}

interface PedagogySubItem {
  key: string;
  name: string;
  description: string;
  files: PedagogyFile[];
  folders?: PedagogyFolder[];
  links?: PedagogyLink[];
}

type LearningElementType = "i-do" | "we-do" | "you-do";

interface LearningElement {
  id: string;
  title: string;
  type: LearningElementType;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgGradient: string;
  subItems: PedagogySubItem[];
}

type SelectedItemType = "module" | "submodule" | "topic" | "subtopic";

interface SelectedItem {
  id: string;
  title: string;
  type: SelectedItemType;
  hierarchy: string[];
  pedagogy?: Pedagogy;
}

interface ResourceFilter {
  type: ResourceType;
  label: string;
  icon: React.ComponentType<any>;
  checked: boolean;
}

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<any>;
}

interface DropdownProps {
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

// ==============================
// Styles
// ==============================

const styles = `
  .lms-container {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 24.6 95% 53.1%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 24.6 95% 53.1%;
    --chart-1: 24.6 95% 53.1%;
    --chart-2: 142 76% 36%;
    --chart-3: 221 83% 53%;
    --chart-4: 346 77% 50%;
    --chart-5: 262 83% 58%;
    --sidebar-background: 240 6% 97%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 24.6 95% 53.1%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 240 5.9% 90%;
    --sidebar-ring: 24.6 95% 53.1%;
    --radius: 0.5rem;
  }

  .lms-container.dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 20.5 90.2% 48.2%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 20.5 90.2% 48.2%;
    --chart-1: 20.5 90.2% 48.2%;
    --chart-2: 142 76% 36%;
    --chart-3: 221 83% 53%;
    --chart-4: 346 77% 50%;
    --chart-5: 262 83% 58%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 20.5 90.2% 48.2%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 20.5 90.2% 48.2%;
  }

  .lms-container * { border-color: hsl(var(--border)); }
  .lms-container { background-color: hsl(var(--background)); color: hsl(var(--foreground)); font-size: 13px; line-height: 1.4; overflow: hidden; }
  .lms-card { background-color: hsl(var(--card)); color: hsl(var(--card-foreground)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); }
  .lms-button-outline { background-color: transparent; color: hsl(var(--foreground)); border: 1px solid hsl(var(--border)); padding: 0.375rem 0.75rem; border-radius: var(--radius); font-size: 0.75rem; }
  .lms-sidebar { background-color: hsl(var(--sidebar-background)); color: hsl(var(--sidebar-foreground)); border-right: 1px solid hsl(var(--sidebar-border)); }
  .lms-badge { background-color: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); padding: 0.125rem 0.375rem; border-radius: 9999px; font-size: 0.625rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.125rem; }
  .lms-badge-outline { background-color: transparent; border: 1px solid hsl(var(--border)); }
  
  /* Resource Filter Styles */
  .resource-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: hsl(var(--muted));
    border-radius: var(--radius);
    border: 1px solid hsl(var(--border));
  }
  
  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    cursor: pointer;
    padding: 0.375rem 0.5rem;
    border-radius: var(--radius);
    transition: all 0.15s;
    font-size: 0.7rem;
    font-weight: 500;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--background));
  }
  
  .filter-checkbox:hover {
    background: hsl(var(--accent));
  }
  
  .filter-checkbox.checked {
    background: hsl(var(--primary) / 0.1);
    border-color: hsl(var(--primary));
    color: hsl(var(--primary));
  }
  
  .filter-checkbox input[type="checkbox"] {
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 0.25rem;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    cursor: pointer;
  }
  
  .filter-checkbox.checked input[type="checkbox"] {
    background: hsl(var(--primary));
    border-color: hsl(var(--primary));
  }
  
  .filter-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }
  
  .filter-button {
    padding: 0.375rem 0.75rem;
    border-radius: var(--radius);
    font-size: 0.65rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--background));
  }
  
  .filter-button:hover {
    background: hsl(var(--accent));
  }
  
  .filter-button.primary {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border-color: hsl(var(--primary));
  }
  
  .filter-button.primary:hover {
    background: hsl(var(--primary) / 0.9);
  }
  
  .lms-tabs-compact {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid hsl(var(--border));
    padding-bottom: 0.25rem;
  }

  .lms-tabs-trigger-compact {
    background: transparent;
    color: hsl(var(--muted-foreground));
    border: none;
    padding: 0.375rem 0.25rem;
    cursor: pointer;
    transition: all 0.15s;
    font-weight: 500;
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    position: relative;
    white-space: nowrap;
  }

  .lms-tabs-trigger-compact.active {
    color: hsl(var(--primary));
  }

  .lms-tabs-trigger-compact.active::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -0.45rem;
    height: 2px;
    background: hsl(var(--primary));
    border-radius: 1px;
  }

  .lms-tabs-trigger-compact:hover:not(.active) {
    color: hsl(var(--foreground));
  }

  .tab-count-compact {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    padding: 0.125rem 0.25rem;
    border-radius: 0.5rem;
    font-size: 0.6rem;
    font-weight: 600;
    min-width: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tab-count {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    padding: 0.125rem 0.25rem;
    border-radius: 0.5rem;
    font-size: 0.6rem;
    font-weight: 600;
    min-width: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .resource-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem; }
  .resource-card { transition: all 0.15s ease; cursor: pointer; overflow: hidden; }
  .thumbnail-placeholder { width:100%; height:80px; border-radius: var(--radius); display:flex; align-items:center; justify-content:center; margin-bottom:.5rem; position:relative; overflow:hidden; background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--chart-3)) 100%); }
  .breadcrumb { display:flex; align-items:center; gap:.375rem; margin-bottom:0.75rem; padding:.5rem 0.75rem; background: linear-gradient(135deg, hsl(var(--primary) / 0.05) 0%, hsl(var(--primary) / 0.02) 100%); border-radius: var(--radius); font-size:0.7rem; border: 1px solid hsl(var(--primary) / 0.1); }
  .breadcrumb-item { color:hsl(var(--muted-foreground)); cursor:pointer; transition: all .2s; font-weight:500; padding:.125rem .375rem; border-radius:.2rem; display:flex; align-items:center; gap:.25rem; }
  .breadcrumb-item:hover { color:hsl(var(--primary)); background-color: hsl(var(--primary) / 0.05); }
  .breadcrumb-item.active { color:hsl(var(--primary)); font-weight:600; background-color: hsl(var(--primary) / 0.1); }
  .compact-view { padding: 0.75rem; }
  .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .loading-container { display: flex; align-items: center; justify-content: center; height: 100vh; }
  .loading-spinner { animation: spin 1s linear infinite; }
  .sub-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-radius: var(--radius); transition: all 0.15s; cursor: pointer; border: 1px solid hsl(var(--border)); margin-bottom: 0.375rem; font-size: 0.75rem; }
  .sub-item.selected { background-color: hsl(var(--primary) / 0.1); border-color: hsl(var(--primary) / 0.5); }
  .back-button { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; background-color: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); border: none; border-radius: var(--radius); cursor: pointer; transition: all 0.15s; margin-bottom: 0.75rem; font-size: 0.75rem; }
  .learning-method-card { cursor: pointer; transition: all 0.15s ease; position: relative; overflow: hidden; border: 1px solid hsl(var(--border)); border-radius: var(--radius); }
  .learning-method-card.selected { border-color: hsl(var(--primary)); background-color: hsl(var(--primary) / 0.03); }
  .activity-item { cursor: pointer; transition: all 0.1s ease; border: 1px solid hsl(var(--border)); border-radius: var(--radius); margin-bottom: 0.375rem; overflow: hidden; font-size: 0.75rem; }
  .activity-item.selected { background-color: hsl(var(--primary) / 0.1); border-color: hsl(var(--primary)); }
  .activity-item-header { padding: 0.5rem 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
  .sidebar-scroll-container { height: calc(100vh - 180px); overflow-y: auto; }
  .sidebar-scroll-container::-webkit-scrollbar { width: 4px; }
  .sidebar-scroll-container::-webkit-scrollbar-track { background: transparent; }
  .sidebar-scroll-container::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }
  .content-scroll-container::-webkit-scrollbar { width: 4px; }
  .content-scroll-container::-webkit-scrollbar-track { background: transparent; }
  .content-scroll-container::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }
  .learning-methods-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; margin-top: 0.75rem; }
  .method-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
  .method-icon { padding: 0.5rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .method-content { flex: 1; }
  .method-title { font-size: 0.9rem; font-weight: 700; margin-bottom: 0.125rem; }
  .method-description { font-size: 0.7rem; color: hsl(var(--muted-foreground)); line-height: 1.3; }
  .resources-section { margin-top: 1.5rem; }
  .section-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; }
  .method-stats { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
  .stat-item { display: flex; align-items: center; gap: 0.25rem; font-size: 0.65rem; color: hsl(var(--muted-foreground)); }
  .activity-count { display: flex; align-items: center; gap: 0.375rem; margin-top: 0.5rem; padding: 0.375rem 0.5rem; background: hsl(var(--muted)); border-radius: var(--radius); font-size: 0.65rem; }
  .activity-badge { display: inline-flex; align-items: center; gap: 0.125rem; padding: 0.125rem 0.375rem; background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); border-radius: 0.25rem; font-size: 0.6rem; font-weight: 600; }
  .method-content-wrapper { background: hsl(var(--card)); border-radius: var(--radius); padding: 1rem; height: 100%; }
  .activities-scroll-container { max-height: 500px; overflow-y: auto; margin-top: 0.75rem; padding-right: 0.25rem; }
  .activities-scroll-container::-webkit-scrollbar { width: 3px; }
  .activities-scroll-container::-webkit-scrollbar-track { background: hsl(var(--muted)); border-radius: 1.5px; }
  .activities-scroll-container::-webkit-scrollbar-thumb { background: hsl(var(--primary) / 0.3); border-radius: 1.5px; }
  .compact-header { background: linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.03) 100%); border-radius: var(--radius); padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; border: 1px solid hsl(var(--primary) / 0.1); }
  .compact-title { font-size: 0.8rem; font-weight: 600; color: hsl(var(--foreground)); margin-bottom: 0.125rem; }
  .compact-description { font-size: 0.65rem; color: hsl(var(--muted-foreground)); line-height: 1.2; }
  .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .navbar { background: hsl(var(--background)); border-bottom: 1px solid hsl(var(--border)); height: 60px; }
  .sidebar-header { border-bottom: 1px solid hsl(var(--sidebar-border)); flex-shrink: 0; }
  .search-input { background: hsl(var(--muted)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); padding: 0.375rem 0.75rem; font-size: 0.75rem; width: 100%; }
  .nav-icon-button { padding: 0.5rem; border-radius: var(--radius); transition: all 0.15s; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .nav-icon-button:hover { background: hsl(var(--accent)); }
  
  /* Dropdown styles */
  .dropdown-container { position: relative; display: inline-block; width: 100%; }
  .dropdown-select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid hsl(var(--border)); border-radius: var(--radius); background-color: hsl(var(--background)); color: hsl(var(--foreground)); font-size: 0.75rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
  .dropdown-select:focus { outline: none; border-color: hsl(var(--primary)); }
  .dropdown-options { position: absolute; top: 100%; left: 0; right: 0; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); z-index: 10; max-height: 200px; overflow-y: auto; margin-top: 0.25rem; }
  .dropdown-option { padding: 0.5rem 0.75rem; cursor: pointer; font-size: 0.75rem; border-bottom: 1px solid hsl(var(--border)); }
  .dropdown-option:last-child { border-bottom: none; }
  .dropdown-option:hover { background-color: hsl(var(--accent)); }
  .dropdown-option.selected { background-color: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); }
  
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in-up { animation: fadeInUp 0.3s ease-out; }
  .compact-resource-card { padding: 0.5rem; }
  .compact-resource-card h3 { font-size: 0.75rem; margin-bottom: 0.25rem; }
  .i-do-compact { max-height: 580px; overflow: hidden; }
  .i-do-compact .activities-scroll-container { max-height: 520px; }

  /* Panel styles */
  .panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 350px;
    background-color: hsl(var(--card));
    border-left: 1px solid hsl(var(--border));
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    z-index: 50;
    transition: transform 0.3s ease-in-out;
    overflow-y: auto;
    padding: 1rem;
  }
  .panel.hidden {
    transform: translateX(100%);
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid hsl(var(--border));
  }
  .panel-title {
    font-size: 0.9rem;
    font-weight: 700;
  }
  .panel-close-button {
    background: none;
    border: none;
    cursor: pointer;
    color: hsl(var(--muted-foreground));
  }
  .panel-content {
    font-size: 0.75rem;
    line-height: 1.5;
    color: hsl(var(--foreground));
  }
  .panel-content p {
    margin-bottom: 0.75rem;
  }
  .panel-content h4 {
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: hsl(var(--foreground));
  }
  .panel-content ul {
    list-style: disc;
    margin-left: 1.25rem;
    margin-bottom: 0.75rem;
  }
  .panel-content li {
    margin-bottom: 0.25rem;
  }
    .proceed-button {
  color: hsl(var(--primary));
  border: 1px solid hsl(var(--primary));
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius);
  font-size: 0.65rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.proceed-button:hover {
  transform: translateY(-1px);
}

.proceed-button:active {
  transform: translateY(0);
}

/* Dropdown grid layout */
.dropdown-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.dropdown-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dropdown-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.dropdown-description {
  font-size: 0.65rem;
  color: hsl(var(--muted-foreground));
}

/* Responsive additions */
@media (max-width: 768px) {
  .lms-container {
    font-size: 14px;
  }
  
  .resource-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .learning-methods-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .dropdown-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .lms-tabs-compact {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .compact-header {
    padding: 0.375rem 0.5rem;
  }
  
  .breadcrumb {
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.375rem;
  }
  
  .breadcrumb-item {
    font-size: 0.65rem;
    padding: 0.125rem 0.25rem;
  }

  .content-scroll-container {
    padding: 0.75rem;
  }

  .method-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .method-icon {
    align-self: flex-start;
  }
  
  .resource-filters {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filter-actions {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 1024px) and (min-width: 769px) {
  .resource-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

/* Mobile sidebar overlay */
.mobile-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 40;
}

.sidebar-mobile {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 280px;
  z-index: 50;
  transform: translateX(-100%);
  transition: transform 0.3s ease-in-out;
  background-color: hsl(var(--sidebar-background));
  color: hsl(var(--sidebar-foreground));
  border-right: 1px solid hsl(var(--sidebar-border));
}

.sidebar-mobile.open {
  transform: translateX(0);
}

/* Hide sidebar toggle on desktop */
@media (min-width: 1025px) {
  .mobile-sidebar-toggle {
    display: none;
  }
}

/* Adjust panels for mobile */
@media (max-width: 768px) {
  .panel {
    width: 100%;
    z-index: 60;
  }
}

/* Navbar responsive adjustments */
@media (max-width: 640px) {
  .navbar-search {
    display: none;
  }
  
  .navbar-icons {
    gap: 0.25rem;
  }
  
  .nav-icon-button {
    padding: 0.375rem;
  }
  
  .user-info-text {
    display: none;
  }

  .navbar {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}

/* Loading and error states responsive */
@media (max-width: 768px) {
  .loading-container, .error-container {
    padding: 1rem;
    text-align: center;
  }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .sidebar-scroll-container {
    height: calc(100vh - 140px);
  }

  .content-scroll-container {
    height: calc(100vh - 100px);
  }

  .thumbnail-placeholder {
    height: 60px;
  }

  .compact-resource-card {
    padding: 0.375rem;
  }

  .compact-resource-card h3 {
    font-size: 0.7rem;
  }
}

/* Tablet optimizations */
@media (max-width: 1024px) and (min-width: 769px) {
  .lms-sidebar {
    width: 260px;
  }
}

/* ZIP extraction styles */
.zip-extraction-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  flex-direction: column;
  gap: 1rem;
}

.zip-contents-badge {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.65rem;
  font-weight: 500;
}
`

// ==============================
// Helper Functions
// ==============================

const getLinkUrlForTooltip = (resource: Resource): string => {
  if (resource.externalUrl) return resource.externalUrl;
  if (typeof resource.fileUrl === 'object' && resource.fileUrl?.base) return resource.fileUrl.base;
  if (typeof resource.fileUrl === 'string') return resource.fileUrl;
  return 'No URL available';
};

const getFileType = (
  fileUrl: string | { base?: string;[key: string]: string | undefined },
  fileType: string
): ResourceType => {
  const urlString = typeof fileUrl === 'string' ? fileUrl : fileUrl.base || '';

  // Check for URL/link type first
  if (fileType?.includes("url/link") || fileType?.includes("link")) {
    return "link";
  }

  // ZIP detection
  if (fileType?.includes("zip") ||
    fileType?.includes("application/zip") ||
    fileType?.includes("application/x-zip") ||
    fileType?.includes("application/x-zip-compressed") ||
    urlString?.toLowerCase().includes(".zip")) {
    return "zip";
  }

  if (fileType?.includes("pdf")) return "pdf";

  if (
    fileType?.includes("powerpoint") ||
    fileType?.includes("presentation") ||
    urlString?.toLowerCase().includes(".ppt") ||
    urlString?.toLowerCase().includes(".pptx")
  ) return "ppt";

  if (
    fileType?.includes("video") ||
    urlString?.toLowerCase().includes(".mp4") ||
    urlString?.toLowerCase().includes(".mov") ||
    urlString?.toLowerCase().includes(".avi") ||
    urlString?.toLowerCase().includes(".wmv")
  ) return "video";

  // Default to pdf only if it's actually a document type
  if (fileType?.includes("application") || fileType?.includes("document")) {
    return "pdf";
  }

  return "link";
};

const getFileUrlString = (fileUrl?: string | { base?: string }): string =>
  typeof fileUrl === "string" ? fileUrl : fileUrl?.base || "";

const detectUrlType = (url: string): "video" | "ppt" | "pdf" | "external" => {
  const lowerUrl = url.toLowerCase();

  // Video extensions and streaming services
  if (lowerUrl.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv|m4v|3gp|ogv)$/) ||
    lowerUrl.includes('youtube.com') ||
    lowerUrl.includes('youtu.be') ||
    lowerUrl.includes('vimeo.com') ||
    lowerUrl.includes('dailymotion.com') ||
    lowerUrl.includes('twitch.tv') ||
    lowerUrl.includes('wistia.com')) {
    return "video";
  }

  // PPT extensions
  if (lowerUrl.match(/\.(ppt|pptx|pps|ppsx|pot|potx)$/) ||
    lowerUrl.includes('slideshare.net') ||
    lowerUrl.includes('speakerdeck.com') ||
    lowerUrl.includes('prezi.com') ||
    lowerUrl.includes('google.com/presentation')) {
    return "ppt";
  }

  // PDF extensions and common PDF hosting
  if (lowerUrl.match(/\.(pdf)$/) ||
    lowerUrl.includes('docs.google.com/document') ||
    lowerUrl.includes('drive.google.com/file') && lowerUrl.includes('/view')) {
    return "pdf";
  }

  return "external";
};

const getFileUrl = (
  fileUrl: string | { base?: string;[key: string]: string | undefined }
): string => {
  if (typeof fileUrl === 'string') return fileUrl;

  // Handle URL objects that might have url property
  if ((fileUrl as any).url) return (fileUrl as any).url;
  if ((fileUrl as any)['720p']) return (fileUrl as any)['720p'];
  if ((fileUrl as any)['480p']) return (fileUrl as any)['480p'];
  if ((fileUrl as any)['360p']) return (fileUrl as any)['360p'];
  if ((fileUrl as any)['240p']) return (fileUrl as any)['240p'];
  if (fileUrl.base) return fileUrl.base;

  return '';
};

const getFileDuration = (file: PedagogyFile): string => {
  const sizeNum = parseInt(file.size || "0");

  // Handle URL/link files differently
  if (file.fileType?.includes("url/link") || file.fileType?.includes("link")) {
    return "Link";
  }

  if (file.fileType?.includes("pdf")) return `${Math.ceil(sizeNum / 100000)} pages`;
  if (file.fileType?.includes("powerpoint") || file.fileType?.includes("presentation"))
    return `${Math.ceil(sizeNum / 50000)} slides`;
  return `${Math.ceil(sizeNum / 5000000)}:00`;
};

const formatSubItemName = (key: string): string => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const getResourcesByTypeFromFolders = (folders: PedagogyFolder[], selectedActivity: string): Resource[] => {
  return folders.map((folder, index) => ({
    id: `${selectedActivity}-folder-${index}`,
    title: folder.name,
    type: "folder" as ResourceType,
    duration: "0:00",
    children: [
      ...(folder.files || []).map((file, fIndex) => ({
        id: `${selectedActivity}-file-${fIndex}`,
        title: file.fileName || "Untitled",
        type: getFileType(file.fileUrl, file.fileType),
        duration: getFileDuration(file) || "0:00",
        fileUrl: getFileUrl(file.fileUrl),
        fileName: file.fileName,
        fileSize: `${(parseInt(file.size || "0") / (1024 * 1024)).toFixed(1)} MB`,
      })),
      ...(folder.subfolders ? getResourcesByTypeFromFolders(folder.subfolders, selectedActivity) : []),
    ],
  }));
};

const calculateModuleDuration = (module: Module): string => {
  let totalMinutes = 0;

  if (module.subModules) {
    module.subModules.forEach((subModule) => {
      if (subModule.topics) {
        subModule.topics.forEach((topic) => {
          if (topic.duration) {
            const duration = topic.duration;
            const hoursMatch = duration.match(/(\d+)h/);
            const minutesMatch = duration.match(/(\d+)m/);
            totalMinutes +=
              (hoursMatch ? parseInt(hoursMatch[1]) * 60 : 0) +
              (minutesMatch ? parseInt(minutesMatch[1]) : 0);
          }

          if (topic.subTopics) {
            topic.subTopics.forEach((subTopic) => {
              if (subTopic.duration) {
                const duration = subTopic.duration;
                const hoursMatch = duration.match(/(\d+)h/);
                const minutesMatch = duration.match(/(\d+)m/);
                totalMinutes +=
                  (hoursMatch ? parseInt(hoursMatch[1]) * 60 : 0) +
                  (minutesMatch ? parseInt(minutesMatch[1]) : 0);
              }
            });
          }
        });
      }
    });
  }

  if (module.topics) {
    module.topics.forEach((topic) => {
      if (topic.duration) {
        const duration = topic.duration;
        const hoursMatch = duration.match(/(\d+)h/);
        const minutesMatch = duration.match(/(\d+)m/);
        totalMinutes +=
          (hoursMatch ? parseInt(hoursMatch[1]) * 60 : 0) + (minutesMatch ? parseInt(minutesMatch[1]) : 0);
      }
    });
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

const hasChildItems = (item: Module | SubModule | Topic | SubTopic): boolean => {
  if ('subModules' in item && item.subModules && item.subModules.length > 0) return true;
  if ('topics' in item && item.topics && item.topics.length > 0) return true;
  if ('subTopics' in item && item.subTopics && item.subTopics.length > 0) return true;
  return false;
};

const getChildItemsCount = (item: Module | SubModule | Topic | SubTopic): number => {
  let count = 0;
  if ('subModules' in item && item.subModules) count += item.subModules.length;
  if ('topics' in item && item.topics) count += item.topics.length;
  if ('subTopics' in item && item.subTopics) count += item.subTopics.length;
  return count;
};

const hasPedagogyData = (item: Module | SubModule | Topic | SubTopic): boolean => {
  return !!(item.pedagogy && (item.pedagogy.I_Do || item.pedagogy.We_Do || item.pedagogy.You_Do));
};

const shouldShowArrow = (item: Module | SubModule | Topic | SubTopic): boolean => {
  return hasChildItems(item);
};

// ==============================
// Dropdown Component
// ==============================

const Dropdown: React.FC<DropdownProps> = ({ options, selectedValue, onSelect, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === selectedValue);

  return (
    <div className="dropdown-container">
      <div
        className="dropdown-select"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && !disabled && (
        <div className="dropdown-options">
          {options.map((option) => (
            <div
              key={option.value}
              className={`dropdown-option ${selectedValue === option.value ? 'selected' : ''}`}
              onClick={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
            >
              <div className="flex items-center gap-2">
                {option.icon && <option.icon className="w-3 h-3 flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-muted-foreground truncate">{option.description}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==============================
// Main Component
// ==============================

export default function LMSPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const courseId = params?.id as string;
  const theme = searchParams.get("theme") as "light" | "dark" | null;
  const isLight = theme === "light" || !theme;

  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedSubModules, setExpandedSubModules] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedSubTopics, setExpandedSubTopics] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(theme === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Resource filter state
  const [resourceFilters, setResourceFilters] = useState<ResourceFilter[]>([
    { type: "video", label: "Videos", icon: Video, checked: true },
    { type: "pdf", label: "PDFs", icon: FileText, checked: true },
    { type: "ppt", label: "Presentations", icon: Presentation, checked: true },
    { type: "folder", label: "Folders", icon: Folder, checked: true },
    { type: "zip", label: "ZIP Files", icon: Archive, checked: true },
    { type: "link", label: "Links", icon: Link, checked: true },
    { type: "reference", label: "References", icon: FileText, checked: true },
  ]);

  // UI state for Notes and AI panels
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showPPTViewer, setShowPPTViewer] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Resource | null>(null);
  const [currentPPT, setCurrentPPT] = useState<Resource | null>(null);
  const [currentPDF, setCurrentPDF] = useState<Resource | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Resource | null>(null);
  const [folderPath, setFolderPath] = useState<Resource[]>([]);
  const [dropdownCollapsed, setDropdownCollapsed] = useState(false);
  const [extractingZip, setExtractingZip] = useState<string | null>(null);

  const [showZipViewer, setShowZipViewer] = useState(false);
  const [currentZip, setCurrentZip] = useState<Resource | null>(null);

  const [rootFilters, setRootFilters] = useState<ResourceFilter[]>([]);

  // Toggle sidebar automatically when resizing between mobile & desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on item select only for mobile
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [selectedItem]);

  // Fetch course data
  useEffect(() => {
    const fetchCourseData = async () => {
      console.log("Starting fetch for courseId:", courseId);

      if (!courseId) {
        console.error("No courseId found in URL");
        setError("No course ID found in URL. Please check the URL and try again.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const url = `https://lms-server-ym1q.onrender.com/getAll/courses-data/${courseId}`;
        console.log("Fetching from URL:", url);

        const response = await fetch(url);
        console.log("Response status:", response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log("Raw response:", responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          throw new Error("Invalid JSON response from server");
        }

        console.log("Parsed data:", data);

        const courseInfo = data.data || data;

        if (!courseInfo) {
          throw new Error("No course data found in response");
        }

        console.log("Setting course data:", courseInfo);
        setCourseData(courseInfo);

        if (courseInfo.modules && courseInfo.modules.length > 0) {
          setExpandedModules(new Set([courseInfo.modules[0]._id]));
          console.log("Auto-expanded first module:", courseInfo.modules[0]._id);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
      } finally {
        setLoading(false);
        console.log("Fetch completed");
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  // Sync theme with URL parameter
  useEffect(() => {
    setIsDarkMode(theme === "dark");
  }, [theme]);

  // Effect to handle filter state when entering/leaving folders
  useEffect(() => {
    if (currentFolder) {
      // When entering a folder, save current root filters and select all available types in the folder
      if (folderPath.length === 1) {
        // First time entering a folder, save root filters
        setRootFilters([...resourceFilters]);
      }

      // Select all available types in the current folder
      const availableTypes = getAvailableResourceTypesForCurrentFolder();
      setResourceFilters(prev =>
        prev.map(filter => ({
          ...filter,
          checked: availableTypes.includes(filter.type)
        }))
      );
    } else if (folderPath.length === 0 && rootFilters.length > 0) {
      // When returning to root, restore the saved root filters
      setResourceFilters([...rootFilters]);
    }
  }, [currentFolder, folderPath.length]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    const newUrl = `${window.location.pathname}?theme=${newTheme ? "dark" : "light"}`;
    window.history.replaceState(null, "", newUrl);
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  // Get available resource types for current activity
  const getAvailableResourceTypes = (): ResourceType[] => {
    if (!selectedActivityData) return [];

    const availableTypes: ResourceType[] = [];

    // Check for videos
    const videoResources = getResourcesByType("video");
    if (videoResources.length > 0) {
      availableTypes.push("video");
    }

    // Check for PDFs
    const pdfResources = getResourcesByType("pdf");
    if (pdfResources.length > 0) {
      availableTypes.push("pdf");
    }

    // Check for PPTs
    const pptResources = getResourcesByType("ppt");
    if (pptResources.length > 0) {
      availableTypes.push("ppt");
    }

    // Check for folders
    const folderResources = getResourcesByType("folder");
    if (folderResources.length > 0) {
      availableTypes.push("folder");
    }

    // Check for ZIP files
    const zipResources = getResourcesByType("zip");
    if (zipResources.length > 0) {
      availableTypes.push("zip");
    }

    // Check for links
    const linkResources = getResourcesByType("link");
    if (linkResources.length > 0) {
      availableTypes.push("link");
    }

    const referenceResources = getResourcesByType("reference");
    if (referenceResources.length > 0) {
      availableTypes.push("reference");
    }

    return availableTypes;
  };

  // Resource filter functions
  const toggleResourceFilter = (type: ResourceType) => {
    setResourceFilters(prev =>
      prev.map(filter =>
        filter.type === type
          ? { ...filter, checked: !filter.checked }
          : filter
      )
    );
  };

  const selectAllFilters = () => {
    const availableTypes = currentFolder
      ? getAvailableResourceTypesForCurrentFolder()
      : getAvailableResourceTypes();

    setResourceFilters(prev =>
      prev.map(filter => ({
        ...filter,
        checked: availableTypes.includes(filter.type)
      }))
    );
  };

  const clearAllFilters = () => {
    setResourceFilters(prev =>
      prev.map(filter => ({ ...filter, checked: false }))
    );
  };

  const getSelectedFilters = (): ResourceType[] => {
    return resourceFilters.filter(filter => filter.checked).map(filter => filter.type);
  };

  // Get available resource types for current folder content
  const getAvailableResourceTypesForCurrentFolder = (): ResourceType[] => {
    if (!currentFolder || !currentFolder.children) return [];

    const availableTypes: ResourceType[] = [];

    // Helper function to recursively check folder contents
    const checkFolderContents = (resources: Resource[]) => {
      resources.forEach(resource => {
        if (!availableTypes.includes(resource.type)) {
          availableTypes.push(resource.type);
        }

        // Recursively check subfolders
        if (resource.type === "folder" && resource.children) {
          checkFolderContents(resource.children);
        }
      });
    };

    checkFolderContents(currentFolder.children);
    return availableTypes;
  };

  // Generate learning elements from selected item
  const learningElements = (): LearningElement[] => {
    if (!selectedItem || !selectedItem.pedagogy) return [];

    const pedagogy = selectedItem.pedagogy;
    console.log(pedagogy);

    const createLearningElement = (
      type: LearningElementType,
      pedagogyData: Record<string, PedagogyItem> | undefined,
    ): LearningElement => {
      const subItems: PedagogySubItem[] = [];

      if (pedagogyData) {
        Object.entries(pedagogyData).forEach(([key, item]) => {
          if (item) {
            subItems.push({
              key,
              name: formatSubItemName(key),
              description: item.description || "",
              files: item.files || [],
              folders: item.folders || [],
              links: item.links || [],
            });
          }
        });
      }

      const configs = {
        "i-do": {
          title: "I Do",
          description: "Teacher-led instruction and demonstrations",
          icon: Target,
          color: "hsl(24.6, 95%, 53.1%)",
          bgGradient: "linear-gradient(135deg, hsl(24.6, 95%, 53.1%) 0%, hsl(15, 100%, 50%) 100%)",
        },
        "we-do": {
          title: "We Do",
          description: "Collaborative exercises and guided practice",
          icon: Collaboration,
          color: "hsl(142, 76%, 36%)",
          bgGradient: "linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(152, 68%, 42%) 100%)",
        },
        "you-do": {
          title: "You Do",
          description: "Independent practice and application",
          icon: Rocket,
          color: "hsl(221, 83%, 53%)",
          bgGradient: "linear-gradient(135deg, hsl(221, 83%, 53%) 0%, hsl(262, 83%, 58%) 100%)",
        },
      };

      const config = configs[type];

      return {
        id: type,
        title: config.title,
        type,
        description: config.description,
        icon: config.icon,
        color: config.color,
        bgGradient: config.bgGradient,
        subItems,
      };
    };

    return [
      createLearningElement("i-do", pedagogy.I_Do),
      createLearningElement("we-do", pedagogy.We_Do),
      createLearningElement("you-do", pedagogy.You_Do),
    ];
  };

  const handleItemSelect = (
    itemId: string,
    itemTitle: string,
    itemType: SelectedItemType,
    hierarchy: string[],
    pedagogy?: Pedagogy,
  ) => {
    const hasPedagogy = pedagogy && (pedagogy.I_Do || pedagogy.We_Do || pedagogy.You_Do);
    console.log(hasPedagogy);
    if (hasPedagogy) {
      setSelectedItem({
        id: itemId,
        title: itemTitle,
        type: itemType,
        hierarchy,
        pedagogy,
      });
      // Reset folder navigation when selecting a new item
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      if (itemType === "module") {
        toggleModule(itemId);
      } else if (itemType === "submodule") {
        toggleSubModule(itemId);
      } else if (itemType === "topic") {
        toggleTopic(itemId);
      } else if (itemType === "subtopic") {
        toggleSubTopic(itemId);
      }
    }
  };

  const toggleModule = (moduleId: string) => {
    const next = new Set(expandedModules);
    next.has(moduleId) ? next.delete(moduleId) : next.add(moduleId);
    setExpandedModules(next);
  };

  const toggleSubModule = (subModuleId: string) => {
    const next = new Set(expandedSubModules);
    next.has(subModuleId) ? next.delete(subModuleId) : next.add(subModuleId);
    setExpandedSubModules(next);
  };

  const toggleTopic = (topicId: string) => {
    const next = new Set(expandedTopics);
    next.has(topicId) ? next.delete(topicId) : next.add(topicId);
    setExpandedTopics(next);
  };

  const toggleSubTopic = (subTopicId: string) => {
    const next = new Set(expandedSubTopics);
    next.has(subTopicId) ? next.delete(subTopicId) : next.add(subTopicId);
    setExpandedSubTopics(next);
  };

  const mapFolderToResource = (folder: PedagogyFolder): Resource => ({
    id: folder._id || `folder-${folder.name}-${Math.random().toString(36).substr(2, 5)}`,
    title: folder.name,
    type: "folder",
    duration: "",
    uploadedAt: folder.uploadedAt ?? undefined,
    children: [
      ...(folder.files || []).map((file) => {
        const fileType = getFileType(file.fileUrl, file.fileType);
        const resource: Resource = {
          id: file._id || `file-${file.fileName}-${Math.random().toString(36).substr(2, 5)}`,
          title: file.fileName || "Untitled",
          type: fileType, // Keep the original file type
          duration: getFileDuration(file),
          fileName: file.fileName,
          fileSize: `${(parseInt(file.size || "0") / (1024 * 1024)).toFixed(1)} MB`,
          uploadedAt: file.uploadedAt,
          isReference: file.isReference || false,
        };

        if (fileType === "link") {
          resource.externalUrl = getFileUrl(file.fileUrl);
        } else {
          resource.fileUrl = getFileUrl(file.fileUrl);
        }

        return resource;
      }),
      ...(folder.subfolders ? folder.subfolders.map(mapFolderToResource) : [])
    ]
  });

  const getResourcesByType = (
    type: ResourceType
  ): Resource[] => {
    if (!selectedMethod || !selectedActivity) return [];

    const elements = learningElements();
    const method = elements.find(el => el.id === selectedMethod);
    if (!method) return [];

    const activity = method.subItems.find(item => item.key === selectedActivity);
    if (!activity) return [];

    // FILES - including URL/link files
    const files: Resource[] = (activity.files || [])
      .filter(file => {
        if (type === "reference") {
          return file.isReference === true;
        } else {
          const fileType = getFileType(file.fileUrl, file.fileType);
          return fileType === type && !file.isReference; // Exclude reference files from regular type filters
        }
      })
      .map(file => {
        const fileType = getFileType(file.fileUrl, file.fileType);
        const resource: Resource = {
          id: file._id || `file-${file.fileName}-${Math.random().toString(36).substr(2, 5)}`,
          title: file.fileName || "Untitled",
          type: file.isReference ? "reference" : fileType, // Set type to "reference" if isReference is true
          duration: getFileDuration(file),
          fileName: file.fileName,
          fileSize: `${(parseInt(file.size || "0") / (1024 * 1024)).toFixed(1)} MB`,
          uploadedAt: file.uploadedAt,
          isReference: file.isReference || false,
        };

        // For links, use externalUrl; for files, use fileUrl
        if (fileType === "link") {
          resource.externalUrl = getFileUrl(file.fileUrl);
        } else {
          resource.fileUrl = getFileUrl(file.fileUrl);
        }

        return resource;
      });

    // FOLDERS
    const folders: Resource[] = (activity.folders || []).map(mapFolderToResource);

    // LINKS from activity.links array
    const linksFromArray: Resource[] = (activity.links || []).map(link => ({
      id: link._id || `link-${link.name}-${Math.random().toString(36).substr(2, 5)}`,
      title: link.name,
      type: "link",
      externalUrl: link.url,
      uploadedAt: link.uploadedAt,
    }));

    if (type === "folder") return folders;
    if (type === "zip") return files.filter(f => f.type === "zip");
    if (type === "link") return [...files.filter(f => f.type === "link"), ...linksFromArray];
    return files.filter(f => f.type === type);
  };

  // Get filtered resources based on selected filters - works for both root and folder contents
  const getFilteredResources = (resourcesToFilter?: Resource[]): Resource[] => {
    const selectedFilterTypes = getSelectedFilters();

    if (selectedFilterTypes.length === 0) {
      return [];
    }

    // If specific resources are provided (like folder contents), filter them
    if (resourcesToFilter) {
      return resourcesToFilter.filter(resource =>
        selectedFilterTypes.includes(resource.type)
      );
    }

    // Otherwise, get from root level
    const allResources: Resource[] = [];

    selectedFilterTypes.forEach(type => {
      const resources = getResourcesByType(type);
      allResources.push(...resources);
    });

    return allResources;
  };

  // Get resources to display based on current context (root or folder)
  const getResourcesToDisplay = (): Resource[] => {
    if (currentFolder && currentFolder.children) {
      // When in a folder, filter the folder's children
      return getFilteredResources(currentFolder.children);
    } else {
      // When at root level, use the normal filtered resources
      return getFilteredResources();
    }
  };

  // Get selected activity data
  const selectedActivityData = selectedMethod && selectedActivity
    ? learningElements()
      .find(el => el.id === selectedMethod)
      ?.subItems.find(item => item.key === selectedActivity)
    : null;


  const handleResourceClick = async (resource: Resource) => {
    // For reference files, check their actual file type and open in appropriate viewer
    if (resource.isReference) {
      const actualFileType = getFileType(resource.fileUrl || '', resource.fileName || '');

      if (actualFileType === "video") {
        setCurrentVideo(resource);
        setShowVideoPlayer(true);
      } else if (actualFileType === "ppt") {
        setCurrentPPT(resource);
        setShowPPTViewer(true);
      } else if (actualFileType === "pdf") {
        setCurrentPDF(resource);
        setShowPDFViewer(true);
      } else if (actualFileType === "zip") {
        setCurrentZip(resource);
        setShowZipViewer(true);
      } else {
        // For other reference types, download the file
        let downloadUrl = resource.externalUrl;

        if (!downloadUrl && resource.fileUrl) {
          if (typeof resource.fileUrl === 'object' && resource.fileUrl.base) {
            downloadUrl = resource.fileUrl.base;
          } else if (typeof resource.fileUrl === 'string') {
            downloadUrl = resource.fileUrl;
          }
        }

        if (downloadUrl) {
          window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        }
      }
      return;
    }

    // Existing non-reference file handling
    if (resource.type === "video") {
      setCurrentVideo(resource);
      setShowVideoPlayer(true);
    } else if (resource.type === "ppt") {
      setCurrentPPT(resource);
      setShowPPTViewer(true);
    } else if (resource.type === "pdf") {
      setCurrentPDF(resource);
      setShowPDFViewer(true);
    } else if (resource.type === "folder") {
      setCurrentFolder(resource);
      setFolderPath(prev => [...prev, resource]);
    } else if (resource.type === "zip") {
      setCurrentZip(resource);
      setShowZipViewer(true);
    } else if (resource.type === "link") {
      let linkUrl = resource.externalUrl;

      if (!linkUrl && resource.fileUrl) {
        if (typeof resource.fileUrl === 'object' && resource.fileUrl.base) {
          linkUrl = resource.fileUrl.base;
        } else if (typeof resource.fileUrl === 'string') {
          linkUrl = resource.fileUrl;
        }
      }

      if (linkUrl) {
        const urlType = detectUrlType(linkUrl);

        switch (urlType) {
          case "video":
            setCurrentVideo({ ...resource, fileUrl: linkUrl, type: "video" });
            setShowVideoPlayer(true);
            break;
          case "ppt":
            setCurrentPPT({ ...resource, fileUrl: linkUrl, type: "ppt" });
            setShowPPTViewer(true);
            break;
          case "pdf":
            setCurrentPDF({ ...resource, fileUrl: linkUrl, type: "pdf" });
            setShowPDFViewer(true);
            break;
          case "external":
          default:
            window.open(linkUrl, '_blank', 'noopener,noreferrer');
            break;
        }
      }
    }
  };

  const renderResourceIcon = (type: ResourceType) => {
    switch (type) {
      case "video":
        return <Video className="w-3 h-3" />;
      case "ppt":
        return <Presentation className="w-3 h-3" />;
      case "pdf":
        return <FileText className="w-3 h-3" />;
      case "folder":
        return <Folder className="w-3 h-3" />;
      case "zip":
        return <Archive className="w-3 h-3" />;
      case "link":
        return <Link className="w-3 h-3" />;
      case "reference":
        return <FileText className="w-3 h-3" />;
      default:
        return <File className="w-3 h-3" />;
    }
  };

  const renderBreadcrumb = () => {
    if (!courseData) return null;

    const breadcrumbItems: Array<{
      title: string;
      icon: React.ComponentType<any>;
      onClick: (() => void) | null;
    }> = [];

    breadcrumbItems.push({
      title: "All Courses",
      icon: BookOpen,
      onClick: () => {
        console.log("Navigate to all courses");
      },
    });

    breadcrumbItems.push({
      title: courseData.courseName,
      icon: GraduationCap,
      onClick: () => {
        setSelectedItem(null);
        setSelectedMethod("");
        setSelectedActivity("");
        setCurrentFolder(null);
        setFolderPath([]);
      },
    });

    if (selectedItem) {
      let currentModule: Module | null = null;
      let currentSubModule: SubModule | null = null;
      let currentTopic: Topic | null = null;
      let currentSubTopic: SubTopic | null = null;

      outerLoop: for (const module of courseData.modules || []) {
        if (selectedItem.hierarchy.includes(module._id)) {
          currentModule = module;
          breadcrumbItems.push({
            title: module.title,
            icon: BookOpen,
            onClick: () => {
              setExpandedModules(new Set([module._id]));
              setExpandedSubModules(new Set());
              setExpandedTopics(new Set());
              setExpandedSubTopics(new Set());
              setSelectedItem(null);
              setSelectedMethod("");
              setSelectedActivity("");
              setCurrentFolder(null);
              setFolderPath([]);
            },
          });
        }

        if (module.subModules) {
          for (const subModule of module.subModules) {
            if (selectedItem.hierarchy.includes(subModule._id)) {
              currentSubModule = subModule;
              breadcrumbItems.push({
                title: subModule.title,
                icon: FileText,
                onClick: () => {
                  setExpandedModules(new Set([module._id]));
                  setExpandedSubModules(new Set([subModule._id]));
                  setExpandedTopics(new Set());
                  setExpandedSubTopics(new Set());
                  setSelectedItem(null);
                  setSelectedMethod("");
                  setSelectedActivity("");
                  setCurrentFolder(null);
                  setFolderPath([]);
                },
              });
            }

            if (subModule.topics) {
              for (const topic of subModule.topics) {
                if (selectedItem.hierarchy.includes(topic._id)) {
                  currentTopic = topic;
                  breadcrumbItems.push({
                    title: topic.title,
                    icon: File,
                    onClick:
                      selectedItem.type === "subtopic"
                        ? () => {
                          setExpandedModules(new Set([module._id]));
                          setExpandedSubModules(new Set([subModule._id]));
                          setExpandedTopics(new Set([topic._id]));
                          setExpandedSubTopics(new Set());
                          setSelectedItem(null);
                          setSelectedMethod("");
                          setSelectedActivity("");
                          setCurrentFolder(null);
                          setFolderPath([]);
                        }
                        : null,
                  });

                  if (selectedItem.type === "subtopic" && topic.subTopics) {
                    for (const subtopic of topic.subTopics) {
                      if (subtopic._id === selectedItem.id) {
                        currentSubTopic = subtopic;
                        breadcrumbItems.push({
                          title: subtopic.title,
                          icon: File,
                          onClick: null,
                        });
                        break outerLoop;
                      }
                    }
                  } else {
                    break outerLoop;
                  }
                }
              }
            }
          }
        }

        if (module.topics) {
          for (const topic of module.topics) {
            if (topic._id === selectedItem.id) {
              currentTopic = topic;
              breadcrumbItems.push({
                title: topic.title,
                icon: File,
                onClick: null,
              });
              break outerLoop;
            }

            if (topic.subTopics) {
              for (const subtopic of topic.subTopics) {
                if (subtopic._id === selectedItem.id) {
                  currentSubTopic = subtopic;
                  breadcrumbItems.push({
                    title: topic.title,
                    icon: File,
                    onClick: () => {
                      setExpandedModules(new Set([module._id]));
                      setExpandedTopics(new Set([topic._id]));
                      setExpandedSubTopics(new Set());
                      setSelectedItem(null);
                      setSelectedMethod("");
                      setSelectedActivity("");
                      setCurrentFolder(null);
                      setFolderPath([]);
                    },
                  });
                  breadcrumbItems.push({
                    title: subtopic.title,
                    icon: File,
                    onClick: null,
                  });
                  break outerLoop;
                }
              }
            }
          }
        }

        if (module._id === selectedItem.id) {
          break;
        }
      }
    }

    return (
      <div className="breadcrumb">
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />}
            <div
              className={`breadcrumb-item ${index === breadcrumbItems.length - 1 ? "active" : ""}`}
              onClick={item.onClick || undefined}
              style={{ cursor: item.onClick ? "pointer" : "default" }}
            >
              <item.icon className="w-3 h-3 mr-1" />
              <span>{item.title}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // FIXED: Dynamic hierarchy renderer with proper arrow visibility and larger icons
  const renderHierarchy = () => {
    if (!courseData?.modules) return null;

    return courseData.modules.map((module) => {
      const moduleDuration = calculateModuleDuration(module);
      const moduleHasChildren = shouldShowArrow(module);
      const moduleHasPedagogy = hasPedagogyData(module);

      return (
        <div key={module._id} className="mb-1">
          <button
            onClick={() => handleItemSelect(module._id, module.title, "module", [module._id], module.pedagogy)}
            className={`flex items-center w-full p-2 text-left rounded transition-all duration-150 ${selectedItem?.id === module._id ? "bg-opacity-80" : ""
              }`}
            style={{
              backgroundColor:
                expandedModules.has(module._id) || selectedItem?.id === module._id
                  ? "hsl(var(--sidebar-accent) / 0.7)"
                  : "transparent",
              borderLeft: selectedItem?.id === module._id ? "2px solid hsl(var(--primary))" : "2px solid transparent",
            }}
          >
            {moduleHasChildren ? (
              expandedModules.has(module._id) ? (
                <ChevronDown className="w-4 h-4 mr-2 opacity-70" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-2 opacity-70" />
              )
            ) : (
              <div className="w-4 h-4 mr-2" />
            )}
            <BookOpen className="w-4 h-4 mr-2" style={{ color: "hsl(var(--sidebar-primary))" }} />
            <span className="text-xs font-semibold flex-1">{module.title}</span>
          </button>

          {expandedModules.has(module._id) && moduleHasChildren && (
            <div className="ml-4 mt-1 space-y-0.5">
              {module.subModules && module.subModules.length > 0 && (
                <>
                  {module.subModules.map((subModule) => {
                    const subModuleHasChildren = shouldShowArrow(subModule);
                    const subModuleHasPedagogy = hasPedagogyData(subModule);

                    return (
                      <div key={subModule._id}>
                        <button
                          onClick={() =>
                            handleItemSelect(
                              subModule._id,
                              subModule.title,
                              "submodule",
                              [module._id, subModule._id],
                              subModule.pedagogy,
                            )
                          }
                          className={`flex items-center w-full p-2 text-left rounded transition-all duration-150 ${selectedItem?.id === subModule._id ? "bg-opacity-80" : ""
                            }`}
                          style={{
                            backgroundColor:
                              expandedSubModules.has(subModule._id) || selectedItem?.id === subModule._id
                                ? "hsl(var(--sidebar-accent) / 0.4)"
                                : "transparent",
                            borderLeft:
                              selectedItem?.id === subModule._id
                                ? "2px solid hsl(var(--primary))"
                                : "2px solid transparent",
                          }}
                        >
                          {subModuleHasChildren ? (
                            expandedSubModules.has(subModule._id) ? (
                              <ChevronDown className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                            )
                          ) : (
                            <div className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          <FileText className="w-3.5 h-3.5 mr-1.5" style={{ color: "hsl(var(--sidebar-primary) / 0.8)" }} />
                          <span className="text-xs font-medium flex-1">{subModule.title}</span>
                        </button>

                        {expandedSubModules.has(subModule._id) && subModuleHasChildren && subModule.topics && (
                          <div className="ml-4 mt-0.5 space-y-0.5">
                            {subModule.topics.map((topic) => {
                              const topicHasChildren = shouldShowArrow(topic);
                              const topicHasPedagogy = hasPedagogyData(topic);

                              return (
                                <div key={topic._id}>
                                  <div className="flex items-center">
                                    {topicHasChildren ? (
                                      <button
                                        onClick={() => toggleTopic(topic._id)}
                                        className="flex items-center p-1.5 rounded transition-all duration-150"
                                        style={{
                                          backgroundColor: expandedTopics.has(topic._id)
                                            ? "hsl(var(--sidebar-accent) / 0.3)"
                                            : "transparent",
                                        }}
                                      >
                                        {expandedTopics.has(topic._id) ? (
                                          <ChevronDown className="w-3 h-3 mr-1 opacity-50" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3 mr-1 opacity-50" />
                                        )}
                                      </button>
                                    ) : (
                                      <div className="w-3 h-3 mr-1 ml-1.5" />
                                    )}

                                    <button
                                      onClick={() =>
                                        handleItemSelect(
                                          topic._id,
                                          topic.title,
                                          "topic",
                                          [module._id, subModule._id, topic._id],
                                          topic.pedagogy,
                                        )
                                      }
                                      className={`flex items-center flex-1 p-1.5 text-left rounded transition-all duration-150 ${selectedItem?.id === topic._id ? "bg-opacity-80" : ""
                                        }`}
                                      style={{
                                        backgroundColor:
                                          selectedItem?.id === topic._id ? "hsl(var(--primary) / 0.15)" : "transparent",
                                        borderLeft:
                                          selectedItem?.id === topic._id
                                            ? "2px solid hsl(var(--primary))"
                                            : "2px solid transparent",
                                      }}
                                    >
                                      <File
                                        className="w-3 h-3 mr-1.5"
                                        style={{ color: "hsl(var(--sidebar-primary) / 0.6)" }}
                                      />
                                      <span className="text-xs flex-1">{topic.title}</span>
                                    </button>
                                  </div>

                                  {expandedTopics.has(topic._id) && topic.subTopics && topic.subTopics.length > 0 && (
                                    <div className="ml-5 mt-0.5 space-y-0.5">
                                      {topic.subTopics.map((subtopic) => {
                                        const subtopicHasPedagogy = hasPedagogyData(subtopic);

                                        return (
                                          <button
                                            key={subtopic._id}
                                            onClick={() =>
                                              handleItemSelect(
                                                subtopic._id,
                                                subtopic.title,
                                                "subtopic",
                                                [module._id, subModule._id, topic._id, subtopic._id],
                                                subtopic.pedagogy,
                                              )
                                            }
                                            className={`flex items-center w-full p-1.5 text-left rounded transition-all duration-150 ${selectedItem?.id === subtopic._id ? "bg-opacity-80" : ""
                                              }`}
                                            style={{
                                              backgroundColor:
                                                selectedItem?.id === subtopic._id
                                                  ? "hsl(var(--primary) / 0.15)"
                                                  : "transparent",
                                              borderLeft:
                                                selectedItem?.id === subtopic._id
                                                  ? "2px solid hsl(var(--primary))"
                                                  : "2px solid transparent",
                                            }}
                                          >
                                            <File
                                              className="w-2.5 h-2.5 mr-1.5"
                                              style={{ color: "hsl(var(--sidebar-primary) / 0.4)" }}
                                            />
                                            <span className="text-xs flex-1">{subtopic.title}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {(!module.subModules || module.subModules.length === 0) && module.topics && module.topics.length > 0 && (
                <>
                  {module.topics.map((topic) => {
                    const topicHasChildren = shouldShowArrow(topic);
                    const topicHasPedagogy = hasPedagogyData(topic);

                    return (
                      <div key={topic._id}>
                        <div className="flex items-center">
                          {topicHasChildren ? (
                            <button
                              onClick={() => toggleTopic(topic._id)}
                              className="flex items-center p-1.5 rounded transition-all duration-150"
                              style={{
                                backgroundColor: expandedTopics.has(topic._id)
                                  ? "hsl(var(--sidebar-accent) / 0.3)"
                                  : "transparent",
                              }}
                            >
                              {expandedTopics.has(topic._id) ? (
                                <ChevronDown className="w-3 h-3 mr-1 opacity-50" />
                              ) : (
                                <ChevronRight className="w-3 h-3 mr-1 opacity-50" />
                              )}
                            </button>
                          ) : (
                            <div className="w-3 h-3 mr-1 ml-1.5" />
                          )}

                          <button
                            onClick={() =>
                              handleItemSelect(
                                topic._id,
                                topic.title,
                                "topic",
                                [module._id, topic._id],
                                topic.pedagogy,
                              )
                            }
                            className={`flex items-center flex-1 p-1.5 text-left rounded transition-all duration-150 ${selectedItem?.id === topic._id ? "bg-opacity-80" : ""
                              }`}
                            style={{
                              backgroundColor:
                                selectedItem?.id === topic._id ? "hsl(var(--primary) / 0.15)" : "transparent",
                              borderLeft:
                                selectedItem?.id === topic._id ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                            }}
                          >
                            <File
                              className="w-3 h-3 mr-1.5"
                              style={{ color: "hsl(var(--sidebar-primary) / 0.6)" }}
                            />
                            <span className="text-xs flex-1">{topic.title}</span>
                            {topic.duration && (
                              <span className="lms-badge lms-badge-outline text-[10px] ml-1">
                                <Clock className="w-2 h-2 mr-0.5" />
                                {topic.duration}
                              </span>
                            )}
                            {topicHasPedagogy && (
                              <span className="lms-badge text-[10px] ml-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                Content
                              </span>
                            )}
                          </button>
                        </div>

                        {expandedTopics.has(topic._id) && topic.subTopics && topic.subTopics.length > 0 && (
                          <div className="ml-5 mt-0.5 space-y-0.5">
                            {topic.subTopics.map((subtopic) => {
                              const subtopicHasPedagogy = hasPedagogyData(subtopic);

                              return (
                                <button
                                  key={subtopic._id}
                                  onClick={() =>
                                    handleItemSelect(
                                      subtopic._id,
                                      subtopic.title,
                                      "subtopic",
                                      [module._id, topic._id, subtopic._id],
                                      subtopic.pedagogy,
                                    )
                                  }
                                  className={`flex items-center w-full p-1.5 text-left rounded transition-all duration-150 ${selectedItem?.id === subtopic._id ? "bg-opacity-80" : ""
                                    }`}
                                  style={{
                                    backgroundColor:
                                      selectedItem?.id === subtopic._id ? "hsl(var(--primary) / 0.15)" : "transparent",
                                    borderLeft:
                                      selectedItem?.id === subtopic._id
                                        ? "2px solid hsl(var(--primary))"
                                        : "2px solid transparent",
                                  }}
                                >
                                  <File
                                    className="w-2.5 h-2.5 mr-1.5"
                                    style={{ color: "hsl(var(--sidebar-primary) / 0.4)" }}
                                  />
                                  <span className="text-xs flex-1">{subtopic.title}</span>
                                  {subtopic.duration && (
                                    <span className="lms-badge lms-badge-outline text-[10px] ml-1">
                                      <Clock className="w-1.5 h-1.5 mr-0.5" />
                                      {subtopic.duration}
                                    </span>
                                  )}
                                  {subtopicHasPedagogy && (
                                    <span className="lms-badge text-[10px] ml-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                      Content
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className={`lms-container ${isDarkMode ? "dark" : ""}`}>
        <style>{styles}</style>
        <div className="loading-container">
          <Loader2 className="loading-spinner w-6 h-6" style={{ color: "hsl(var(--primary))" }} />
          <span className="ml-2 text-xs">Loading course content...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <React.Fragment>
        <div className={`lms-container ${isDarkMode ? "dark" : ""}`}>
          <style>{styles}</style>
          <div className="flex items-center justify-center h-screen error-container">
            <div className="text-center">
              <h2 className="text-base font-semibold mb-1" style={{ color: "hsl(var(--destructive))" }}>
                Error Loading Course
              </h2>
              <p className="text-xs mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                {error}
              </p>
              <button onClick={() => window.location.reload()} className="lms-button-outline text-xs">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

  // Get learning method options
  const learningMethodOptions: DropdownOption[] = learningElements().map(element => ({
    value: element.id,
    label: element.title,
    description: element.description,
    icon: element.icon
  }));

  // Get activity options based on selected method
  const activityOptions: DropdownOption[] = selectedMethod
    ? learningElements()
      .find(el => el.id === selectedMethod)
      ?.subItems.map(item => ({
        value: item.key,
        label: item.name,
        description: item.description
      })) || []
    : [];

  // Get available resource types based on current context (root or folder)
  const getAvailableResourceTypesForCurrentContext = (): ResourceType[] => {
    if (currentFolder) {
      // When in a folder, show types available in the folder
      return getAvailableResourceTypesForCurrentFolder();
    } else {
      // When at root, show types available in the activity
      return getAvailableResourceTypes();
    }
  };

  // Get filtered resources for display
  const resourcesToDisplay = getResourcesToDisplay();

  return (
    <div className={`lms-container ${isDarkMode ? "dark" : ""}`}>
      <style>{styles}</style>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="mobile-sidebar-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`sidebar-mobile ${sidebarOpen ? 'open' : ''} lg:hidden`}>
        <div className="sidebar-header p-3 flex-shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-xs font-bold" style={{ color: "hsl(var(--sidebar-foreground))" }}>
              {courseData?.courseName || "Course Content"}
            </h1>
            {courseData?.courseDescription && (
              <p
                className="text-xs mt-1 line-clamp-2"
                style={{ color: "hsl(var(--sidebar-foreground) / 0.7)", fontSize: "0.65rem" }}
              >
                {courseData.courseDescription}
              </p>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="nav-icon-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="sidebar-scroll-container p-3">{renderHierarchy()}</div>
      </div>

      {/* Navbar */}
      <nav className="navbar flex items-center justify-between px-4 py-2 lg:px-4 lg:py-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="nav-icon-button hidden lg:flex"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
            <span className="text-sm font-medium hidden sm:block bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
              Learning Management System
            </span>
            <span className="text-sm font-medium sm:hidden bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
              LMS
            </span>
          </div>
        </div>

        <div className="navbar-search flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative group">
            <Search
              className={`w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isLight
                ? "text-gray-400 group-focus-within:text-gray-600"
                : "text-gray-500 group-focus-within:text-gray-300"
                }`}
            />
            <input
              type="text"
              placeholder="Search courses, modules, resources..."
              className={`w-full pl-11 pr-4 py-2 rounded-2xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 ${isLight
                ? "bg-gray-50 text-gray-700 placeholder:text-gray-400 focus:ring-indigo-500"
                : "bg-gray-800 text-gray-200 placeholder:text-gray-500 focus:ring-indigo-400"
                }`}
            />
          </div>
        </div>

        <div className="navbar-icons flex items-center gap-1">
          <button className="nav-icon-button md:hidden">
            <Search className="w-4 h-4" />
          </button>

          <button className="nav-icon-button">
            <Bell className="w-4 h-4" />
          </button>
          <button className="nav-icon-button">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={toggleTheme} className="nav-icon-button">
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowNotesPanel((v) => !v)}
            className="nav-icon-button"
            aria-label="Open notes"
            title="Notes"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAIPanel((v) => !v)}
            className="nav-icon-button"
            aria-label="Open AI assistant"
            title="AI"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <div className="user-info flex items-center gap-2 ml-2 pl-2 border-l" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <span className="user-info-text text-xs font-medium hidden sm:block">Instructor</span>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-60px)] overflow-hidden">
        {/* Desktop Sidebar */}
        {sidebarOpen && (
          <div className="w-72 lms-sidebar flex-col hidden lg:flex">
            <div className="sidebar-header p-3 flex-shrink-0">
              <div className="mb-2">
                <h1 className="text-xs font-bold" style={{ color: "hsl(var(--sidebar-foreground))" }}>
                  {courseData?.courseName || "Course Content"}
                </h1>
                {courseData?.courseDescription && (
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: "hsl(var(--sidebar-foreground) / 0.7)", fontSize: "0.65rem" }}
                  >
                    {courseData.courseDescription}
                  </p>
                )}
              </div>
              <div
                className="flex items-center gap-2 text-xs"
                style={{ color: "hsl(var(--sidebar-foreground) / 0.6)" }}
              >
                <BookOpen className="w-3 h-3" />
                <span>{courseData?.modules?.length || 0} Modules</span>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>Self-paced</span>
              </div>
            </div>

            <div className="sidebar-scroll-container p-3">{renderHierarchy()}</div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="content-scroll-container no-scrollbar p-4 flex flex-col flex-1 overflow-hidden min-h-0">
            {!selectedItem ? (
              <div>
                {renderBreadcrumb()}
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground))" }} />
                  <h2 className="text-base font-semibold mb-1">Select a Content Item to Begin</h2>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Choose a module, topic, or subtopic from the sidebar to start your learning journey
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                {renderBreadcrumb()}

                {!selectedItem ? (
                  <div className="text-center py-12">
                    <BookOpen
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    />
                    <h2 className="text-base font-semibold mb-1">
                      Select a Content Item to Begin
                    </h2>
                    <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                      Choose a module, topic, or subtopic from the sidebar to start your learning journey
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0">
                    {/* ===========================
       Dropdowns + Filters Section
     =========================== */}
                    <div className="flex flex-col gap-2 mt-4">
                      {/* Learning Method & Activity dropdowns */}
                      <div
                        className={`transition-all duration-500 ${dropdownCollapsed
                          ? "max-h-0 opacity-0 overflow-hidden"
                          : "max-h-[400px] opacity-100"
                          }`}
                      >
                        <div className="dropdown-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Learning Method */}
                          <div className="dropdown-group">
                            <h6 className="dropdown-label">Learning Method</h6>
                            <p className="dropdown-description">Choose a method to explore</p>
                            <Dropdown
                              options={[
                                { value: "i-do", label: "I Do" },
                                { value: "we-do", label: "We Do" },
                                { value: "you-do", label: "You Do" },
                              ]}
                              selectedValue={selectedMethod}
                              onSelect={setSelectedMethod}
                              placeholder="Select Method"
                            />
                          </div>

                          {/* Activity */}
                          <div className="dropdown-group">
                            <h6 className="dropdown-label">Activity</h6>
                            <p className="dropdown-description">Select activity under chosen method</p>
                            <Dropdown
                              options={
                                selectedMethod
                                  ? learningElements()
                                    .find((el) => el.id === selectedMethod)
                                    ?.subItems.map((s) => ({ value: s.key, label: s.name })) || []
                                  : []
                              }
                              selectedValue={selectedActivity}
                              onSelect={setSelectedActivity}
                              placeholder="Select Activity"
                              disabled={!selectedMethod}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Filters row — show only when Method & Activity selected and activities exist */}
                      {selectedMethod &&
                        selectedActivity &&
                        (learningElements().find((el) => el.id === selectedMethod)?.subItems?.length ?? 0) > 0 && (
                          <div className="resource-filters flex flex-wrap items-center gap-2 transition-all duration-500 ease-in-out">
                            {/* Filter checkboxes */}
                            {resourceFilters
                              .filter((filter) => getAvailableResourceTypesForCurrentContext().includes(filter.type))
                              .map((filter) => (
                                <label
                                  key={filter.type}
                                  className={`filter-checkbox ${filter.checked ? "checked" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={filter.checked}
                                    onChange={() => toggleResourceFilter(filter.type)}
                                  />
                                  <filter.icon className="w-3 h-3" />
                                  <span>{filter.label}</span>
                                </label>
                              ))}

                            {/* Right side: Action buttons */}
                            <div className="filter-actions ml-auto flex gap-2 items-center">
                              <button
                                onClick={() => setDropdownCollapsed(!dropdownCollapsed)}
                                className="filter-button flex items-center gap-1"
                              >
                                {dropdownCollapsed ? (
                                  <>
                                    <ChevronRight className="w-3 h-3" />
                                    Expand
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    Collapse
                                  </>
                                )}
                              </button>
                              <button onClick={clearAllFilters} className="filter-button">
                                Clear All
                              </button>
                              <button onClick={selectAllFilters} className="filter-button primary">
                                Select All
                              </button>
                            </div>
                          </div>
                        )}


                    </div>

                    {/* ===========================
       Resource Section
     =========================== */}
                    {selectedActivityData && (
                      <div className="resources-section flex flex-col flex-1 overflow-hidden mt-4 min-h-0">
                        {selectedActivityData.description && (
                          <div className="mb-4">
                            <p
                              className="text-xs"
                              style={{ color: "hsl(var(--muted-foreground))" }}
                            >
                              {selectedActivityData.description}
                            </p>
                          </div>
                        )}

                        {folderPath.length > 0 && (
                          <div className="flex items-center text-xs mb-3 text-gray-600 space-x-1">
                            <button
                              onClick={() => {
                                if (folderPath.length > 1) {
                                  const newPath = folderPath.slice(0, -1);
                                  setFolderPath(newPath);
                                  setCurrentFolder(newPath[newPath.length - 1] || null);
                                } else {
                                  setFolderPath([]);
                                  setCurrentFolder(null);
                                }
                              }}
                              className="px-2 py-1 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                              ← Back
                            </button>

                            <span
                              className="cursor-pointer hover:underline"
                              onClick={() => {
                                setCurrentFolder(null);
                                setFolderPath([]);
                              }}
                            >
                              Root
                            </span>

                            {folderPath.map((folder, index) => (
                              <React.Fragment key={folder.id}>
                                <span>/</span>
                                <span
                                  className={`cursor-pointer hover:underline ${index === folderPath.length - 1
                                    ? "font-semibold text-gray-800"
                                    : ""
                                    }`}
                                  onClick={() => {
                                    setCurrentFolder(folder);
                                    setFolderPath(folderPath.slice(0, index + 1));
                                  }}
                                >
                                  {folder.title}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        )}

                        {/* Resource list */}
                        {!extractingZip && (
                          <div className="bg-white rounded-md flex-1 overflow-y-auto min-h-0">
                            <div className="flex px-4 pt-1 py-2 text-sm font-medium text-gray-700 border-b border-gray-200 sticky top-0 bg-white z-10">
                              <span className="flex-1 text-left">Name</span>
                              <span className="w-24 flex-shrink-0 text-left">Size</span>
                              <span className="w-24 flex-shrink-0 text-left">Date</span>
                            </div>

                            {(resourcesToDisplay || []).map((resource) => (
                              <div
                                key={resource.id}
                                onClick={() => {
                                  if (resource.type === "folder" || resource.type === "zip") {
                                    handleResourceClick(resource);
                                  } else {
                                    handleResourceClick(resource);
                                  }
                                }}
                                className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-200"
                                title={
                                  resource.type === "link"
                                    ? getLinkUrlForTooltip(resource)
                                    : undefined
                                }
                              >
                                <div className="flex items-center gap-2 flex-1 py-2">
                                  {/* Folder or ZIP folder */}
                                  {(resource.type === "folder" || resource.isZip) && (
                                    <img
                                      src="/active-images/folder.png"
                                      alt={resource.title}
                                      className="w-5 h-5"
                                    />
                                  )}

                                  {/* PDF */}
                                  {resource.type === "pdf" && (
                                    <img
                                      src="/active-images/pdf.png"
                                      alt="PDF"
                                      className="w-5 h-5"
                                    />
                                  )}

                                  {/* PPT */}
                                  {resource.type === "ppt" && (
                                    <img
                                      src="/active-images/ppt.png"
                                      alt="PPT"
                                      className="w-5 h-5"
                                    />
                                  )}

                                  {/* Video */}
                                  {resource.type === "video" && (
                                    <img
                                      src="/active-images/video.png"
                                      alt="Video"
                                      className="w-5 h-5"
                                    />
                                  )}

                                  {/* ZIP */}
                                  {resource.type === "zip" && !resource.isZip && (
                                    <img
                                      src="/active-images/zip.png"
                                      alt="ZIP"
                                      className="w-5 h-5"
                                    />
                                  )}

                                  {/* Link */}
                                  {resource.type === "link" && (
                                    <img
                                      src="/active-images/link.png"
                                      alt="Link"
                                      className="w-5 h-5"
                                    />
                                  )}

                                  {/* ✅ Reference icon (moved BEFORE title) */}
                                  {resource.isReference && (
                                    <img
                                      src="/active-images/reference.png"
                                      alt="Reference"
                                      className="w-5 h-5"
                                    />
                                  )}

                                  {/* Title */}
                                  <span
                                    className={`text-sm ${resource.type === "link"
                                      ? "text-blue-500"
                                      : resource.type === "zip"
                                        ? "text-purple-600"
                                        : "text-gray-700"
                                      }`}
                                  >
                                    {resource.title}
                                  </span>

                                  {/* ZIP Badge */}
                                  {resource.isZip && (
                                    <span className="zip-contents-badge text-xs text-purple-600 font-semibold">
                                      ZIP Contents
                                    </span>
                                  )}
                                </div>

                                <span className="w-24 flex-shrink-0 text-left text-xs text-gray-500">
                                  {resource.type === "folder" || resource.isZip
                                    ? resource.children ? `${resource.children.length} items` : "-"
                                    : resource.fileSize || "-"}
                                </span>

                                <span className="w-24 flex-shrink-0 text-left text-xs text-gray-500">
                                  {formatDate(resource.uploadedAt || "")}
                                </span>
                              </div>
                            ))}

                            {resourcesToDisplay?.length === 0 && (
                              <div className="text-center py-6 text-gray-500">
                                <File className="w-8 h-8 mx-auto mb-2" />
                                <h3 className="text-sm font-medium mb-1">
                                  No resources available
                                </h3>
                                <p className="text-xs">
                                  {getSelectedFilters().length === 0
                                    ? "Select at least one resource type to view resources"
                                    : "Try selecting different resource types or check back later for new content"}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Panels */}
                    <NotesPanel
                      isOpen={showNotesPanel}
                      onClose={() => setShowNotesPanel(false)}
                    />
                    <AIPanel isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} />
                  </div>

                )}
              </div>

            )}
          </div>

          {/* Notes Panel */}
          <NotesPanel
            isOpen={showNotesPanel}
            onClose={() => setShowNotesPanel(false)}
          />

          {/* AI Panel */}
          <AIPanel
            isOpen={showAIPanel}
            onClose={() => setShowAIPanel(false)}
          />
        </div>

      </div>

      {showZipViewer && currentZip && (
        <ZipViewer
          fileUrl={
            typeof currentZip?.fileUrl === 'string'
              ? currentZip.fileUrl
              : { base: currentZip?.fileUrl?.base || '' }
          }
          fileName={currentZip?.title || 'Untitled.zip'}
          onClose={() => setShowZipViewer(false)}
        />

      )}
      {showVideoPlayer && currentVideo && (
        <VideoPlayer
          isOpen={showVideoPlayer}
          onClose={() => {
            setShowVideoPlayer(false);
            setCurrentVideo(null);
          }}
          videoUrl={getFileUrlString(currentVideo.fileUrl)}
          title={currentVideo.title}
        />
      )}

      {showPPTViewer && currentPPT && (
        <PPTViewer
          isOpen={showPPTViewer}
          onClose={() => {
            setShowPPTViewer(false);
            setCurrentPPT(null);
          }}
          pptUrl={getFileUrlString(currentPPT.fileUrl)}
          title={currentPPT.title}
        />
      )}

      {showPDFViewer && currentPDF && (
        <PDFViewer
          isOpen={showPDFViewer}
          onClose={() => {
            setShowPDFViewer(false);
            setCurrentPDF(null);
          }}
          pdfUrl={getFileUrlString(currentPDF.fileUrl)}
          title={currentPDF.title}
        />
      )}
    </div>
  );
}