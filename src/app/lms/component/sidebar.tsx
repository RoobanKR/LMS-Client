"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    ChevronRight,
    X,
    Plus,
    MoreHorizontal,
    MoreVertical,
    ShieldCheck,
    Home,
    UserCircle,
    Settings,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useSidebar } from "./layout";

// Define types for permissions
interface UserPermission {
    _id: string;
    permissionName: string;
    permissionKey: string;
    permissionFunctionality: string[];
    icon: string;
    color: string;
    description: string;
    isActive: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
}

interface SidebarItem {
    title: string;
    href: string;
    icon: any;
    iconName: string;
    color: string;
    hasChevron?: boolean;
    hasDropdown?: boolean;
    permissionKey?: string;
    children?: SidebarItem[];
}

// Import all icons from lucide-react
import * as LucideIcons from "lucide-react";

// Get icon by name from lucide-icons
const getIconByName = (iconName: string): any => {
    if (!iconName) return ShieldCheck;
    
    if (LucideIcons[iconName as keyof typeof LucideIcons]) {
        return LucideIcons[iconName as keyof typeof LucideIcons];
    }
    
    const pascalCaseName = iconName
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    
    if (LucideIcons[pascalCaseName as keyof typeof LucideIcons]) {
        return LucideIcons[pascalCaseName as keyof typeof LucideIcons];
    }
    
    const iconMappings: Record<string, any> = {
        "user": LucideIcons.Users,
        "users": LucideIcons.Users,
        "user-circle": UserCircle,
        "usercircle": UserCircle,
        "book": LucideIcons.BookOpen,
        "book-open": LucideIcons.BookOpen,
        "bookopen": LucideIcons.BookOpen,
        "file": LucideIcons.FileText,
        "file-text": LucideIcons.FileText,
        "filetext": LucideIcons.FileText,
        "chart": LucideIcons.BarChart3,
        "bar-chart": LucideIcons.BarChart3,
        "barchart": LucideIcons.BarChart3,
        "bar-chart-3": LucideIcons.BarChart3,
        "barchart3": LucideIcons.BarChart3,
        "settings": Settings,
        "setting": Settings,
        "gear": Settings,
        "cog": Settings,
        "dashboard": Home,
        "home": Home,
        "graduation-cap": LucideIcons.GraduationCap,
        "graduationcap": LucideIcons.GraduationCap,
        "calendar": LucideIcons.Calendar,
        "message": LucideIcons.MessageSquare,
        "message-square": LucideIcons.MessageSquare,
        "messagesquare": LucideIcons.MessageSquare,
        "landmark": LucideIcons.Landmark,
        "sliders": LucideIcons.Sliders,
        "globe": LucideIcons.Globe,
        "wrench": LucideIcons.Wrench,
        "layout": LucideIcons.Layout,
        "database": LucideIcons.Database,
        "bell": LucideIcons.Bell,
        "help-circle": LucideIcons.HelpCircle,
        "helpcircle": LucideIcons.HelpCircle,
        "shield": ShieldCheck,
        "shield-check": ShieldCheck,
        "shieldcheck": ShieldCheck,
        "folder": LucideIcons.Folder,
    };
    
    const lowerIconName = iconName.toLowerCase();
    if (iconMappings[lowerIconName]) {
        return iconMappings[lowerIconName];
    }
    
    return ShieldCheck;
};

