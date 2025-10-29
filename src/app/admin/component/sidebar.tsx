"use client";
 
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    BookOpen,
    Users,
    BarChart3,
    Calendar,
    MessageSquare,
    Settings,
    Home,
    GraduationCap,
    FileText,
    ChevronLeft,
    ChevronRight,
    X,
    Plus,
    MoreHorizontal,
    List,
    MoreVertical,
    ChevronDown,
    Sliders,
    Globe,
    Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useRef } from "react";
 
import { useSidebar } from "./layout";
 
const sidebarItems = [
    {
        title: "Dashboard",
        href: "/admin/pages/admindashboard",
        icon: Home,
        hasChevron: false,
    },
    {
        title: "User Management",
        href: "/admin/pages/usermanagement",
        icon: Users,
        hasChevron: true,
    },
    {
        title: "Course Structure",
        href: "/admin/pages/coursestructure",
        icon: BookOpen,
        hasChevron: false,
    },
    {
        title: "Client Management",
        href: "/admin/pages/clientmanagement",
        icon: FileText,
        hasChevron: true,
    },
    {
        title: "Grades",
        href: "#1",
        icon: GraduationCap,
        hasChevron: false,
    },
    {
        title: "Calendar",
        href: "#2",
        icon: Calendar,
        hasChevron: true,
    },
    {
        title: "Messages",
        href: "#3",
        icon: MessageSquare,
        hasChevron: false,
    },
    {
        title: "Analytics",
        href: "#4",
        icon: BarChart3,
        hasChevron: false,
    },
    {
        title: "Settings",
        href: "#5",
        icon: Settings,
        hasChevron: false,
        hasDropdown: true,
    },
];
 
const bottomItems: any[] = [];
 
// Settings dropdown items
const settingsDropdownItems = [
    {
        title: "Dynamic Field Settings",
        href: "/admin/pages/dynamicfieldsettings",
        icon: Sliders,
        description: "Configure Dynamic Field Settings"
    },
    {
        title: "Site Settings",
        href: "/admin/settings/site",
        icon: Globe,
        description: "Manage site configuration and preferences"
    },
    {
        title: "Other Settings",
        href: "/admin/settings/other",
        icon: Wrench,
        description: "Additional configuration options"
    },
];
 
// Custom text style object
const sidebarTextStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontStyle: 'normal' as const,
    fontWeight: 500,
    color: 'rgb(80, 82, 88)',
    fontSize: '13px',
    lineHeight: 'normal' as const,
};
 
interface SidebarProps {
    className?: string;
}
 
