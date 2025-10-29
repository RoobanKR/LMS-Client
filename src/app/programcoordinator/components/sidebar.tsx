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
    ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";

import { useSidebarpro } from "./layout";

const sidebarItems = [
    {
        title: "Dashboard",
        href: "/programcoordinator/pages/dashboardprogramcoordinator",
        icon: Home,
        hasChevron: false,
    },
    {
      
        title: "Courses Structure",
        href: "/programcoordinator/pages/courses",
        icon: BookOpen,
        hasChevron: false,
    },
     {
        title: "Pedagogy",
        href: "/programcoordinator/pages/pedagogy",
        icon: ListChecks,
        hasChevron: false,
    },
    {
        title: "Students",
        href: "/dashboard/students",
        icon: Users,
        hasChevron: false,
    },
    {
        title: "Assignments",
        href: "/dashboard/assignments",
        icon: FileText,
        hasChevron: false,
    },
    {
        title: "Grades",
        href: "/dashboard/grades",
        icon: GraduationCap,
        hasChevron: false,
    },
    {
        title: "Calendar",
        href: "/dashboard/calendar",
        icon: Calendar,
        hasChevron: false,
    },
    {
        title: "Messages",
        href: "/dashboard/messages",
        icon: MessageSquare,
        hasChevron: false,
    },
    {
        title: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        hasChevron: false,
    },
];

const bottomItems = [
    {
        title: "Settings",
        href: "/admin/pages/dynamicfields",
        icon: Settings,
        hasChevron: false,
    },
];

// Custom text style object
const sidebarTextStyle = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontStyle: 'normal' as const,
    fontWeight: 500,
    color: 'rgb(107, 114, 128)', // Updated to a more neutral gray
    fontSize: '13px',
    lineHeight: 'normal' as const,
};

interface SidebarProps {
    className?: string;
}

export function Sidebarpro({ className }: SidebarProps) {
    const pathname = usePathname();
    const { isCollapsed, setIsCollapsed } = useSidebarpro();
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile view
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <>
            {/* Sidebar */}
            <div
                className={cn(
                    "bg-white border-r border-gray-100 transition-all duration-300 relative z-40 h-full",
                    isCollapsed ? "w-16" : "w-50",
                    isMobile && !isCollapsed && "fixed top-0 left-0 shadow-lg",
                    className
                )}
            >
                {/* Toggle Button - Hidden when mobile and expanded */}
                {!(isMobile && !isCollapsed) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full border bg-white shadow-md hover:bg-gray-100 z-10"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-3 w-3 text-gray-600" />
                        ) : (
                            <ChevronLeft className="h-3 w-3 text-gray-600" />
                        )}
                    </Button>
                )}

                <div className="pt-4">
                    {/* Main Navigation */}
                    <div>
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={isCollapsed ? item.title : undefined}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer group transition-colors",
                                        isActive && "bg-blue-50 border-r-2 border-blue-500",
                                        isCollapsed ? "justify-center" : "justify-start",
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={cn(
                                            "w-4 h-4",
                                            isActive ? "text-blue-600" : "text-gray-500"
                                        )} />
                                        {!isCollapsed && (
                                            <span style={{
                                                ...sidebarTextStyle,
                                                color: isActive ? 'rgb(37, 99, 235)' : 'rgb(107, 114, 128)',
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

                    {/* Bottom Navigation */}
                    <div className="mt-6">
                        {bottomItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={isCollapsed ? item.title : undefined}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer group transition-colors",
                                        isActive && "bg-blue-50 border-r-2 border-blue-500",
                                        isCollapsed ? "justify-center" : "justify-start",
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={cn(
                                            "w-4 h-4",
                                            isActive ? "text-blue-600" : "text-gray-500"
                                        )} />
                                        {!isCollapsed && (
                                            <span style={{
                                                ...sidebarTextStyle,
                                                color: isActive ? 'rgb(37, 99, 235)' : 'rgb(107, 114, 128)',
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

                        {/* Additional Bottom Item - More */}
                        <div className={`flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer group ${isCollapsed ? "justify-center" : "justify-start"}`}>
                            <div className="flex items-center gap-3">
                                <MoreVertical className="w-4 h-4 text-gray-500" />
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
                    className="fixed top-4 right-4 w-10 h-10 rounded-full bg-white shadow-lg hover:bg-gray-100 z-50 border border-gray-200"
                    onClick={() => setIsCollapsed(true)}
                >
                    <X className="h-5 w-5 text-gray-600" />
                </Button>
            )}

            {/* Overlay for mobile when sidebar is expanded */}
            {isMobile && !isCollapsed && (
                <div
                    className="fixed inset-0 bg-black/30 z-30 md:hidden"
                    onClick={() => setIsCollapsed(true)}
                />
            )}
        </>
    );
}