'use client';

import { useState, useEffect } from 'react';
import { Roboto } from 'next/font/google';
import {
  Bell,
  Trash2,
  Info,
  AlertCircle,
  CheckCheck,
  Eye,
  BookOpen,
  X,
  RefreshCw,
  CheckSquare,
  Star,
  Search,
  CheckCircle,
  Mail,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService, Notification, notificationKeys } from '@/apiServices/notifications';
import { StudentLayout } from '../../component/student/student-layout';
import DashboardLayout from '../../component/layout';
import { StaffLayout } from '../../component/stafflayout/staff-layout';

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// Orange theme tokens based on your sample
const T = {
  orange: '#F27757', 
  orangeDark: '#E0623F', 
  orangeGlow: 'rgba(242,119,87,0.22)', 
  orangeLight: 'rgba(242,119,87,0.08)',
  textMain: '#1a1a2e', 
  textSub: '#6b6b7e', 
  textMuted: '#8b8b9e', 
  textHint: '#bcbccc', 
  border: '#ecedf1', 
  bg: '#ffffff', 
  pageBg: '#f8f8fa',
  dark: { 
    bg: '#1a1a2e', 
    surface: '#222240', 
    card: '#252545', 
    border: '#2e2e4a', 
    textMain: '#e8e8f0', 
    textSub: '#a0a0b8', 
    textMuted: '#6b6b88', 
    textHint: '#4a4a66', 
    pageBg: '#12121f' 
  }
};