export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { isCollapsed, setIsCollapsed } = useSidebar();
    const [isMobile, setIsMobile] = useState(false);
    const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
    const settingsDropdownRef = useRef<HTMLDivElement>(null);
 
    // Check if mobile view
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
 
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
 
    // Close dropdown when sidebar collapses
    useEffect(() => {
        if (isCollapsed) {
            setIsSettingsDropdownOpen(false);
        }
    }, [isCollapsed]);
 
    const handleSettingsMouseEnter = () => {
        if (!isCollapsed) {
            setIsSettingsDropdownOpen(true);
        }
    };
 
    const handleSettingsMouseLeave = () => {
        setIsSettingsDropdownOpen(false);
    };
 
    return (
        <>
            {/* Sidebar */}
            <div
                className={cn(
                    "border-r border-gray-200 transition-all duration-300 relative z-40 h-full",
                    // Desktop and Mobile behavior - always visible
                    isCollapsed ? "w-16" : "w-64",
                    // Mobile overlay behavior when expanded
                    isMobile && !isCollapsed && "fixed top-0 left-0 shadow-lg",
                    className
                )}
            >
                {/* Toggle Button - Hidden when mobile and expanded */}
                {!(isMobile && !isCollapsed) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full border bg-white shadow-md hover:bg-gray-50 z-10"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-3 w-3" />
                        ) : (
                            <ChevronLeft className="h-3 w-3" />
                        )}
                    </Button>
                )}
 
                <div className="pt-4">
                    {/* Main Navigation */}
                    <div>
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
 
                            if (item.hasDropdown) {
                                return (
                                    <div
                                        key={item.href}
                                        className="relative"
                                        onMouseEnter={handleSettingsMouseEnter}
                                        onMouseLeave={handleSettingsMouseLeave}
                                        ref={settingsDropdownRef}
                                    >
                                        <div
                                            title={isCollapsed ? item.title : undefined}
                                            className={cn(
                                                "flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer group transition-colors",
                                                isActive && "bg-blue-50 border-r-2 border-blue-500",
                                                isCollapsed ? "justify-center" : "justify-between",
                                                isSettingsDropdownOpen && !isCollapsed && "bg-gray-100"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className="w-4 h-4 text-gray-600" />
                                                {!isCollapsed && (
                                                    <span style={{
                                                        ...sidebarTextStyle,
                                                        color: isActive ? 'rgb(29, 78, 216)' : 'rgb(80, 82, 88)',
                                                        fontWeight: isActive ? 600 : 500
                                                    }}>
                                                        {item.title}
                                                    </span>
                                                )}
                                            </div>
                                            {!isCollapsed && item.hasDropdown && (
                                                <ChevronDown className={cn(
                                                    "w-4 h-4 text-gray-400 transition-transform duration-200 ml-4",
                                                    isSettingsDropdownOpen && "rotate-180"
                                                )} />
                                            )}
                                        </div>
 
                                        {/* Settings Dropdown */}
                                        {item.hasDropdown && !isCollapsed && isSettingsDropdownOpen && (
                                            <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
                                                {settingsDropdownItems.map((dropdownItem) => {
                                                    const DropdownIcon = dropdownItem.icon;
                                                    const isDropdownActive = pathname === dropdownItem.href;
                                                   
                                                    return (
                                                        <Link
                                                            key={dropdownItem.href}
                                                            href={dropdownItem.href}
                                                            className={cn(
                                                                "flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer group transition-colors border-b border-gray-100 last:border-b-0",
                                                                isDropdownActive && "bg-blue-50"
                                                            )}
                                                        >
                                                            <DropdownIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div style={{
                                                                    ...sidebarTextStyle,
                                                                    color: isDropdownActive ? 'rgb(29, 78, 216)' : 'rgb(80, 82, 88)',
                                                                    fontWeight: isDropdownActive ? 600 : 500,
                                                                    marginBottom: '2px'
                                                                }}>
                                                                    {dropdownItem.title}
                                                                </div>
                                                                <div style={{
                                                                    ...sidebarTextStyle,
                                                                    color: 'rgb(107, 114, 128)',
                                                                    fontSize: '11px',
                                                                    fontWeight: 400,
                                                                    lineHeight: '1.3'
                                                                }}>
                                                                    {dropdownItem.description}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
 
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={isCollapsed ? item.title : undefined}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer group transition-colors",
                                        isActive && "bg-blue-50 border-r-2 border-blue-500",isCollapsed ? "justify-center" : "",
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-4 h-4 text-gray-600" />
                                        {!isCollapsed && (
                                            <span style={{
                                                ...sidebarTextStyle,
                                                color: isActive ? 'rgb(29, 78, 216)' : 'rgb(80, 82, 88)',
                                                fontWeight: isActive ? 600 : 500
                                            }}>
                                                {item.title}
                                            </span>
                                        )}
                                    </div>
                                    {!isCollapsed && item.hasChevron && (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
 
                    {/* Projects Section Spacer */}
                    <div className="mt-6">
                        {/* Projects Header */}
                       <div className={`flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer group ${isCollapsed ? "justify-center" : "justify-start"}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                </div>
                                {!isCollapsed && (
                                    <span style={sidebarTextStyle}>
                                        Quick Actions
                                    </span>
                                )}
                            </div>
                            {!isCollapsed && (
                                <div className="flex items-center gap-1">
                                    <Plus className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                    <MoreHorizontal className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                                </div>
                            )}
                        </div>
 
                        {/* Recent Projects Subsection */}
                        {!isCollapsed && (
                            <div className="mt-2">
                                <div className="px-8 py-1">
                                    <span style={{
                                        ...sidebarTextStyle,
                                        color: 'rgb(107, 114, 128)'
                                    }}>
                                        Recent
                                    </span>
                                </div>
 
                                {/* Quick Access Items */}
                                <Link
                                    href="/programcoordinator/pages/courseadd"
                                    className="flex items-center gap-3 px-8 py-2 hover:bg-gray-100 cursor-pointer group"
                                >
                                    <div className="w-5 h-5 bg-orange-400 rounded flex items-center justify-center">
                                        <BookOpen className="w-3 h-3 text-white" />
                                    </div>
                                    <span style={sidebarTextStyle}>
                                        Course Management
                                    </span>
                                </Link>
 
                                {/* View all projects */}
                                <div className="flex items-center gap-3 px-8 py-2 hover:bg-gray-100 cursor-pointer group">
                                    <List className="w-4 h-4 text-gray-600" />
                                    <span style={sidebarTextStyle}>
                                        View all sections
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
 
                    {/* Bottom Navigation */}
                    <div className="mt-6 relative">
                        {bottomItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
 
                            return (
                                <div key={item.href} className="relative">
                                    <div
                                        onClick={item.hasDropdown ? handleSettingsMouseEnter : undefined}
                                        title={isCollapsed ? item.title : undefined}
                                        className={cn(
                                            "flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer group transition-colors",
                                            isActive && "bg-blue-50 border-r-2 border-blue-500",
                                            isCollapsed ? "justify-center" : "justify-start",
                                            isSettingsDropdownOpen && !isCollapsed && "bg-gray-100"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-4 h-4 text-gray-600" />
                                            {!isCollapsed && (
                                                <span style={{
                                                    ...sidebarTextStyle,
                                                    color: isActive ? 'rgb(29, 78, 216)' : 'rgb(80, 82, 88)',
                                                    fontWeight: isActive ? 600 : 500
                                                }}>
                                                    {item.title}
                                                </span>
                                            )}
                                        </div>
                                        {!isCollapsed && item.hasDropdown && (
                                            <ChevronDown className={cn(
                                                "w-4 h-4 text-gray-400 transition-transform duration-200",
                                                isSettingsDropdownOpen && "rotate-180"
                                            )} />
                                        )}
                                    </div>
 
                                    {/* Settings Dropdown */}
                                    {item.hasDropdown && !isCollapsed && isSettingsDropdownOpen && (
                                        <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
                                            {settingsDropdownItems.map((dropdownItem) => {
                                                const DropdownIcon = dropdownItem.icon;
                                                const isDropdownActive = pathname === dropdownItem.href;
                                               
                                                return (
                                                    <Link
                                                        key={dropdownItem.href}
                                                        href={dropdownItem.href}
                                                        className={cn(
                                                            "flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer group transition-colors border-b border-gray-100 last:border-b-0",
                                                            isDropdownActive && "bg-blue-50"
                                                        )}
                                                    >
                                                        <DropdownIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div style={{
                                                                ...sidebarTextStyle,
                                                                color: isDropdownActive ? 'rgb(29, 78, 216)' : 'rgb(80, 82, 88)',
                                                                fontWeight: isDropdownActive ? 600 : 500,
                                                                marginBottom: '2px'
                                                            }}>
                                                                {dropdownItem.title}
                                                            </div>
                                                            <div style={{
                                                                ...sidebarTextStyle,
                                                                color: 'rgb(107, 114, 128)',
                                                                fontSize: '11px',
                                                                fontWeight: 400,
                                                                lineHeight: '1.3'
                                                            }}>
                                                                {dropdownItem.description}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
 
                        {/* Additional Bottom Item - More */}
                        <div className={`flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer group ${isCollapsed ? "justify-center" : "justify-start"}`}>
                            <div className="flex items-center gap-3">
                                <MoreVertical className="w-4 h-4 text-gray-600" />
                                {!isCollapsed && (
                                    <span style={sidebarTextStyle}>
                                        More
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
 
            {/* Mobile Close Button - Only shown when mobile and expanded */}
            {isMobile && !isCollapsed && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white shadow-lg hover:bg-gray-50 z-50 border"
                    onClick={() => setIsCollapsed(true)}
                >
                    <X className="h-5 w-5" />
                </Button>
            )}
 
            {/* Overlay for mobile when sidebar is expanded */}
            {isMobile && !isCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsCollapsed(true)}
                />
            )}
        </>
    );
}
    