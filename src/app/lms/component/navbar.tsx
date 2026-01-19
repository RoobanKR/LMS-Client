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
import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "@/apiServices/tokenVerify";
import { useQuery } from "@tanstack/react-query";

export function Navbar() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const {
    data: userData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem("smartcliff_token"),
  });

  const user = userData?.user || null;

  // Listen for token changes
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("smartcliff_token");
      if (!token) {
        // Token removed, invalidate query
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

      // Remove all relevant localStorage items
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

      if (error.response?.data?.message) {
        toast.error(error.response.data.message[0]?.value || "Logout failed");
      } else if (error.message) {
        toast.error("Network error during logout");
      } else {
        toast.error("Logout failed");
      }

      window.location.href = "/login";
    } finally {
      setIsLoggingOut(false);
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

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 relative">
      {/* Left side - Logo and Navigation */}
      <div className="flex items-center gap-6 relative z-10">
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
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 rounded-sm hover:bg-gray-100 transition-colors text-gray-600"
        >
          <Bell className="w-4 h-4" />
          <Badge className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-xs bg-red-500 text-white border-0 rounded-full">
            3
          </Badge>
        </Button>

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
              disabled={isLoading}
            >
              {isLoading ? (
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

            <DropdownMenuItem className="flex items-center gap-3 p-2 rounded-sm hover:bg-gray-50 transition-colors cursor-pointer">
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
    </header>
  );
}