// Color classes mapping
const colorClasses: Record<string, any> = {
    blue: {
        bg: "bg-blue-50",
        border: "border-blue-500",
        text: "text-blue-600",
        bgLight: "bg-blue-100",
        textLight: "text-blue-700",
        hover: "hover:bg-blue-50",
        iconBg: "bg-blue-100",
        iconText: "text-blue-600",
    },
    green: {
        bg: "bg-green-50",
        border: "border-green-500",
        text: "text-green-600",
        bgLight: "bg-green-100",
        textLight: "text-green-700",
        hover: "hover:bg-green-50",
        iconBg: "bg-green-100",
        iconText: "text-green-600",
    },
    purple: {
        bg: "bg-purple-50",
        border: "border-purple-500",
        text: "text-purple-600",
        bgLight: "bg-purple-100",
        textLight: "text-purple-700",
        hover: "hover:bg-purple-50",
        iconBg: "bg-purple-100",
        iconText: "text-purple-600",
    },
    orange: {
        bg: "bg-orange-50",
        border: "border-orange-500",
        text: "text-orange-600",
        bgLight: "bg-orange-100",
        textLight: "text-orange-700",
        hover: "hover:bg-orange-50",
        iconBg: "bg-orange-100",
        iconText: "text-orange-600",
    },
    teal: {
        bg: "bg-teal-50",
        border: "border-teal-500",
        text: "text-teal-600",
        bgLight: "bg-teal-100",
        textLight: "text-teal-700",
        hover: "hover:bg-teal-50",
        iconBg: "bg-teal-100",
        iconText: "text-teal-600",
    },
    gray: {
        bg: "bg-gray-50",
        border: "border-gray-500",
        text: "text-gray-600",
        bgLight: "bg-gray-100",
        textLight: "text-gray-700",
        hover: "hover:bg-gray-50",
        iconBg: "bg-gray-100",
        iconText: "text-gray-600",
    },
    red: {
        bg: "bg-red-50",
        border: "border-red-500",
        text: "text-red-600",
        bgLight: "bg-red-100",
        textLight: "text-red-700",
        hover: "hover:bg-red-50",
        iconBg: "bg-red-100",
        iconText: "text-red-600",
    },
    pink: {
        bg: "bg-pink-50",
        border: "border-pink-500",
        text: "text-pink-600",
        bgLight: "bg-pink-100",
        textLight: "text-pink-700",
        hover: "hover:bg-pink-50",
        iconBg: "bg-pink-100",
        iconText: "text-pink-600",
    },
    indigo: {
        bg: "bg-indigo-50",
        border: "border-indigo-500",
        text: "text-indigo-600",
        bgLight: "bg-indigo-100",
        textLight: "text-indigo-700",
        hover: "hover:bg-indigo-50",
        iconBg: "bg-indigo-100",
        iconText: "text-indigo-600",
    },
    yellow: {
        bg: "bg-yellow-50",
        border: "border-yellow-500",
        text: "text-yellow-600",
        bgLight: "bg-yellow-100",
        textLight: "text-yellow-700",
        hover: "hover:bg-yellow-50",
        iconBg: "bg-yellow-100",
        iconText: "text-yellow-600",
    },
    cyan: {
        bg: "bg-cyan-50",
        border: "border-cyan-500",
        text: "text-cyan-600",
        bgLight: "bg-cyan-100",
        textLight: "text-cyan-700",
        hover: "hover:bg-cyan-50",
        iconBg: "bg-cyan-100",
        iconText: "text-cyan-600",
    },
};

const getColorClass = (color: string) => {
    return colorClasses[color] || colorClasses.blue;
};

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

