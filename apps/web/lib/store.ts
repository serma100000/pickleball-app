import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
interface Location {
  lat: number;
  lng: number;
}

interface UserPreferences {
  skillLevel: number;
  preferredGameType: 'singles' | 'doubles' | 'both';
  searchRadius: number; // miles
  notifications: {
    gameInvites: boolean;
    clubUpdates: boolean;
    leagueResults: boolean;
    tournamentReminders: boolean;
  };
}

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  mapView: 'map' | 'list' | 'split';
}

interface AppState {
  // User location
  location: Location | null;
  locationLoading: boolean;
  locationError: string | null;

  // User preferences
  preferences: UserPreferences;

  // UI state
  ui: UIState;

  // Active filters
  courtFilters: {
    indoor: boolean | null;
    lighted: boolean | null;
    freeToPlay: boolean | null;
    minRating: number;
  };

  // Actions
  setLocation: (location: Location | null) => void;
  setLocationLoading: (loading: boolean) => void;
  setLocationError: (error: string | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  toggleSidebar: () => void;
  setTheme: (theme: UIState['theme']) => void;
  setMapView: (view: UIState['mapView']) => void;
  setCourtFilters: (filters: Partial<AppState['courtFilters']>) => void;
  resetCourtFilters: () => void;
}

const defaultPreferences: UserPreferences = {
  skillLevel: 3.0,
  preferredGameType: 'both',
  searchRadius: 10,
  notifications: {
    gameInvites: true,
    clubUpdates: true,
    leagueResults: true,
    tournamentReminders: true,
  },
};

const defaultCourtFilters: AppState['courtFilters'] = {
  indoor: null,
  lighted: null,
  freeToPlay: null,
  minRating: 0,
};

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Initial state
      location: null,
      locationLoading: false,
      locationError: null,
      preferences: defaultPreferences,
      ui: {
        sidebarOpen: true,
        theme: 'system',
        mapView: 'split',
      },
      courtFilters: defaultCourtFilters,

      // Actions
      setLocation: (location) =>
        set((state) => {
          state.location = location;
          state.locationError = null;
        }),

      setLocationLoading: (loading) =>
        set((state) => {
          state.locationLoading = loading;
        }),

      setLocationError: (error) =>
        set((state) => {
          state.locationError = error;
          state.locationLoading = false;
        }),

      updatePreferences: (preferences) =>
        set((state) => {
          Object.assign(state.preferences, preferences);
        }),

      toggleSidebar: () =>
        set((state) => {
          state.ui.sidebarOpen = !state.ui.sidebarOpen;
        }),

      setTheme: (theme) =>
        set((state) => {
          state.ui.theme = theme;
        }),

      setMapView: (view) =>
        set((state) => {
          state.ui.mapView = view;
        }),

      setCourtFilters: (filters) =>
        set((state) => {
          Object.assign(state.courtFilters, filters);
        }),

      resetCourtFilters: () =>
        set((state) => {
          state.courtFilters = defaultCourtFilters;
        }),
    })),
    {
      name: 'pickle-play-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        ui: {
          theme: state.ui.theme,
          mapView: state.ui.mapView,
        },
      }),
    }
  )
);

// Game logging store (separate for form state)
interface GameFormState {
  gameType: 'singles' | 'doubles';
  partners: string[];
  opponents: string[];
  scores: Array<{ team1: number; team2: number }>;
  courtId: string | null;
  notes: string;
  date: Date;

  // Actions
  setGameType: (type: 'singles' | 'doubles') => void;
  setPartners: (partners: string[]) => void;
  setOpponents: (opponents: string[]) => void;
  setScores: (scores: Array<{ team1: number; team2: number }>) => void;
  updateScore: (
    index: number,
    team: 'team1' | 'team2',
    value: number
  ) => void;
  addGame: () => void;
  removeGame: (index: number) => void;
  setCourtId: (id: string | null) => void;
  setNotes: (notes: string) => void;
  setDate: (date: Date) => void;
  reset: () => void;
}

const defaultGameForm = {
  gameType: 'doubles' as const,
  partners: [''],
  opponents: ['', ''],
  scores: [{ team1: 0, team2: 0 }],
  courtId: null,
  notes: '',
  date: new Date(),
};

export const useGameFormStore = create<GameFormState>()(
  immer((set) => ({
    ...defaultGameForm,

    setGameType: (type) =>
      set((state) => {
        state.gameType = type;
        if (type === 'singles') {
          state.partners = [''];
          state.opponents = [''];
        } else {
          state.partners = [''];
          state.opponents = ['', ''];
        }
      }),

    setPartners: (partners) =>
      set((state) => {
        state.partners = partners;
      }),

    setOpponents: (opponents) =>
      set((state) => {
        state.opponents = opponents;
      }),

    setScores: (scores) =>
      set((state) => {
        state.scores = scores;
      }),

    updateScore: (index, team, value) =>
      set((state) => {
        if (state.scores[index]) {
          state.scores[index][team] = Math.max(0, Math.min(21, value));
        }
      }),

    addGame: () =>
      set((state) => {
        if (state.scores.length < 3) {
          state.scores.push({ team1: 0, team2: 0 });
        }
      }),

    removeGame: (index) =>
      set((state) => {
        if (state.scores.length > 1) {
          state.scores.splice(index, 1);
        }
      }),

    setCourtId: (id) =>
      set((state) => {
        state.courtId = id;
      }),

    setNotes: (notes) =>
      set((state) => {
        state.notes = notes;
      }),

    setDate: (date) =>
      set((state) => {
        state.date = date;
      }),

    reset: () =>
      set(() => ({
        ...defaultGameForm,
        date: new Date(),
      })),
  }))
);
