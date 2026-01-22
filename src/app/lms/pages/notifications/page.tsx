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

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export default function NotificationsPage() {
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
  });

  // Initialize theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  // --- Real-time & Polling ---
  useEffect(() => {
    notificationsService.setPollingEnabled(true);
    return () => notificationsService.setPollingEnabled(false);
  }, []);

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
    if (entity === 'course') return <BookOpen className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
    if (entity === 'assignment') return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (entity === 'message') return <MessageSquare className="h-4 w-4 text-purple-500 dark:text-purple-400" />;
    if (type === 'error') return <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
    if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
    return <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
  };

  // Color classes for different notification types
  const getTypeColorClasses = (type: string, entity: string) => {
    if (entity === 'course') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    if (entity === 'assignment') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    if (entity === 'message') return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
    if (type === 'error') return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    if (type === 'warning') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  };

  return (
    <StudentLayout>
      <div className={`flex flex-col h-[calc(100vh-64px)] ${roboto.className} ${
        theme === 'dark' 
          ? 'bg-gray-900 text-gray-100' 
          : 'bg-gray-50 text-gray-900'
      }`}>
        
        {/* Header Toolbar */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          theme === 'dark' 
            ? 'border-gray-800 bg-gray-900' 
            : 'border-gray-200 bg-white'
        } sticky top-0 z-10`}>
          <div className="flex items-center gap-4">
            <h1 className={`text-xl font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Notifications
            </h1>
            
            <div className={`hidden md:flex items-center rounded-lg px-3 py-2 w-64 lg:w-96 transition-all ${
              theme === 'dark'
                ? 'bg-gray-800 focus-within:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500/50'
                : 'bg-gray-100 focus-within:bg-white focus-within:shadow-md focus-within:ring-2 focus-within:ring-blue-500'
            }`}>
              <Search className={`h-4 w-4 mr-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input 
                type="text" 
                placeholder="Search notifications..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent border-none outline-none text-sm w-full ${
                  theme === 'dark' 
                    ? 'text-white placeholder-gray-500' 
                    : 'text-gray-900 placeholder-gray-500'
                }`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="ml-2">
                  <X className={`h-3 w-3 ${
                    theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                  }`} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-all ${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              } disabled:opacity-50`}
              title="Refresh notifications"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefetching ? 'animate-spin' : ''} ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`} />
              {isRefetching ? 'Refreshing...' : 'Refresh'}
            </button>
            
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
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
                className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-all ${
                  theme === 'dark'
                    ? 'text-red-400 bg-red-900/20'
                    : 'text-red-600 bg-red-50'
                }`}
                title="Delete all notifications"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {deleteAllNotificationsMutation.isPending ? 'Deleting...' : 'Delete All'}
              </button>
            )}
          </div>
        </div>

        {/* COMPACT Tabs */}
        <div className={`flex items-center px-2 border-b ${
          theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
        } overflow-x-auto scrollbar-hide`}>
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
              className={`
                group flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                ${activeFilter === tab.id 
                  ? theme === 'dark'
                    ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                    : 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <tab.icon className={`h-4 w-4 ${
                activeFilter === tab.id 
                  ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  : theme === 'dark' ? 'text-gray-500 group-hover:text-gray-400' : 'text-gray-500 group-hover:text-gray-600'
              }`} />
              {tab.label}
              {tab.id === 'unread' && unreadCount > 0 && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  activeFilter === tab.id
                    ? theme === 'dark'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-600 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-200 text-gray-700'
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className={`p-8 text-center ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Loading your inbox...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {searchQuery ? (
                <>
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    <Search className={`h-8 w-8 ${
                      theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-sm">Try different keywords or clear your search.</p>
                </>
              ) : (
                <>
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    {activeFilter === 'favorite' ? (
                      <Star className={`h-8 w-8 ${
                        theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                    ) : (
                      <Mail className={`h-8 w-8 ${
                        theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                      }`} />
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
            <div className={`divide-y ${
              theme === 'dark' ? 'divide-gray-800' : 'divide-gray-100'
            }`}>
              {filteredNotifications.map((notification) => {
                const isExpanded = expandedId === notification._id;
                const isRead = notification.isRead;
                
                return (
                  <div 
                    key={notification._id}
                    className={`
                      group relative transition-all duration-200 cursor-pointer
                      ${isExpanded 
                        ? theme === 'dark' 
                          ? 'bg-blue-900/10' 
                          : 'bg-blue-50/50'
                        : theme === 'dark'
                          ? 'bg-gray-900 hover:bg-gray-800/50'
                          : 'bg-white hover:bg-gray-50'
                      }
                      ${!isRead && theme === 'dark' ? 'bg-gray-800/30' : ''}
                      ${!isRead && theme !== 'dark' ? 'bg-white' : ''}
                    `}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Collapsed View (Row) */}
                    <div className="flex items-center px-4 py-3 gap-4">
                      
                      {/* Star Toggle Button */}
                      <button 
                        className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors z-20"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteMutation.mutate(notification._id);
                        }}
                        title={notification.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star 
                          className={`h-5 w-5 transition-colors ${
                            notification.isFavorite 
                              ? 'text-yellow-400 fill-yellow-400' 
                              : theme === 'dark'
                                ? 'text-gray-500 hover:text-yellow-300'
                                : 'text-gray-300 hover:text-yellow-500'
                          }`} 
                        />
                      </button>

                      {/* Content Section */}
                      <div className="flex flex-1 items-center min-w-0 gap-4 overflow-hidden">
                        {/* Type Badge */}
                        <div className={`w-32 md:w-40 flex-shrink-0 flex items-center gap-2 truncate px-2 py-1 rounded-md text-xs font-medium ${getTypeColorClasses(notification.type, notification.relatedEntity)}`}>
                          {getIconForType(notification.type, notification.relatedEntity)}
                          <span className="truncate">
                            {notification.relatedEntity ? 
                              notification.relatedEntity.charAt(0).toUpperCase() + notification.relatedEntity.slice(1) : 
                              'System'}
                          </span>
                        </div>

                        {/* Title & Preview */}
                        <div className="flex-1 truncate flex items-center text-sm">
                          <span className={`mr-2 truncate ${
                            !isRead 
                              ? theme === 'dark'
                                ? 'font-bold text-white'
                                : 'font-bold text-gray-900'
                              : theme === 'dark'
                                ? 'text-gray-300'
                                : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </span>
                          <span className={`hidden sm:inline truncate ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
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
                            className={`p-1.5 rounded-full ${
                              theme === 'dark'
                                ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                                : 'text-gray-400 hover:text-red-600 hover:bg-gray-200'
                            }`}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNotificationClick(notification);
                            }}
                            className={`p-1.5 rounded-full ${
                              theme === 'dark'
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-gray-200'
                            }`}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Date */}
                        <span className={`text-xs group-hover:hidden ${
                          !isRead 
                            ? theme === 'dark'
                              ? 'font-bold text-white'
                              : 'font-bold text-gray-900'
                            : theme === 'dark'
                              ? 'text-gray-400'
                              : 'text-gray-500'
                        }`}>
                          {formatEmailDate(notification.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Expanded View */}
                    {isExpanded && (
                      <div className={`px-4 pb-4 pl-14 pr-4 border-t ${
                        theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'
                      } cursor-default`} onClick={(e) => e.stopPropagation()}>
                        <div className="pt-4 animate-fadeIn">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className={`text-lg font-semibold ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {notification.title}
                                </h3>
                                {notification.isFavorite && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                    theme === 'dark'
                                      ? 'bg-yellow-900/30 text-yellow-300 border-yellow-800'
                                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  }`}>
                                    Favorite
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs mt-1 ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                From: <span className={`font-medium ${
                                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                }`}>System Admin</span> 
                                <span className={`mx-2 ${
                                  theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
                                }`}>•</span> 
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {notification.message}
                          </div>

                          {/* Metadata */}
                          {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                            <div className={`mt-6 rounded-lg p-4 border ${
                              theme === 'dark'
                                ? 'bg-gray-800 border-gray-700'
                                : 'bg-gray-50 border-gray-100'
                            }`}>
                              <h4 className={`text-xs font-medium uppercase tracking-wider mb-2 ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                Technical Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
                                {Object.entries(notification.metadata).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className={`font-medium min-w-[100px] ${
                                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                      {key}:
                                    </span>
                                    <span className={`break-all ${
                                      theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                                    }`}>
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
    </StudentLayout>
  );
}