// Local storage key for recent items
const RECENT_ITEMS_KEY = "smartcliff_recent_sidebar_items";
const MAX_RECENT_ITEMS = 5;

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { isCollapsed, setIsCollapsed } = useSidebar();
    const [isMobile, setIsMobile] = useState(false);
    const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
    const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
    const [recentItems, setRecentItems] = useState<SidebarItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    // Check if mobile view
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch user permissions and build sidebar
    useEffect(() => {
        const fetchUserPermissions = async () => {
            try {
                const token = localStorage.getItem("smartcliff_token");
                const userId = localStorage.getItem("smartcliff_userId");

                if (!token || !userId) {
                    console.error("No token or user ID found");
                    setLoading(false);
                    return;
                }

                const response = await fetch(`https://lms-client-jade-three.vercel.app/user/get-permission/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch user permissions");
                }

                const data = await response.json();
                
                if (data.data?.permissions) {
                    const permissions: UserPermission[] = data.data.permissions;
                    setUserPermissions(permissions);
                    
                    // Build sidebar items from permissions
                    const sidebarItemsFromPermissions = buildSidebarItems(permissions);
                    setSidebarItems(sidebarItemsFromPermissions);
                    
                    // Load recent items from localStorage
                    loadRecentItems(sidebarItemsFromPermissions);
                } else {
                    setSidebarItems([]);
                }
            } catch (error) {
                console.error("Error fetching permissions:", error);
                setSidebarItems([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUserPermissions();
    }, []);

    // Update recent items when pathname changes
    useEffect(() => {
        if (sidebarItems.length > 0 && pathname) {
            updateRecentItems(pathname);
        }
    }, [pathname, sidebarItems]);

    // Build sidebar items from user permissions
    const buildSidebarItems = (permissions: UserPermission[]): SidebarItem[] => {
        const items: SidebarItem[] = [];
        const sortedPermissions = [...permissions].sort((a, b) => a.order - b.order);

        sortedPermissions.forEach((permission) => {
            if (permission.isActive) {
                const IconComponent = getIconByName(permission.icon || "ShieldCheck");
                const routeKey = permission.permissionKey.toLowerCase();
                const route = `/lms/pages/${routeKey}`;
                
                items.push({
                    title: permission.permissionName,
                    href: route,
                    icon: IconComponent,
                    iconName: permission.icon || "ShieldCheck",
                    color: permission.color || "blue",
                    hasChevron: false,
                    permissionKey: permission.permissionKey,
                });
            }
        });

        return items;
    };

    // Load recent items from localStorage
    const loadRecentItems = (allItems: SidebarItem[]) => {
        try {
            const stored = localStorage.getItem(RECENT_ITEMS_KEY);
            if (stored) {
                const storedItems = JSON.parse(stored);
                // Map stored items to current sidebar items
                const recent = storedItems
                    .map((storedItem: any) => {
                        return allItems.find(item => 
                            item.permissionKey === storedItem.permissionKey || 
                            item.href === storedItem.href
                        );
                    })
                    .filter(Boolean)
                    .slice(0, MAX_RECENT_ITEMS);
                setRecentItems(recent);
            } else {
                // If no stored items, default to first item (usually Dashboard)
                if (allItems.length > 0) {
                    const defaultItem = allItems[0];
                    setRecentItems([defaultItem]);
                    saveRecentItems([defaultItem]);
                }
            }
        } catch (error) {
            console.error("Error loading recent items:", error);
            if (allItems.length > 0) {
                const defaultItem = allItems[0];
                setRecentItems([defaultItem]);
            }
        }
    };

    // Save recent items to localStorage
    const saveRecentItems = (items: SidebarItem[]) => {
        try {
            const itemsToStore = items.map(item => ({
                title: item.title,
                href: item.href,
                iconName: item.iconName,
                color: item.color,
                permissionKey: item.permissionKey,
            }));
            localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(itemsToStore));
        } catch (error) {
            console.error("Error saving recent items:", error);
        }
    };

    // Update recent items when a sidebar item is clicked
    const updateRecentItems = (currentPath: string) => {
        const clickedItem = sidebarItems.find(item => 
            currentPath === item.href || currentPath?.startsWith(item.href + '/')
        );
        
        if (clickedItem) {
            setRecentItems(prev => {
                // Remove if already exists
                const filtered = prev.filter(item => 
                    item.permissionKey !== clickedItem.permissionKey
                );
                // Add to beginning
                const updated = [clickedItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
                // Save to localStorage
                saveRecentItems(updated);
                return updated;
            });
        }
    };

    // Handle sidebar item click
    const handleItemClick = (item: SidebarItem) => {
        // Update recent items
        setRecentItems(prev => {
            // Remove if already exists
            const filtered = prev.filter(prevItem => 
                prevItem.permissionKey !== item.permissionKey
            );
            // Add to beginning
            const updated = [item, ...filtered].slice(0, MAX_RECENT_ITEMS);
            // Save to localStorage
            saveRecentItems(updated);
            return updated;
        });
        
        // Navigate to the item
        router.push(item.href);
    };

    // Remove a single recent item
    const removeRecentItem = (permissionKey: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent navigation when clicking remove button
        
        setRecentItems(prev => {
            const updated = prev.filter(item => item.permissionKey !== permissionKey);
            // Save to localStorage
            saveRecentItems(updated);
            return updated;
        });
    };

    // Clear all recent items
    const clearRecentItems = () => {
        setRecentItems([]);
        localStorage.removeItem(RECENT_ITEMS_KEY);
    };

    if (loading) {
        return (
            <div className={cn(
                "border-r border-gray-200 w-60 relative z-40 h-full flex items-center justify-center",
                className
            )}>
                <div className="text-sm text-gray-500">Loading sidebar...</div>
            </div>
        );
    }

    if (sidebarItems.length === 0) {
        return (
            <div className={cn(
                "border-r border-gray-200 w-60 relative z-40 h-full flex flex-col items-center justify-center p-4",
                className
            )}>
                <ShieldCheck className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 text-center mb-2">
                    No permissions assigned
                </p>
                <p className="text-xs text-gray-400 text-center mb-3">
                    Contact administrator for access
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="text-xs"
                >
                    Refresh
                </Button>
            </div>
        );
    }

    return (
        <>
            <div
                className={cn(
                    "border-r border-gray-200 transition-all duration-300 relative z-40 h-full",
                    isCollapsed ? "w-16" : "w-60",
                    isMobile && !isCollapsed && "fixed top-0 left-0 shadow-lg",
                    className
                )}
            >
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

                <div className="pt-6">
                    {/* Main Navigation - FIRST */}
                    <div>
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || 
                                           pathname?.startsWith(item.href + '/');
                            const colorClass = getColorClass(item.color);

                            return (
                                <div
                                    key={item.permissionKey || item.href}
                                    onClick={() => handleItemClick(item)}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-0.5 hover:bg-gray-100 cursor-pointer group transition-colors",
                                        isActive && `${colorClass.bg} border-r-2 ${colorClass.border}`,
                                        isCollapsed ? "justify-center" : "",
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-1.5",
                                            isActive ? colorClass.bgLight : ""
                                        )}>
                                            <Icon className={cn(
                                                "w-3.5 h-3.5",
                                                isActive ? colorClass.iconText : "text-gray-600 group-hover:text-gray-700"
                                            )} />
                                        </div>
                                        {!isCollapsed && (
                                            <span style={{
                                                ...sidebarTextStyle,
                                                color: isActive ? colorClass.textLight : 'rgb(80, 82, 88)',
                                                fontWeight: isActive ? 600 : 500
                                            }}>
                                                {item.title}
                                            </span>
                                        )}
                                    </div>
                                    {!isCollapsed && item.hasChevron && (
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Separator between Main Navigation and Quick Actions */}
                    {!isCollapsed && recentItems.length > 0 && (
                        <div className="border-t border-gray-200 mx-4 my-4"></div>
                    )}

                    {/* Quick Actions Section - SECOND (below Main Navigation) */}
                    {!isCollapsed && recentItems.length > 0 && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between px-4 py-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    </div>
                                    <span style={{...sidebarTextStyle, fontWeight: 600}}>
                                        Recents
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Trash2 
                                        className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                                        onClick={clearRecentItems}
                                    />
                                </div>
                            </div>

                            {/* Recent Items */}
                            <div className="mt-2">
                                {recentItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href || 
                                                   pathname?.startsWith(item.href + '/');
                                    const colorClass = getColorClass(item.color);
                                    const isHovered = hoveredItem === item.permissionKey;
                                    
                                    return (
                                        <div
                                            key={`recent-${item.permissionKey}`}
                                            onClick={() => handleItemClick(item)}
                                            onMouseEnter={() => setHoveredItem(item.permissionKey || null)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            className={cn(
                                                "flex items-center justify-between px-8 py-2 hover:bg-gray-100 cursor-pointer transition-colors group relative",
                                                isActive && colorClass.bg
                                            )}
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className={cn(
                                                    "w-5 h-5 rounded flex items-center justify-center",
                                                    colorClass.bgLight
                                                )}>
                                                    <Icon className={cn(
                                                        "w-3 h-3",
                                                        colorClass.text
                                                    )} />
                                                </div>
                                                <span style={{
                                                    ...sidebarTextStyle,
                                                    color: isActive ? colorClass.textLight : 'rgb(80, 82, 88)',
                                                    fontWeight: isActive ? 600 : 500
                                                }}>
                                                    {item.title}
                                                </span>
                                            </div>
                                            
                                            {/* Remove button - shows on hover */}
                                            <button
                                                onClick={(e) => removeRecentItem(item.permissionKey || '', e)}
                                                className={cn(
                                                    "opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded",
                                                    isHovered && "opacity-100"
                                                )}
                                                title="Remove from Quick Actions"
                                            >
                                                <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-500" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Bottom Navigation - Settings */}
                    {!isCollapsed && (
                        <div className="mt-8 relative">
                            <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <MoreVertical className="w-4 h-4 text-gray-600" />
                                    <span style={sidebarTextStyle}>
                                        Settings
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

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

            {isMobile && !isCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsCollapsed(true)}
                />
            )}
        </>
    );
}