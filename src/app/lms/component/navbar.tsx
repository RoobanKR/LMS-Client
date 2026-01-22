"use client";
import {
  Bell,
  Search,
  User,
  BookOpen,
  Settings,
  HelpCircle,
  LogOut,
  Loader2,
  Sparkles,
  MessageSquare,
  Zap,
  X,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getCurrentUser, logoutUser } from "@/apiServices/tokenVerify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/apiServices/notifications";
import { cn } from "@/lib/utils";

// Notification keys for React Query
const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: string) => [...notificationKeys.lists(), { filters }] as const,
  details: () => [...notificationKeys.all, 'detail'] as const,
  detail: (id: string) => [...notificationKeys.details(), id] as const,
};

interface StudentNavbarProps {
  onMenuClick?: () => void;
  onAIClick?: () => void;
  onSummaryClick?: () => void;
  isSidebarOpen?: boolean;
  activeRoute?: string;
}

export function Navbar({
  onMenuClick,
  onAIClick,
  onSummaryClick,
}: StudentNavbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAISubmenu, setShowAISubmenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  
  // Refs for click outside detection
  const aiRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  const {
    data: userData,
    isLoading: userLoading,
    refetch,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem("smartcliff_token"),
  });

  const user = userData?.user || null;

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => notificationsService.fetchNotifications(),
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000, // 30 seconds
    enabled: typeof window !== 'undefined' && !!localStorage.getItem("smartcliff_token"),
  });

  // Mutation for marking notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      notificationsService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success("All notifications marked as read");
    },
  });

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (aiRef.current && !aiRef.current.contains(event.target as Node)) {
        setShowAISubmenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for token changes
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("smartcliff_token");
      if (!token) {
        refetch();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refetch]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const token = localStorage.getItem("smartcliff_token");

      // Remove all localStorage items
      localStorage.removeItem("smartcliff_userId");
      localStorage.removeItem("smartcliff_token");
      localStorage.removeItem("smartcliff_institutionname");
      localStorage.removeItem("smartcliff_institution");
      localStorage.removeItem("smartcliff_basedOn");

      if (!token) {
        toast.info("Logged out successfully");
        window.location.href = "/login";
        return;
      }

      const response = await logoutUser(token);
      toast.success(response.message?.[0]?.value || "Logged out successfully");
      window.location.href = "/login";

    } catch (error: any) {
      console.error("Logout error:", error);
      // Ensure all data is cleared even on error
      localStorage.removeItem("smartcliff_userId");
      localStorage.removeItem("smartcliff_token");
      localStorage.removeItem("smartcliff_institutionname");
      localStorage.removeItem("smartcliff_institution");
      localStorage.removeItem("smartcliff_basedOn");

      toast.error(error.response?.data?.message?.[0]?.value || "Logout failed");
      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Notification handlers
  const handleNotificationClick = (notification: any) => {
    markAsReadMutation.mutate(notification._id);
    // You can add navigation logic here based on notification type
    if (notification.link) {
      router.push(notification.link);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "US";
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || "US";
  };

  // Get full name
  const getFullName = () => {
    if (!user) return "User";
    return `${user.firstName} ${user.lastName}`.trim();
  };

  const navbarTextStyle = {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontStyle: "normal" as const,
    fontWeight: 400,
    color: "rgb(80, 82, 88)",
    fontSize: "13px",
    lineHeight: "normal" as const,
  };

  const logoTextStyle = {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontStyle: "normal" as const,
    fontWeight: 600,
    color: "rgb(80, 82, 88)",
    fontSize: "14px",
    lineHeight: "normal" as const,
  };

  // Get notifications data
  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 relative">
      {/* Left side - Logo and Navigation */}
      <div className="flex items-center gap-6 relative z-10">
        {/* Hamburger Menu (for mobile) */}
        {onMenuClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="h-8 w-8 p-0 lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </Button>
        )}

        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span style={logoTextStyle} className="text-gray-800 hidden sm:block">
            Learning Hub
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="hidden md:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-sm hover:bg-gray-100 transition-colors"
          >
            <span style={navbarTextStyle}>Teams</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-sm hover:bg-gray-100 transition-colors"
          >
            <span style={navbarTextStyle}>Apps</span>
          </Button>
        </nav>
      </div>

      {/* Center - Search Bar */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8 relative z-10">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses, topics..."
            style={navbarTextStyle}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Right side - Actions and user menu */}
      <div className="flex items-center gap-2 relative z-10">
        {/* Mobile search */}
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden h-8 w-8 rounded-sm hover:bg-gray-100 transition-colors text-gray-600"
          onClick={() => setShowMobileSearch(!showMobileSearch)}
        >
          {showMobileSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
        </Button>

        {/* AI Assistant (if provided) */}
        {onAIClick && (
          <div className="relative hidden sm:block" ref={aiRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAISubmenu(!showAISubmenu)}
              className="h-8 px-3 rounded-sm hover:bg-gray-100 transition-colors text-gray-600 flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              <span style={navbarTextStyle} className="hidden md:inline">
                AI Assistant
              </span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", showAISubmenu ? "rotate-180" : "")} />
            </Button>

            {/* AI Submenu */}
            {showAISubmenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <button
                  onClick={() => {
                    onAIClick();
                    setShowAISubmenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 text-left"
                >
                  <MessageSquare className="w-4 h-4 text-gray-600" />
                  <div>
                    <p style={navbarTextStyle} className="font-medium">Chat Assistant</p>
                    <p style={{ ...navbarTextStyle, fontSize: "11px" }} className="text-gray-500">
                      Ask questions instantly
                    </p>
                  </div>
                </button>
                {onSummaryClick && (
                  <button
                    onClick={() => {
                      onSummaryClick();
                      setShowAISubmenu(false);
                    }}
                    className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 text-left border-t border-gray-100"
                  >
                    <Zap className="w-4 h-4 text-gray-600" />
                    <div>
                      <p style={navbarTextStyle} className="font-medium">Generate Summary</p>
                      <p style={{ ...navbarTextStyle, fontSize: "11px" }} className="text-gray-500">
                        Summarize content
                      </p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notifications with dynamic count */}
        <div className="relative" ref={notificationRef}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative h-8 w-8 rounded-sm hover:bg-gray-100 transition-colors text-gray-600"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs bg-red-500 text-white border-0 rounded-full p-0 min-w-5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-80 bg-white border border-gray-200 shadow-lg rounded-sm p-0"
              align="end"
              forceMount
            >
              <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <span style={{ ...navbarTextStyle, fontWeight: 600 }} className="text-gray-900">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    style={navbarTextStyle}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notificationsLoading ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500" style={navbarTextStyle}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification: any) => (
                    <DropdownMenuItem
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-none hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0",
                        !notification.isRead ? "bg-blue-50" : ""
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", !notification.isRead ? "bg-blue-500" : "bg-gray-300")} />
                      <div className="flex-1">
                        <p style={navbarTextStyle} className={cn("font-medium", !notification.isRead ? "text-gray-900" : "text-gray-700")}>
                          {notification.title}
                        </p>
                        <p style={{ ...navbarTextStyle, fontSize: "12px" }} className="text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {notification.createdAt && (
                          <p style={{ ...navbarTextStyle, fontSize: "11px" }} className="text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-2 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-600 hover:text-gray-900"
                    onClick={() => router.push('/notifications')}
                  >
                    <span style={navbarTextStyle}>View all notifications</span>
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Help */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-sm hover:bg-gray-100 transition-colors text-gray-600"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-sm hover:bg-gray-100 transition-colors text-gray-600"
        >
          <Settings className="w-4 h-4" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-sm hover:bg-gray-100 transition-colors p-0"
              disabled={userLoading}
            >
              {userLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user?.profile} alt={getFullName()} />
                  <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 bg-white border border-gray-200 shadow-lg rounded-sm p-2"
            align="end"
            forceMount
          >
            <DropdownMenuLabel className="font-normal p-0 mb-2">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-sm">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.profile} alt={getFullName()} />
                  <AvatarFallback className="bg-blue-600 text-white font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p
                    style={{ ...navbarTextStyle, fontWeight: 600 }}
                    className="text-gray-900"
                  >
                    {getFullName()}
                  </p>
                  <p
                    style={{ ...navbarTextStyle, fontSize: "12px" }}
                    className="text-gray-600"
                  >
                    {user?.email || "Loading..."}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span
                      style={{ ...navbarTextStyle, fontSize: "12px" }}
                      className="text-green-600"
                    >
                      {user?.role?.renameRole || "User"}
                    </span>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuItem 
              className="flex items-center gap-3 p-2 rounded-sm hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => router.push('/profile')}
            >
              <User className="w-4 h-4 text-gray-600" />
              <span style={navbarTextStyle} className="text-gray-700">
                Profile
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-center gap-3 p-2 rounded-sm hover:bg-gray-50 transition-colors cursor-pointer">
              <Settings className="w-4 h-4 text-gray-600" />
              <span style={navbarTextStyle} className="text-gray-700">
                Settings
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-center gap-3 p-2 rounded-sm hover:bg-gray-50 transition-colors cursor-pointer">
              <HelpCircle className="w-4 h-4 text-gray-600" />
              <span style={navbarTextStyle} className="text-gray-700">
                Help & Support
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 bg-gray-200" />

            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 text-gray-600" />
              )}
              <span style={navbarTextStyle} className="text-gray-700">
                {isLoggingOut ? "Signing Out..." : "Sign Out"}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="absolute inset-0 bg-white z-50 flex items-center px-4 animate-in fade-in slide-in-from-top-2 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Search..."
            style={navbarTextStyle}
            className="flex-1 bg-transparent border-none outline-none text-base text-gray-800 placeholder-gray-400 h-full"
          />
          <button
            onClick={() => setShowMobileSearch(false)}
            className="p-2 bg-gray-100 rounded-lg ml-2"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}
    </header>
  );
}