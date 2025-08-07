import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: Record<string, any>;
}

export interface NotificationState {
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Settings
  settings: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
    sms: boolean;
    autoDismiss: boolean;
    autoDismissDelay: number;
  };
  
  // UI State
  isOpen: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface NotificationActions {
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  clearReadNotifications: () => void;
  
  // Quick notification methods
  success: (title: string, message: string, options?: Partial<Notification>) => void;
  error: (title: string, message: string, options?: Partial<Notification>) => void;
  warning: (title: string, message: string, options?: Partial<Notification>) => void;
  info: (title: string, message: string, options?: Partial<Notification>) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<NotificationState['settings']>) => void;
  toggleEnabled: () => void;
  toggleSound: () => void;
  toggleDesktop: () => void;
  toggleEmail: () => void;
  toggleSms: () => void;
  toggleAutoDismiss: () => void;
  setAutoDismissDelay: (delay: number) => void;
  
  // UI actions
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setPosition: (position: NotificationState['position']) => void;
  
  // Utility actions
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: Notification['type']) => Notification[];
  getNotificationsByDate: (date: Date) => Notification[];
}

export type NotificationStore = NotificationState & NotificationActions;

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  settings: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    sms: false,
    autoDismiss: true,
    autoDismissDelay: 5000,
  },
  isOpen: false,
  position: 'top-right',
};

// Helper function to generate unique ID
const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Create notification store
export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Notification actions
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: generateId(),
          timestamp: new Date(),
          read: false,
        };

        set((state) => {
          const newNotifications = [newNotification, ...state.notifications];
          const newUnreadCount = newNotifications.filter((n) => !n.read).length;

          // Auto-dismiss if enabled
          if (state.settings.autoDismiss && newNotification.duration !== 0) {
            setTimeout(() => {
              get().removeNotification(newNotification.id);
            }, newNotification.duration || state.settings.autoDismissDelay);
          }

          return {
            notifications: newNotifications,
            unreadCount: newUnreadCount,
          };
        });
      },

      removeNotification: (id: string) => {
        set((state) => {
          const newNotifications = state.notifications.filter((n) => n.id !== id);
          const newUnreadCount = newNotifications.filter((n) => !n.read).length;

          return {
            notifications: newNotifications,
            unreadCount: newUnreadCount,
          };
        });
      },

      markAsRead: (id: string) => {
        set((state) => {
          const newNotifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          const newUnreadCount = newNotifications.filter((n) => !n.read).length;

          return {
            notifications: newNotifications,
            unreadCount: newUnreadCount,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => {
          const newNotifications = state.notifications.map((n) => ({ ...n, read: true }));

          return {
            notifications: newNotifications,
            unreadCount: 0,
          };
        });
      },

      clearNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      clearReadNotifications: () => {
        set((state) => {
          const newNotifications = state.notifications.filter((n) => !n.read);

          return {
            notifications: newNotifications,
            unreadCount: newNotifications.length,
          };
        });
      },

      // Quick notification methods
      success: (title: string, message: string, options = {}) => {
        get().addNotification({
          type: 'success',
          title,
          message,
          ...options,
        });
      },

      error: (title: string, message: string, options = {}) => {
        get().addNotification({
          type: 'error',
          title,
          message,
          ...options,
        });
      },

      warning: (title: string, message: string, options = {}) => {
        get().addNotification({
          type: 'warning',
          title,
          message,
          ...options,
        });
      },

      info: (title: string, message: string, options = {}) => {
        get().addNotification({
          type: 'info',
          title,
          message,
          ...options,
        });
      },

      // Settings actions
      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      toggleEnabled: () => {
        set((state) => ({
          settings: { ...state.settings, enabled: !state.settings.enabled },
        }));
      },

      toggleSound: () => {
        set((state) => ({
          settings: { ...state.settings, sound: !state.settings.sound },
        }));
      },

      toggleDesktop: () => {
        set((state) => ({
          settings: { ...state.settings, desktop: !state.settings.desktop },
        }));
      },

      toggleEmail: () => {
        set((state) => ({
          settings: { ...state.settings, email: !state.settings.email },
        }));
      },

      toggleSms: () => {
        set((state) => ({
          settings: { ...state.settings, sms: !state.settings.sms },
        }));
      },

      toggleAutoDismiss: () => {
        set((state) => ({
          settings: { ...state.settings, autoDismiss: !state.settings.autoDismiss },
        }));
      },

      setAutoDismissDelay: (delay: number) => {
        set((state) => ({
          settings: { ...state.settings, autoDismissDelay: delay },
        }));
      },

      // UI actions
      toggleOpen: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      setOpen: (open: boolean) => {
        set({ isOpen: open });
      },

      setPosition: (position: NotificationState['position']) => {
        set({ position });
      },

      // Utility actions
      getUnreadNotifications: () => {
        return get().notifications.filter((n) => !n.read);
      },

      getNotificationsByType: (type: Notification['type']) => {
        return get().notifications.filter((n) => n.type === type);
      },

      getNotificationsByDate: (date: Date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return get().notifications.filter(
          (n) => n.timestamp >= startOfDay && n.timestamp <= endOfDay
        );
      },
    }),
    {
      name: 'notification-store',
    }
  )
);
