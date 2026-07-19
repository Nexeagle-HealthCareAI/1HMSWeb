import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export interface AppState {
  // UI State
  sidebarCollapsed: boolean;
  currentRoute: string;
  breadcrumbs: Array<{ label: string; path: string }>;
  isLowBandwidthMode: boolean;
  
  // Loading States
  globalLoading: boolean;
  loadingStates: Record<string, boolean>;
  
  // Modal States
  modals: Record<string, boolean>;
  
  // Search and Filters
  searchQuery: string;
  filters: Record<string, any>;
  
  // Pagination
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
  };
  
  // Error Handling
  errors: Record<string, string>;
  
  // Feature Flags
  features: Record<string, boolean>;
}

export interface AppActions {
  // Sidebar
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Navigation
  setCurrentRoute: (route: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; path: string }>) => void;
  
  // Settings
  setLowBandwidthMode: (mode: boolean) => void;
  
  // Loading
  setGlobalLoading: (loading: boolean) => void;
  setLoadingState: (key: string, loading: boolean) => void;
  clearLoadingState: (key: string) => void;
  
  // Modals
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
  
  // Search and Filters
  setSearchQuery: (query: string) => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  clearFilter: (key: string) => void;
  
  // Pagination
  setPagination: (pagination: Partial<AppState['pagination']>) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  
  // Error Handling
  setError: (key: string, error: string) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  
  // Feature Flags
  setFeature: (feature: string, enabled: boolean) => void;
  
  // Reset
  resetAppState: () => void;
}

export type AppStore = AppState & AppActions;

// Initial state
const initialState: AppState = {
  sidebarCollapsed: true,
  currentRoute: '/',
  breadcrumbs: [],
  isLowBandwidthMode: false,
  globalLoading: false,
  loadingStates: {},
  modals: {},
  searchQuery: '',
  filters: {},
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
  },
  errors: {},
  features: {
    darkMode: false,
    notifications: true,
    analytics: true,
  },
};

// Create app store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Sidebar actions
        toggleSidebar: () => {
          set((state) => ({
            sidebarCollapsed: !state.sidebarCollapsed,
          }));
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          set({ sidebarCollapsed: collapsed });
        },

        // Navigation actions
        setCurrentRoute: (route: string) => {
          set({ currentRoute: route });
        },

        setBreadcrumbs: (breadcrumbs: Array<{ label: string; path: string }>) => {
          set({ breadcrumbs });
        },

        // Settings actions
        setLowBandwidthMode: (mode: boolean) => {
          set({ isLowBandwidthMode: mode });
        },

        // Loading actions
        setGlobalLoading: (loading: boolean) => {
          set({ globalLoading: loading });
        },

        setLoadingState: (key: string, loading: boolean) => {
          set((state) => ({
            loadingStates: {
              ...state.loadingStates,
              [key]: loading,
            },
          }));
        },

        clearLoadingState: (key: string) => {
          set((state) => {
            const newLoadingStates = { ...state.loadingStates };
            delete newLoadingStates[key];
            return { loadingStates: newLoadingStates };
          });
        },

        // Modal actions
        openModal: (modalId: string) => {
          set((state) => ({
            modals: {
              ...state.modals,
              [modalId]: true,
            },
          }));
        },

        closeModal: (modalId: string) => {
          set((state) => ({
            modals: {
              ...state.modals,
              [modalId]: false,
            },
          }));
        },

        closeAllModals: () => {
          set({ modals: {} });
        },

        // Search and filter actions
        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },

        setFilter: (key: string, value: any) => {
          set((state) => ({
            filters: {
              ...state.filters,
              [key]: value,
            },
          }));
        },

        clearFilters: () => {
          set({ filters: {} });
        },

        clearFilter: (key: string) => {
          set((state) => {
            const newFilters = { ...state.filters };
            delete newFilters[key];
            return { filters: newFilters };
          });
        },

        // Pagination actions
        setPagination: (pagination: Partial<AppState['pagination']>) => {
          set((state) => ({
            pagination: {
              ...state.pagination,
              ...pagination,
            },
          }));
        },

        setCurrentPage: (page: number) => {
          set((state) => ({
            pagination: {
              ...state.pagination,
              currentPage: page,
            },
          }));
        },

        setPageSize: (size: number) => {
          set((state) => ({
            pagination: {
              ...state.pagination,
              pageSize: size,
              currentPage: 1, // Reset to first page when changing page size
            },
          }));
        },

        setTotalItems: (total: number) => {
          set((state) => ({
            pagination: {
              ...state.pagination,
              totalItems: total,
            },
          }));
        },

        // Error handling actions
        setError: (key: string, error: string) => {
          set((state) => ({
            errors: {
              ...state.errors,
              [key]: error,
            },
          }));
        },

        clearError: (key: string) => {
          set((state) => {
            const newErrors = { ...state.errors };
            delete newErrors[key];
            return { errors: newErrors };
          });
        },

        clearAllErrors: () => {
          set({ errors: {} });
        },

        // Feature flag actions
        setFeature: (feature: string, enabled: boolean) => {
          set((state) => ({
            features: {
              ...state.features,
              [feature]: enabled,
            },
          }));
        },

        // Reset actions
        resetAppState: () => {
          set(initialState);
        },
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          features: state.features,
          isLowBandwidthMode: state.isLowBandwidthMode,
        }),
      }
    ),
    {
      name: 'app-store',
    }
  )
);