// Helper function to get user role (consistent with courses page)
const getUserRole = (): string | null => {
  try {
    const roleValue = localStorage.getItem('smartcliff_roleValue');
    if (roleValue) return roleValue.toLowerCase();
    
    // Fallback: try to get from userData
    const userData = localStorage.getItem('smartcliff_userData');
    if (userData) {
      const user = JSON.parse(userData);
      if (typeof user.role === 'object' && user.role !== null) {
        return (user.role.roleValue || user.role.originalRole || user.role.renameRole || '').toLowerCase();
      } else if (typeof user.role === 'string') {
        return user.role.toLowerCase();
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

export default function NotificationsPage() {
  // State for role-based layout
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const queryClient = useQueryClient();

  const {
    data: notificationsData,
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => notificationsService.fetchNotifications(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    enabled: !!userRole, // Only fetch when role is determined
  });

  // Theme state - initialize from localStorage or system preference
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Get user role from localStorage on component mount
  useEffect(() => {
    const initializeRole = () => {
      const role = getUserRole();
      console.log('Notifications page - User role:', role);
      setUserRole(role);
      setIsRoleLoading(false);
    };
    
    initializeRole();
    
    // Listen for role changes
    const handleStorageChange = () => {
      const newRole = getUserRole();
      setUserRole(newRole);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Initialize theme and listen for theme changes
  useEffect(() => {
    // Function to update theme based on current state
    const updateTheme = () => {
      // Check localStorage first
      const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
      
      if (storedTheme) {
        setTheme(storedTheme);
        // Apply theme to HTML element
        if (storedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        // Fallback to system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = systemPrefersDark ? 'dark' : 'light';
        setTheme(initialTheme);
        
        if (systemPrefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    // Initial update
    updateTheme();

    // Listen for theme changes from localStorage (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const newTheme = e.newValue as 'light' | 'dark';
        if (newTheme) {
          setTheme(newTheme);
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    };

    // Listen for custom theme change events (from navbar)
    const handleThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail.theme;
      setTheme(newTheme);
      
      // Apply theme to HTML element
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Listen for theme change from navbar (using a custom event)
    window.addEventListener('themeChange', handleThemeChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    // Also check for theme changes every 100ms (as a fallback)
    const interval = setInterval(() => {
      const currentStoredTheme = localStorage.getItem('theme') as 'light' | 'dark';
      if (currentStoredTheme && currentStoredTheme !== theme) {
        setTheme(currentStoredTheme);
        if (currentStoredTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }, 100);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [theme]);

  // --- Real-time & Polling ---
  useEffect(() => {
    if (userRole) { // Only enable polling when role is determined
      notificationsService.setPollingEnabled(true);
    }
    return () => notificationsService.setPollingEnabled(false);
  }, [userRole]);

  useEffect(() => {
    const handleNotificationsUpdate = (event: CustomEvent) => {
      queryClient.setQueryData(notificationKeys.all, {
        notifications: event.detail.notifications,
        unreadCount: event.detail.unreadCount,
        totalCount: event.detail.notifications.length,
        lastUpdated: Date.now(),
        version: event.detail.version,
      });

      if (event.detail.event === 'new-notifications' && event.detail.newNotifications) {
        toast.success('You have new notifications', { position: 'bottom-right', icon: '🔔' });
      }
    };

    window.addEventListener('notificationsUpdate', handleNotificationsUpdate as EventListener);
    return () => {
      window.removeEventListener('notificationsUpdate', handleNotificationsUpdate as EventListener);
    };
  }, [queryClient]);

  // --- Mutations ---
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsService.toggleFavorite(notificationId),
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        const isFav = data?.data?.isFavorite ?? false;
        toast.success(isFav ? 'Added to favorites' : 'Removed from favorites', { 
            icon: isFav ? '⭐' : '🗑️',
            duration: 1500
        });
    },
    onError: () => toast.error("Failed to update favorite status")
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success('Deleted');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success('All marked as read');
    },
  });

  const deleteAllNotificationsMutation = useMutation({
    mutationFn: () => notificationsService.deleteAllNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success('Inbox cleared');
    },
  });

  // --- Helpers ---
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }
    setExpandedId(expandedId === notification._id ? null : notification._id);
  };

  const getFilteredNotifications = () => {
    if (!notificationsData?.notifications) return [];
    
    let result = notificationsData.notifications.filter(n => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'unread') return !n.isRead;
      if (activeFilter === 'read') return n.isRead;
      if (activeFilter === 'favorite') return n.isFavorite;
      
      return n.relatedEntity === activeFilter || n.type === activeFilter;
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query)
      );
    }
    return result;
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notificationsData?.unreadCount || 0;

  const formatEmailDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getIconForType = (type: string, entity: string) => {
    if (entity === 'course') return <BookOpen className="h-4 w-4" style={{ color: T.orange }} />;
    if (entity === 'assignment') return <CheckCircle className="h-4 w-4" style={{ color: T.orange }} />;
    if (entity === 'message') return <MessageSquare className="h-4 w-4" style={{ color: T.orange }} />;
    if (type === 'error') return <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
    if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
    return <Info className="h-4 w-4" style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }} />;
  };

  // Color classes for different notification types
  const getTypeColorClasses = (type: string, entity: string) => {
    if (entity === 'course') return `bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800`;
    if (entity === 'assignment') return `bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800`;
    if (entity === 'message') return `bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800`;
    if (type === 'error') return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
    if (type === 'warning') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  };

  // Page content
  const pageContent = (
    <div className={`flex flex-col h-[calc(100vh-64px)] ${roboto.className}`}
         style={{ background: theme === 'dark' ? T.dark.pageBg : T.pageBg, color: theme === 'dark' ? T.dark.textMain : T.textMain }}>
      
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
           style={{ background: theme === 'dark' ? T.dark.bg : T.bg, borderColor: theme === 'dark' ? T.dark.border : T.border }}>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold"
              style={{ color: theme === 'dark' ? T.dark.textMain : T.textMain }}>
            Notifications
          </h1>
          
          <div className="hidden md:flex items-center rounded-lg px-3 py-2 w-64 lg:w-96 transition-all"
               style={{ 
                 background: theme === 'dark' ? T.dark.surface : T.border,
                 boxShadow: theme === 'dark' ? 'none' : 'none'
               }}
               onFocus={(e) => {
                 e.currentTarget.style.background = theme === 'dark' ? T.dark.card : T.bg;
                 e.currentTarget.style.boxShadow = `0 0 0 2px ${T.orange}`;
               }}
               onBlur={(e) => {
                 e.currentTarget.style.background = theme === 'dark' ? T.dark.surface : T.border;
                 e.currentTarget.style.boxShadow = 'none';
               }}>
            <Search className="h-4 w-4 mr-2" style={{ color: theme === 'dark' ? T.dark.textHint : T.textHint }} />
            <input 
              type="text" 
              placeholder="Search notifications..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full"
              style={{ 
                color: theme === 'dark' ? T.dark.textMain : T.textMain,
                placeholderColor: theme === 'dark' ? T.dark.textHint : T.textHint
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="ml-2">
                <X className="h-3 w-3" style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-all disabled:opacity-50"
            style={{ 
              background: theme === 'dark' ? T.dark.card : T.bg,
              border: `1px solid ${theme === 'dark' ? T.dark.border : T.border}`,
              color: theme === 'dark' ? T.dark.textSub : T.textSub
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? T.dark.surface : '#f7f7f9'}
            onMouseLeave={e => e.currentTarget.style.background = theme === 'dark' ? T.dark.card : T.bg}
            title="Refresh notifications"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} style={{ color: T.orange }} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </button>
          
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="inline-flex items-center px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50 transition-all"
              style={{ background: T.orange }}
              onMouseEnter={e => e.currentTarget.style.background = T.orangeDark}
              onMouseLeave={e => e.currentTarget.style.background = T.orange}
              title="Mark all as read"
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              {markAllAsReadMutation.isPending ? 'Processing...' : 'Mark all read'}
            </button>
          )}

          {filteredNotifications.length > 0 && (
            <button
              onClick={() => {
                if(confirm('Delete all currently visible notifications?')) {
                  deleteAllNotificationsMutation.mutate();
                }
              }}
              disabled={deleteAllNotificationsMutation.isPending}
              className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 transition-all"
              style={{ 
                background: theme === 'dark' ? 'rgba(239,68,68,0.1)' : '#fee2e2',
                color: theme === 'dark' ? '#f87171' : '#dc2626'
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(239,68,68,0.2)' : '#fecaca'}
              onMouseLeave={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(239,68,68,0.1)' : '#fee2e2'}
              title="Delete all notifications"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {deleteAllNotificationsMutation.isPending ? 'Deleting...' : 'Delete All'}
            </button>
          )}
        </div>
      </div>

      {/* COMPACT Tabs */}
      <div className="flex items-center px-2 border-b overflow-x-auto scrollbar-hide"
           style={{ 
             background: theme === 'dark' ? T.dark.bg : T.bg, 
             borderColor: theme === 'dark' ? T.dark.border : T.border 
           }}>
        {[
          { id: 'all', label: 'All', icon: Bell },
          { id: 'unread', label: 'Unread', count: unreadCount, icon: Eye },
          { id: 'favorite', label: 'Favorites', icon: Star },
          { id: 'read', label: 'Read', icon: CheckSquare },
          { id: 'course', label: 'Courses', icon: BookOpen },
          { id: 'assignment', label: 'Assignments', icon: CheckCircle },
          { id: 'message', label: 'Messages', icon: MessageSquare },
          { id: 'system', label: 'System', icon: Info }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className="group flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap"
            style={{
              borderColor: activeFilter === tab.id ? T.orange : 'transparent',
              color: activeFilter === tab.id 
                ? T.orange 
                : theme === 'dark' ? T.dark.textMuted : T.textMuted,
              background: activeFilter === tab.id && theme === 'dark' 
                ? 'rgba(242,119,87,0.12)' 
                : activeFilter === tab.id 
                  ? T.orangeLight 
                  : 'transparent'
            }}
          >
            <tab.icon className="h-4 w-4" style={{ 
              color: activeFilter === tab.id ? T.orange : theme === 'dark' ? T.dark.textHint : T.textHint 
            }} />
            {tab.label}
            {tab.id === 'unread' && unreadCount > 0 && (
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
                    style={{ 
                      background: activeFilter === tab.id ? T.orange : (theme === 'dark' ? T.dark.border : T.border),
                      color: activeFilter === tab.id ? 'white' : (theme === 'dark' ? T.dark.textSub : T.textSub)
                    }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center" style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }}>
            Loading your inbox...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }}>
            {searchQuery ? (
              <>
                <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
                     style={{ background: theme === 'dark' ? T.dark.surface : T.border }}>
                  <Search className="h-8 w-8" style={{ color: theme === 'dark' ? T.dark.textHint : T.textHint }} />
                </div>
                <p className="text-lg font-medium">No results found</p>
                <p className="text-sm">Try different keywords or clear your search.</p>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
                     style={{ background: theme === 'dark' ? T.dark.surface : T.border }}>
                  {activeFilter === 'favorite' ? (
                    <Star className="h-8 w-8" style={{ color: T.orange }} />
                  ) : (
                    <Mail className="h-8 w-8" style={{ color: theme === 'dark' ? T.dark.textHint : T.textHint }} />
                  )}
                </div>
                <p className="text-lg font-medium">
                  {activeFilter === 'favorite' ? 'No favorite notifications' : 
                   activeFilter === 'read' ? 'No read notifications' : 
                   "You're all caught up!"}
                </p>
                <p className="text-sm">No notifications in this tab.</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: theme === 'dark' ? T.dark.border : T.border }}>
            {filteredNotifications.map((notification) => {
              const isExpanded = expandedId === notification._id;
              const isRead = notification.isRead;
              
              return (
                <div 
                  key={notification._id}
                  className="group relative transition-all duration-200 cursor-pointer"
                  style={{ 
                    background: isExpanded 
                      ? theme === 'dark' 
                        ? 'rgba(242,119,87,0.08)' 
                        : T.orangeLight
                      : theme === 'dark'
                        ? T.dark.bg
                        : T.bg,
                    borderColor: theme === 'dark' ? T.dark.border : T.border
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  onMouseEnter={e => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = theme === 'dark' ? T.dark.card : '#f7f7f9';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isExpanded) {
                      e.currentTarget.style.background = theme === 'dark' ? T.dark.bg : T.bg;
                    }
                  }}
                >
                  {/* Collapsed View (Row) */}
                  <div className="flex items-center px-4 py-3 gap-4">
                    
                    {/* Star Toggle Button */}
                    <button 
                      className="flex-shrink-0 p-1 rounded-full transition-colors z-20"
                      style={{ background: 'transparent' }}
                      onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteMutation.mutate(notification._id);
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? T.dark.surface : T.border}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      title={notification.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star 
                        className="h-5 w-5 transition-colors"
                        style={{ 
                          color: notification.isFavorite ? T.orange : (theme === 'dark' ? T.dark.textHint : T.textHint),
                          fill: notification.isFavorite ? T.orange : 'none'
                        }} 
                      />
                    </button>

                    {/* Content Section */}
                    <div className="flex flex-1 items-center min-w-0 gap-4 overflow-hidden">
                      {/* Type Badge */}
                      <div className={`w-32 md:w-40 flex-shrink-0 flex items-center gap-2 truncate px-2 py-1 rounded-md text-xs font-medium border ${getTypeColorClasses(notification.type, notification.relatedEntity)}`}>
                        {getIconForType(notification.type, notification.relatedEntity)}
                        <span className="truncate">
                          {notification.relatedEntity ? 
                            notification.relatedEntity.charAt(0).toUpperCase() + notification.relatedEntity.slice(1) : 
                            'System'}
                        </span>
                      </div>

                      {/* Title & Preview */}
                      <div className="flex-1 truncate flex items-center text-sm">
                        <span className="mr-2 truncate"
                              style={{ 
                                fontWeight: !isRead ? 700 : 400,
                                color: !isRead 
                                  ? theme === 'dark' ? T.dark.textMain : T.textMain
                                  : theme === 'dark' ? T.dark.textSub : T.textSub
                              }}>
                          {notification.title}
                        </span>
                        <span className="hidden sm:inline truncate"
                              style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }}>
                          - {notification.message}
                        </span>
                      </div>
                    </div>

                    {/* Date & Hover Actions */}
                    <div className="flex-shrink-0 flex items-center justify-end w-24 pl-2">
                      {/* Hover Actions */}
                      <div className="hidden group-hover:flex items-center gap-2 mr-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification._id);
                          }}
                          className="p-1.5 rounded-full transition-colors"
                          style={{ background: 'transparent' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = theme === 'dark' ? T.dark.surface : T.border;
                            (e.currentTarget.firstChild as HTMLElement).style.color = '#ef4444';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            (e.currentTarget.firstChild as HTMLElement).style.color = theme === 'dark' ? T.dark.textMuted : T.textMuted;
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 transition-colors" 
                                  style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }} />
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification);
                          }}
                          className="p-1.5 rounded-full transition-colors"
                          style={{ background: 'transparent' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = theme === 'dark' ? T.dark.surface : T.border;
                            (e.currentTarget.firstChild as HTMLElement).style.color = T.orange;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            (e.currentTarget.firstChild as HTMLElement).style.color = theme === 'dark' ? T.dark.textMuted : T.textMuted;
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 transition-colors"
                               style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }} />
                        </button>
                      </div>
                      
                      {/* Date */}
                      <span className="text-xs group-hover:hidden"
                            style={{ 
                              fontWeight: !isRead ? 600 : 400,
                              color: !isRead 
                                ? T.orange 
                                : theme === 'dark' ? T.dark.textMuted : T.textMuted
                            }}>
                        {formatEmailDate(notification.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-14 pr-4 border-t cursor-default"
                         style={{ 
                           background: theme === 'dark' ? T.dark.bg : T.bg,
                           borderColor: theme === 'dark' ? T.dark.border : T.border 
                         }}
                         onClick={(e) => e.stopPropagation()}>
                      <div className="pt-4 animate-fadeIn">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold"
                                  style={{ color: theme === 'dark' ? T.dark.textMain : T.textMain }}>
                                {notification.title}
                              </h3>
                              {notification.isFavorite && (
                                <span className="px-2 py-0.5 rounded-full text-xs border"
                                      style={{ 
                                        background: T.orangeLight,
                                        color: T.orange,
                                        borderColor: T.orange
                                      }}>
                                  Favorite
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-1"
                               style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }}>
                              From: <span className="font-medium"
                                         style={{ color: theme === 'dark' ? T.dark.textSub : T.textSub }}>System Admin</span> 
                              <span className="mx-2" style={{ color: theme === 'dark' ? T.dark.border : T.border }}>•</span> 
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm leading-relaxed whitespace-pre-wrap"
                             style={{ color: theme === 'dark' ? T.dark.textSub : T.textSub }}>
                          {notification.message}
                        </div>

                        {/* Metadata */}
                        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                          <div className="mt-6 rounded-lg p-4 border"
                               style={{ 
                                 background: theme === 'dark' ? T.dark.surface : '#f7f7f9',
                                 borderColor: theme === 'dark' ? T.dark.border : T.border
                               }}>
                            <h4 className="text-xs font-medium uppercase tracking-wider mb-2"
                                style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }}>
                              Technical Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                              {Object.entries(notification.metadata).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="font-medium min-w-[100px]"
                                        style={{ color: theme === 'dark' ? T.dark.textMuted : T.textMuted }}>
                                    {key}:
                                  </span>
                                  <span className="break-all"
                                        style={{ color: theme === 'dark' ? T.dark.textSub : T.textSub }}>
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Show loading state while determining role
  if (isRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: theme === 'dark' ? T.dark.pageBg : T.pageBg }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2"
             style={{ borderColor: T.orange }}></div>
      </div>
    );
  }

  // Conditionally wrap with appropriate layout based on user role
  if (userRole === 'admin') {
    return <DashboardLayout>{pageContent}</DashboardLayout>;
  }
  
  if (userRole === 'student') {
    return <StudentLayout>{pageContent}</StudentLayout>;
  }
  
  // All other roles (programcoordinator, faculty, staff, etc.) get StaffLayout
  return <StaffLayout>{pageContent}</StaffLayout>;
}