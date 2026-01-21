# Frontend Architecture Document

## Pickleball Web App PWA - UI/UX Implementation Plan

**Version:** 1.0.0
**Last Updated:** January 2026
**Document Type:** Architecture Specification

---

## Table of Contents

1. [Component Hierarchy](#1-component-hierarchy)
2. [Page Structure](#2-page-structure)
3. [State Management](#3-state-management)
4. [PWA Implementation](#4-pwa-implementation)
5. [UI/UX Patterns](#5-uiux-patterns)
6. [Key User Flows](#6-key-user-flows)

---

## 1. Component Hierarchy

### 1.1 Architecture Overview

The component architecture follows atomic design principles with four distinct layers:

```
src/
├── components/
│   ├── layout/           # Shell components (L1)
│   ├── pages/            # Page components (L2)
│   ├── features/         # Feature components (L3)
│   └── ui/               # UI primitives (L4)
├── hooks/                # Custom React hooks
├── stores/               # State management
├── services/             # API and business logic
├── utils/                # Utility functions
└── styles/               # Global styles and tokens
```

### 1.2 Layout Components (L1 - Shell)

These components form the application shell and persistent navigation structure.

```
layout/
├── AppShell.tsx              # Root layout wrapper
├── AuthenticatedLayout.tsx   # Layout for logged-in users
├── PublicLayout.tsx          # Layout for public pages
├── Navigation/
│   ├── BottomNav.tsx         # Mobile bottom navigation (5 items max)
│   ├── SideNav.tsx           # Desktop sidebar navigation
│   ├── TopHeader.tsx         # Header with context actions
│   └── NavItem.tsx           # Individual navigation item
├── Headers/
│   ├── PageHeader.tsx        # Standard page header with back/actions
│   ├── SearchHeader.tsx      # Header with integrated search
│   └── ProfileHeader.tsx     # Profile-specific header
└── Modals/
    ├── ModalContainer.tsx    # Global modal wrapper
    ├── BottomSheet.tsx       # Mobile-first bottom drawer
    └── DialogModal.tsx       # Centered dialog modal
```

**AppShell Component Specification:**

| Property | Type | Description |
|----------|------|-------------|
| children | ReactNode | Page content |
| hideNav | boolean | Hide navigation (onboarding, modals) |
| headerConfig | HeaderConfig | Header customization |
| offline | boolean | Offline indicator state |

### 1.3 Page Components (L2)

Page components represent full-screen routes. Each page has a consistent structure.

```
pages/
├── onboarding/
│   ├── WelcomePage.tsx
│   ├── SkillAssessmentPage.tsx
│   ├── PreferencesPage.tsx
│   ├── LocationPermissionPage.tsx
│   └── CompletionPage.tsx
├── home/
│   └── DashboardPage.tsx
├── courts/
│   ├── CourtFinderPage.tsx
│   ├── CourtDetailPage.tsx
│   └── CourtMapPage.tsx
├── games/
│   ├── FindGamePage.tsx
│   ├── GameLobbyPage.tsx
│   ├── LogGamePage.tsx
│   └── GameHistoryPage.tsx
├── profile/
│   ├── MyProfilePage.tsx
│   ├── UserProfilePage.tsx
│   └── EditProfilePage.tsx
├── social/
│   ├── FriendsPage.tsx
│   ├── FriendRequestsPage.tsx
│   └── PlayerSearchPage.tsx
├── clubs/
│   ├── ClubDiscoveryPage.tsx
│   ├── ClubDetailPage.tsx
│   ├── MyClubsPage.tsx
│   └── ClubManagementPage.tsx
├── leagues/
│   ├── LeagueDiscoveryPage.tsx
│   ├── LeagueDetailPage.tsx
│   ├── LeagueStandingsPage.tsx
│   └── LeagueSchedulePage.tsx
├── tournaments/
│   ├── TournamentDiscoveryPage.tsx
│   ├── TournamentDetailPage.tsx
│   ├── TournamentBracketsPage.tsx
│   └── TournamentRegistrationPage.tsx
├── achievements/
│   └── AchievementsPage.tsx
├── settings/
│   ├── SettingsPage.tsx
│   ├── NotificationSettingsPage.tsx
│   ├── PrivacySettingsPage.tsx
│   └── AccountSettingsPage.tsx
└── notifications/
    └── NotificationsPage.tsx
```

**Page Component Contract:**

```typescript
interface PageComponent {
  // Data requirements
  prefetch?: () => Promise<void>;    // Data to prefetch
  skeleton?: React.FC;                // Loading skeleton

  // Meta information
  title: string;                      // Page title
  requiresAuth: boolean;              // Authentication required
  offlineSupport: boolean;            // Available offline
}
```

### 1.4 Feature Components (L3)

Reusable feature components encapsulating specific functionality.

```
features/
├── auth/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── SocialAuthButtons.tsx
│   └── PasswordReset.tsx
├── court/
│   ├── CourtCard.tsx
│   ├── CourtList.tsx
│   ├── CourtMap.tsx
│   ├── CourtFilters.tsx
│   ├── CourtReviews.tsx
│   └── CourtAvailability.tsx
├── game/
│   ├── GameCard.tsx
│   ├── GameList.tsx
│   ├── GameScoreInput.tsx
│   ├── PlayerSelector.tsx
│   ├── MatchmakingCard.tsx
│   └── GameResultSummary.tsx
├── profile/
│   ├── ProfileCard.tsx
│   ├── SkillBadge.tsx
│   ├── RatingDisplay.tsx
│   ├── StatsOverview.tsx
│   ├── GameHistory.tsx
│   └── AchievementGrid.tsx
├── social/
│   ├── ActivityFeed.tsx
│   ├── FeedItem.tsx
│   ├── FriendCard.tsx
│   ├── FriendsList.tsx
│   ├── PlayerCard.tsx
│   └── InviteButton.tsx
├── club/
│   ├── ClubCard.tsx
│   ├── ClubList.tsx
│   ├── MemberList.tsx
│   ├── ClubEvents.tsx
│   ├── ClubSchedule.tsx
│   └── MembershipTiers.tsx
├── league/
│   ├── LeagueCard.tsx
│   ├── StandingsTable.tsx
│   ├── ScheduleCalendar.tsx
│   ├── MatchCard.tsx
│   └── LeagueStats.tsx
├── tournament/
│   ├── TournamentCard.tsx
│   ├── BracketView.tsx
│   ├── PoolPlayGrid.tsx
│   ├── MatchSchedule.tsx
│   ├── RegistrationForm.tsx
│   └── BracketMatch.tsx
├── achievements/
│   ├── AchievementCard.tsx
│   ├── BadgeDisplay.tsx
│   ├── StreakIndicator.tsx
│   ├── ProgressBar.tsx
│   └── LevelIndicator.tsx
├── notifications/
│   ├── NotificationCard.tsx
│   ├── NotificationList.tsx
│   └── NotificationBadge.tsx
└── search/
    ├── SearchBar.tsx
    ├── SearchResults.tsx
    ├── FilterPanel.tsx
    └── RecentSearches.tsx
```

### 1.5 UI Primitives (L4)

Atomic UI components following the design system.

```
ui/
├── buttons/
│   ├── Button.tsx            # Primary button variants
│   ├── IconButton.tsx        # Icon-only buttons
│   ├── FloatingActionButton.tsx
│   └── ButtonGroup.tsx
├── inputs/
│   ├── Input.tsx             # Text input
│   ├── Select.tsx            # Dropdown select
│   ├── Checkbox.tsx
│   ├── Radio.tsx
│   ├── Switch.tsx
│   ├── Slider.tsx
│   ├── DatePicker.tsx
│   ├── TimePicker.tsx
│   └── SearchInput.tsx
├── display/
│   ├── Avatar.tsx
│   ├── Badge.tsx
│   ├── Chip.tsx
│   ├── Tag.tsx
│   ├── Tooltip.tsx
│   └── Skeleton.tsx
├── feedback/
│   ├── Alert.tsx
│   ├── Toast.tsx
│   ├── Spinner.tsx
│   ├── Progress.tsx
│   └── EmptyState.tsx
├── layout/
│   ├── Card.tsx
│   ├── Divider.tsx
│   ├── Stack.tsx
│   ├── Grid.tsx
│   └── Container.tsx
├── navigation/
│   ├── Tabs.tsx
│   ├── Breadcrumbs.tsx
│   ├── Pagination.tsx
│   └── Stepper.tsx
├── overlays/
│   ├── Modal.tsx
│   ├── Drawer.tsx
│   ├── Popover.tsx
│   └── Menu.tsx
└── data/
    ├── Table.tsx
    ├── List.tsx
    ├── DataGrid.tsx
    └── VirtualList.tsx
```

---

## 2. Page Structure

### 2.1 Onboarding Flow (5 screens)

**Purpose:** Convert new signups into engaged users with minimal friction.

| Screen | Content | Required Fields | Skip Option |
|--------|---------|-----------------|-------------|
| Welcome | Value proposition, social proof | None | No |
| Skill Assessment | Self-rated skill level (1-5) | Skill level | Yes (default to beginner) |
| Preferences | Play style, availability | Play type preference | Yes (default casual) |
| Location | Enable location for court finding | Location permission | Yes (can enable later) |
| Completion | Success state, first action CTA | None | No |

**Skill Assessment Scale:**
- Level 1: Never played / Just starting
- Level 2: Know the basics, learning
- Level 3: Comfortable, play regularly
- Level 4: Competitive, play in leagues
- Level 5: Advanced, tournament player

### 2.2 Home/Dashboard

**Purpose:** Central hub showing personalized content and quick actions.

**Layout Structure:**

```
┌─────────────────────────────────────┐
│  Header: Greeting + Notifications   │
├─────────────────────────────────────┤
│  Quick Actions Row                  │
│  [Find Game] [Log Game] [Find Court]│
├─────────────────────────────────────┤
│  Streak & Progress Card             │
│  "7 day streak! Keep it up"         │
├─────────────────────────────────────┤
│  Upcoming Games Section             │
│  - Game cards with RSVP status      │
├─────────────────────────────────────┤
│  Activity Feed (condensed)          │
│  - Friend activity                  │
│  - Club announcements               │
├─────────────────────────────────────┤
│  Nearby Courts Preview              │
│  - 3 closest courts with distance   │
├─────────────────────────────────────┤
│  Recommended Players (if seeking)   │
│  - Skill-matched suggestions        │
└─────────────────────────────────────┘
```

**Dashboard Widgets (Configurable):**

| Widget | Data Required | Update Frequency |
|--------|---------------|------------------|
| Streak Indicator | Games logged | Real-time |
| Upcoming Games | Game RSVPs | 15 min cache |
| Activity Feed | Social events | Real-time |
| Nearby Courts | Location | On location change |
| Player Suggestions | Profile, location | Hourly |
| Rating Progress | Game results | After each game |

### 2.3 Court Finder

**Purpose:** Discover and navigate to pickleball courts.

**View Modes:**
1. **Map View** - Interactive map with court markers
2. **List View** - Scrollable list sorted by distance

**Filter Options:**

| Filter | Type | Options |
|--------|------|---------|
| Distance | Slider | 1-50 miles |
| Court Type | Multi-select | Indoor, Outdoor |
| Surface | Multi-select | Concrete, Asphalt, Wood, Sport Court |
| Amenities | Multi-select | Lights, Restrooms, Water, Parking |
| Availability | Toggle | Open now, Reservable |
| Rating | Range | 1-5 stars |

**Court Detail Page Sections:**
1. Photo gallery (swipeable)
2. Basic info (name, address, hours)
3. Court specifications (count, surface, net type)
4. Amenities list
5. Availability calendar (if reservable)
6. Reviews and ratings
7. User photos
8. "Check in" button
9. "Get directions" button
10. "Favorite" toggle

### 2.4 Find a Game / Matchmaking

**Purpose:** Connect players for pickup games.

**Browse Games View:**

```
┌─────────────────────────────────────┐
│  Search & Filter Bar                │
│  [Location] [Date] [Skill] [Type]   │
├─────────────────────────────────────┤
│  Toggle: [Scheduled] [Open Now]     │
├─────────────────────────────────────┤
│  Game Cards (scrollable)            │
│  ┌─────────────────────────────┐    │
│  │ Court Name           2.3 mi │    │
│  │ Today, 3:00 PM              │    │
│  │ Doubles | 3.0-3.5 DUPR      │    │
│  │ 3/4 players [Join]          │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Create Game Flow:**

| Step | Fields | Validation |
|------|--------|------------|
| 1. Type | Singles/Doubles/Round Robin | Required |
| 2. When | Date, Start time, Duration | Future date required |
| 3. Where | Court selection or custom | Location required |
| 4. Who | Skill range, Spots available | At least 1 spot |
| 5. Details | Notes, Visibility (public/friends) | Optional |
| 6. Confirm | Summary, Share options | - |

**Matchmaking Algorithm Display:**
- Match quality score (percentage)
- Skill compatibility indicator
- Distance indicator
- Schedule overlap indicator

### 2.5 Game Logging

**Purpose:** Record game results for rating and stats.

**Quick Log Flow (under 30 seconds):**

```
Step 1: Game Type
[Singles] [Doubles]

Step 2: Opponent(s)
[Search/Select players] or [Add name manually]

Step 3: Score
[Your score] - [Opponent score]
(Optional: game-by-game scores)

Step 4: Location (optional)
[Auto-detect] or [Select court]

Step 5: Confirm
[Log Game]
```

**Detailed Log (optional expansion):**
- Game-by-game scores
- Game duration
- Notes
- Photos
- Partner (for doubles)
- Verification request toggle

**Post-Log Actions:**
- Share to feed toggle
- Rate partner/opponent prompt
- View updated stats

### 2.6 Profile Pages

**My Profile Structure:**

```
┌─────────────────────────────────────┐
│  Cover Photo                        │
│  ┌─────┐                            │
│  │Avatar│  Name                     │
│  └─────┘  @username | Location      │
│           Skill: 3.5 | Member since │
├─────────────────────────────────────┤
│  Stats Row                          │
│  [Games] [Win %] [Streak] [Rating]  │
├─────────────────────────────────────┤
│  Tab Navigation                     │
│  [Overview] [Games] [Achievements]  │
├─────────────────────────────────────┤
│  Tab Content Area                   │
│  - Overview: Bio, play preferences  │
│  - Games: Recent game history       │
│  - Achievements: Badge grid         │
└─────────────────────────────────────┘
```

**Other User Profile (Public View):**
- Same structure with reduced info based on privacy settings
- "Add Friend" / "Challenge" / "Message" actions
- Mutual connections display
- Recent public games only

### 2.7 Friends / Social

**Friends Page Sections:**

| Section | Content |
|---------|---------|
| Friend Requests | Pending incoming/outgoing |
| Friends List | Searchable, sortable list |
| Suggested Players | Algorithm-based recommendations |
| Find Players | Search by name, username, skill |

**Activity Feed:**
- Game results (own and friends)
- Achievement unlocks
- Club announcements
- New friendships
- Rating milestones
- Streak achievements

**Feed Item Types:**

| Type | Display |
|------|---------|
| Game Result | Score, players, court, timestamp |
| Achievement | Badge icon, description, timestamp |
| Rating Change | Old vs new rating, trend arrow |
| New Friend | User cards linked |
| Club Post | Club avatar, content, engagement |
| Streak | Streak count, flame icon |

### 2.8 Clubs

**Club Discovery Page:**

```
┌─────────────────────────────────────┐
│  Search Bar                         │
├─────────────────────────────────────┤
│  Filter: [Near Me] [Popular] [New]  │
├─────────────────────────────────────┤
│  Featured Clubs Carousel            │
├─────────────────────────────────────┤
│  Club Cards Grid/List               │
│  ┌─────────────────────────────┐    │
│  │ Club Logo + Name            │    │
│  │ Location | Members count    │    │
│  │ Skill range | Rating        │    │
│  │ [View] [Join]               │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Club Detail Page:**
1. Header (logo, name, location, member count)
2. Description and rules
3. Schedule/Events calendar
4. Member highlights (top players)
5. Courts associated
6. Recent activity
7. Join/Leave button
8. Contact info

**Club Management (Admin View):**
- Member management (roles, approve/remove)
- Event creation
- Announcement posting
- Settings (visibility, join rules)
- Analytics (member activity, growth)

### 2.9 Leagues

**League Discovery:**
- Filter by type (ladder, round robin, flex)
- Filter by skill level
- Filter by location
- Filter by status (registering, active, completed)

**League Detail Page:**

```
┌─────────────────────────────────────┐
│  League Header                      │
│  Name | Status | Season dates       │
├─────────────────────────────────────┤
│  Tab Navigation                     │
│  [Info] [Standings] [Schedule] [My] │
├─────────────────────────────────────┤
│  Standings Table                    │
│  Rank | Player | W | L | Pts | +/-  │
│  1.   | User1  | 5 | 1 | 15  | +12  │
│  2.   | User2  | 4 | 2 | 12  | +8   │
├─────────────────────────────────────┤
│  Schedule List                      │
│  Upcoming matches with dates/times  │
├─────────────────────────────────────┤
│  My Matches (if participating)      │
│  Personal schedule and results      │
└─────────────────────────────────────┘
```

### 2.10 Tournaments

**Tournament Discovery:**
- Calendar view with tournament dates
- List view with filters
- Map view for travel planning

**Filter Options:**

| Filter | Options |
|--------|---------|
| Format | Single/Double Elim, Round Robin, Pool Play |
| Skill Level | 2.0-2.5, 2.5-3.0, 3.0-3.5, etc. |
| Event Type | Singles, Doubles, Mixed |
| Registration | Open, Closing Soon, Waitlist |
| Distance | Radius slider |
| Date Range | Date picker |

**Tournament Detail Page:**

```
┌─────────────────────────────────────┐
│  Tournament Header                  │
│  Name | Dates | Location            │
│  Organizer | Status                 │
├─────────────────────────────────────┤
│  Quick Info Cards                   │
│  [Format] [Divisions] [Prize]       │
├─────────────────────────────────────┤
│  Tab Navigation                     │
│  [Info] [Divisions] [Brackets]      │
│  [Schedule] [My Events]             │
├─────────────────────────────────────┤
│  Division Registration Cards        │
│  - Skill level, spots, status       │
│  - [Register] button per division   │
├─────────────────────────────────────┤
│  Brackets (live during tournament)  │
│  - Interactive bracket view         │
│  - Tap match for details            │
└─────────────────────────────────────┘
```

**Bracket Views:**
- Single/Double elimination tree
- Pool play grid with standings
- Compass draw visualization
- Swiss pairing rounds

### 2.11 Achievements

**Achievement Categories:**

| Category | Examples |
|----------|----------|
| Participation | First Game, 10 Games, 100 Games, 500 Games |
| Consistency | 3-Day Streak, 7-Day Streak, 30-Day Streak |
| Social | First Friend, 10 Friends, Play with 25 Different Partners |
| Exploration | Visit 5 Courts, Play in 3 Cities, Try Indoor and Outdoor |
| Skill | First Win, 10 Wins, Win Streak of 5 |
| Events | First Tournament, First League, Club Champion |
| Special | Early Adopter, Beta Tester, Refer a Friend |

**Achievement Page Layout:**

```
┌─────────────────────────────────────┐
│  Progress Summary                   │
│  Level 12 | 847/1000 XP to Level 13 │
│  45 of 120 achievements unlocked    │
├─────────────────────────────────────┤
│  Filter: [All] [Unlocked] [Locked]  │
├─────────────────────────────────────┤
│  Category Sections                  │
│  ┌─────────────────────────────┐    │
│  │ Participation (8/15)        │    │
│  │ [Badge] [Badge] [Badge]...  │    │
│  └─────────────────────────────┘    │
│  (Locked badges shown grayed)       │
└─────────────────────────────────────┘
```

### 2.12 Settings

**Settings Sections:**

| Section | Items |
|---------|-------|
| Account | Email, Password, Phone, Delete Account |
| Profile | Edit profile, Privacy settings |
| Notifications | Push, Email, In-app preferences |
| Preferences | Units, Language, Timezone |
| Privacy | Profile visibility, Activity sharing |
| Linked Accounts | DUPR, Social logins |
| App | Clear cache, Data usage, About |
| Support | Help center, Contact, Report bug |

**Notification Settings Granularity:**

| Notification Type | Push | Email | In-App |
|-------------------|------|-------|--------|
| Game invites | Toggle | Toggle | Toggle |
| Game reminders | Toggle | Toggle | Toggle |
| Friend requests | Toggle | Toggle | Toggle |
| Friend activity | Toggle | - | Toggle |
| Club announcements | Toggle | Toggle | Toggle |
| League updates | Toggle | Toggle | Toggle |
| Tournament updates | Toggle | Toggle | Toggle |
| Achievement unlocks | Toggle | - | Toggle |
| Rating changes | Toggle | - | Toggle |

### 2.13 Notifications

**Notification Categories:**

| Category | Examples |
|----------|----------|
| Games | Invites, reminders, results confirmed |
| Social | Friend requests, mentions, kudos |
| Clubs | Announcements, events, membership |
| Leagues | Match scheduled, results, standings |
| Tournaments | Registration, brackets, matches |
| Achievements | Unlocks, progress milestones |
| System | App updates, policy changes |

**Notification Card Format:**

```
┌─────────────────────────────────────┐
│ [Icon] Title                   Time │
│        Description text             │
│        [Action Button] (optional)   │
└─────────────────────────────────────┘
```

---

## 3. State Management

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Application                       │
├─────────────────────────────────────────────────────┤
│  Global State (Zustand)                             │
│  ├── Auth Store (user, tokens, permissions)         │
│  ├── UI Store (modals, toasts, theme)               │
│  └── App Store (offline status, feature flags)      │
├─────────────────────────────────────────────────────┤
│  Server State (TanStack Query)                      │
│  ├── Queries (cached server data)                   │
│  ├── Mutations (server state changes)               │
│  └── Optimistic Updates                             │
├─────────────────────────────────────────────────────┤
│  Local State (React useState/useReducer)            │
│  ├── Form state                                     │
│  ├── UI interactions                                │
│  └── Component-specific state                       │
├─────────────────────────────────────────────────────┤
│  Offline State (IndexedDB + Service Worker)         │
│  ├── Cached queries                                 │
│  ├── Pending mutations                              │
│  └── Local-first data                               │
└─────────────────────────────────────────────────────┘
```

### 3.2 Global State Structure (Zustand)

```typescript
// Auth Store
interface AuthStore {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

// UI Store
interface UIStore {
  // Theme
  theme: 'light' | 'dark' | 'system';

  // Modals
  activeModal: ModalType | null;
  modalProps: Record<string, unknown>;

  // Toasts
  toasts: Toast[];

  // Navigation
  bottomNavVisible: boolean;
  headerConfig: HeaderConfig;

  // Actions
  setTheme: (theme: Theme) => void;
  openModal: (type: ModalType, props?: object) => void;
  closeModal: () => void;
  showToast: (toast: ToastConfig) => void;
  dismissToast: (id: string) => void;
}

// App Store
interface AppStore {
  // Offline
  isOnline: boolean;
  pendingSyncs: number;

  // Feature Flags
  features: FeatureFlags;

  // Location
  currentLocation: Coordinates | null;
  locationPermission: PermissionState;

  // Actions
  setOnlineStatus: (status: boolean) => void;
  requestLocation: () => Promise<void>;
  checkFeatureFlag: (flag: string) => boolean;
}
```

### 3.3 Server State Patterns (TanStack Query)

**Query Key Structure:**

```typescript
// Hierarchical key structure for cache management
const queryKeys = {
  // User
  user: ['user'] as const,
  userProfile: (id: string) => ['user', id] as const,
  userGames: (id: string) => ['user', id, 'games'] as const,
  userStats: (id: string) => ['user', id, 'stats'] as const,

  // Courts
  courts: ['courts'] as const,
  courtSearch: (filters: CourtFilters) => ['courts', 'search', filters] as const,
  courtDetail: (id: string) => ['courts', id] as const,
  courtReviews: (id: string) => ['courts', id, 'reviews'] as const,

  // Games
  games: ['games'] as const,
  gameSearch: (filters: GameFilters) => ['games', 'search', filters] as const,
  gameDetail: (id: string) => ['games', id] as const,

  // Social
  friends: ['friends'] as const,
  friendRequests: ['friends', 'requests'] as const,
  activityFeed: ['feed'] as const,

  // Clubs
  clubs: ['clubs'] as const,
  clubDetail: (id: string) => ['clubs', id] as const,
  clubMembers: (id: string) => ['clubs', id, 'members'] as const,

  // Leagues
  leagues: ['leagues'] as const,
  leagueDetail: (id: string) => ['leagues', id] as const,
  leagueStandings: (id: string) => ['leagues', id, 'standings'] as const,

  // Tournaments
  tournaments: ['tournaments'] as const,
  tournamentDetail: (id: string) => ['tournaments', id] as const,
  tournamentBrackets: (id: string) => ['tournaments', id, 'brackets'] as const,

  // Achievements
  achievements: ['achievements'] as const,

  // Notifications
  notifications: ['notifications'] as const,
};
```

**Stale Time Configuration:**

| Data Type | Stale Time | Cache Time | Refetch Strategy |
|-----------|------------|------------|------------------|
| User Profile | 5 min | 30 min | On focus |
| Court List | 15 min | 60 min | Manual |
| Game List | 1 min | 10 min | On focus |
| Activity Feed | 30 sec | 5 min | On focus, interval |
| Notifications | 30 sec | 5 min | On focus, push |
| Standings | 5 min | 30 min | On focus |
| Brackets | 1 min | 10 min | WebSocket |

**Optimistic Update Example:**

```typescript
const useLogGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logGame,
    onMutate: async (newGame) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.userGames(userId) });

      // Snapshot previous value
      const previousGames = queryClient.getQueryData(queryKeys.userGames(userId));

      // Optimistically update
      queryClient.setQueryData(queryKeys.userGames(userId), (old) => [
        { ...newGame, id: 'temp-' + Date.now(), pending: true },
        ...old,
      ]);

      return { previousGames };
    },
    onError: (err, newGame, context) => {
      // Rollback on error
      queryClient.setQueryData(
        queryKeys.userGames(userId),
        context.previousGames
      );
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.userGames(userId) });
    },
  });
};
```

### 3.4 Local State Patterns

**Form State (React Hook Form):**

```typescript
// Complex form with validation
const useGameLogForm = () => {
  return useForm<GameLogInput>({
    resolver: zodResolver(gameLogSchema),
    defaultValues: {
      type: 'doubles',
      score: { player: 0, opponent: 0 },
      players: [],
    },
  });
};
```

**UI Interaction State:**

```typescript
// Component-level UI state
const [isExpanded, setIsExpanded] = useState(false);
const [activeTab, setActiveTab] = useState<TabId>('overview');
const [selectedFilters, setSelectedFilters] = useState<Filters>(defaultFilters);
```

### 3.5 Offline State Sync

**IndexedDB Schema:**

```typescript
// Database schema for offline storage
const dbSchema = {
  version: 1,
  stores: {
    // Cached server data
    courts: { keyPath: 'id', indexes: ['location'] },
    games: { keyPath: 'id', indexes: ['userId', 'createdAt'] },
    users: { keyPath: 'id' },

    // Pending mutations
    pendingMutations: { keyPath: 'id', indexes: ['createdAt', 'type'] },

    // Local-first data
    draftGames: { keyPath: 'id', indexes: ['createdAt'] },
    offlineCheckins: { keyPath: 'id' },
  },
};
```

**Sync Strategy:**

```typescript
// Background sync registration
const registerBackgroundSync = async () => {
  if ('serviceWorker' in navigator && 'sync' in registration) {
    await registration.sync.register('sync-pending-mutations');
  }
};

// Mutation queue
interface PendingMutation {
  id: string;
  type: 'CREATE_GAME' | 'LOG_RESULT' | 'UPDATE_PROFILE' | ...;
  payload: unknown;
  createdAt: Date;
  retryCount: number;
}

// Sync handler
const syncPendingMutations = async () => {
  const pending = await db.pendingMutations.toArray();

  for (const mutation of pending) {
    try {
      await executeMutation(mutation);
      await db.pendingMutations.delete(mutation.id);
    } catch (error) {
      if (isNetworkError(error)) {
        // Retry later
        break;
      }
      // Mark as failed
      await db.pendingMutations.update(mutation.id, {
        retryCount: mutation.retryCount + 1
      });
    }
  }
};
```

---

## 4. PWA Implementation

### 4.1 Service Worker Strategy

**Caching Strategy by Resource Type:**

| Resource Type | Strategy | Max Age | Max Entries |
|---------------|----------|---------|-------------|
| App Shell (HTML) | Network First | - | 1 |
| JS/CSS Bundles | Cache First | 30 days | 50 |
| Static Assets | Cache First | 30 days | 100 |
| Images | Cache First | 7 days | 200 |
| API: User Data | Network First | 5 min | 50 |
| API: Court Data | Stale While Revalidate | 15 min | 100 |
| API: Static Lists | Cache First | 24 hours | 20 |

**Workbox Configuration:**

```typescript
// workbox-config.ts
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST);

// API routes - Network First with fallback
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/user'),
  new NetworkFirst({
    cacheName: 'user-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Court data - Stale While Revalidate
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/courts'),
  new StaleWhileRevalidate({
    cacheName: 'courts-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 15 * 60, // 15 minutes
      }),
    ],
  })
);

// Static assets - Cache First
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);
```

### 4.2 Offline Data Caching

**Critical Offline Data:**

| Data | Priority | Storage | Size Limit |
|------|----------|---------|------------|
| User profile | Critical | IndexedDB | N/A |
| Upcoming games | Critical | IndexedDB | 50 games |
| Favorite courts | High | IndexedDB | 20 courts |
| Friends list | High | IndexedDB | 500 users |
| Recent activity | Medium | IndexedDB | 100 items |
| Map tiles | Medium | Cache API | 50 MB |
| Notification history | Low | IndexedDB | 100 items |

**Offline Capabilities Matrix:**

| Feature | Offline Support | Sync Method |
|---------|-----------------|-------------|
| View profile | Full | Background sync |
| View game history | Full | Background sync |
| Log game (draft) | Full | Queue then sync |
| View courts | Partial (cached) | On reconnect |
| Find games | Read-only | On reconnect |
| Activity feed | Read-only | On reconnect |
| Send messages | Queue | Background sync |
| RSVP to game | Queue | Background sync |

### 4.3 Background Sync

**Sync Registration:**

```typescript
// Register sync events
const syncTypes = {
  'sync-games': handleGameSync,
  'sync-profile': handleProfileSync,
  'sync-activity': handleActivitySync,
  'sync-rsvp': handleRSVPSync,
};

self.addEventListener('sync', (event) => {
  const handler = syncTypes[event.tag];
  if (handler) {
    event.waitUntil(handler());
  }
});
```

**Conflict Resolution:**

| Conflict Type | Resolution Strategy |
|---------------|---------------------|
| Game result mismatch | Server authoritative, notify user |
| Profile update conflict | Last write wins with merge |
| RSVP status conflict | Server authoritative |
| Rating calculation | Server authoritative |

### 4.4 Push Notifications

**Notification Categories and Permissions:**

| Category | Default | User Controllable | Priority |
|----------|---------|-------------------|----------|
| Game invites | On | Yes | High |
| Game reminders | On | Yes | High |
| Friend requests | On | Yes | Normal |
| Achievement unlocks | On | Yes | Low |
| Club announcements | On | Yes | Normal |
| League updates | On | Yes | Normal |
| Tournament updates | On | Yes | High |
| System alerts | On | No | High |

**Push Payload Structure:**

```typescript
interface PushPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data: {
    url: string;           // Deep link URL
    entityId?: string;     // Related entity ID
    entityType?: string;   // Entity type for routing
    actions?: Action[];    // Quick actions
  };
  options: {
    tag?: string;          // Replace existing with same tag
    renotify?: boolean;    // Vibrate if replacing
    requireInteraction?: boolean;
    silent?: boolean;
  };
}
```

**Notification Actions:**

| Notification Type | Actions |
|-------------------|---------|
| Game Invite | Accept, Decline |
| Friend Request | Accept, View Profile |
| Game Reminder | View Game, Get Directions |
| Result Pending | Confirm, Dispute |

### 4.5 Install Prompts

**Install Prompt Strategy:**

| Trigger | When to Show | Frequency |
|---------|--------------|-----------|
| Organic prompt | After 5+ sessions | Once per user |
| Value-based prompt | After logging 3+ games | Once |
| Feature-based prompt | When using offline | Once per feature |
| Contextual prompt | Before tournament | Once per event |

**Install Prompt UI:**

```
┌─────────────────────────────────────┐
│  [App Icon]                         │
│  Install PickleBall App             │
│                                     │
│  - Access your games offline        │
│  - Get instant notifications        │
│  - Quick launch from home screen    │
│                                     │
│  [Not Now]        [Install]         │
└─────────────────────────────────────┘
```

**A2HS (Add to Home Screen) Requirements:**
- Valid web app manifest
- Service worker with fetch handler
- HTTPS
- User engagement heuristic met

---

## 5. UI/UX Patterns

### 5.1 Design System Tokens

**Color Palette:**

```typescript
const colors = {
  // Primary Brand
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',  // Primary
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },

  // Secondary (Court surface inspired)
  secondary: {
    50: '#E3F2FD',
    100: '#BBDEFB',
    200: '#90CAF9',
    300: '#64B5F6',
    400: '#42A5F5',
    500: '#2196F3',  // Secondary
    600: '#1E88E5',
    700: '#1976D2',
    800: '#1565C0',
    900: '#0D47A1',
  },

  // Semantic Colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Neutrals
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Surface Colors
  surface: {
    background: '#FFFFFF',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    modal: '#FFFFFF',
  },

  // Dark Mode Variants
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    elevated: '#2D2D2D',
  },
};
```

**Typography Scale:**

```typescript
const typography = {
  // Font Families
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },

  // Font Sizes (rem)
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Presets
  presets: {
    h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.25 },
    h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.25 },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.25 },
    body: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },
    bodySmall: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5 },
    button: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1 },
  },
};
```

**Spacing Scale:**

```typescript
const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
};
```

**Border Radius:**

```typescript
const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  full: '9999px',
};
```

**Shadows:**

```typescript
const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};
```

### 5.2 Responsive Breakpoints

```typescript
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet portrait
  lg: '1024px',  // Tablet landscape / small desktop
  xl: '1280px',  // Desktop
  '2xl': '1536px', // Large desktop
};

// Component adaptation by breakpoint
const responsivePatterns = {
  navigation: {
    mobile: 'BottomNav (5 items)',
    tablet: 'SideNav collapsed + TopHeader',
    desktop: 'SideNav expanded + TopHeader',
  },
  layout: {
    mobile: 'Single column, full width',
    tablet: 'Two column where appropriate',
    desktop: 'Three column with sidebar',
  },
  lists: {
    mobile: 'Cards, vertical scroll',
    tablet: 'Cards, 2-column grid',
    desktop: 'Table or 3-column grid',
  },
};
```

**Container Max Widths:**

| Breakpoint | Container Max Width |
|------------|---------------------|
| Default | 100% |
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1400px |

### 5.3 Loading States

**Loading Pattern by Context:**

| Context | Pattern | Duration Threshold |
|---------|---------|-------------------|
| Initial page load | Skeleton screen | > 200ms |
| Data refresh | Spinner overlay | > 500ms |
| Button action | Button loading state | > 100ms |
| Infinite scroll | List item skeletons | > 200ms |
| Background sync | Toast notification | N/A |
| Form submission | Button + form disable | > 100ms |

**Skeleton Components:**

```typescript
// Card skeleton
const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-40 bg-gray-200 rounded-t-lg" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

// List item skeleton
const ListItemSkeleton = () => (
  <div className="flex items-center space-x-4 animate-pulse">
    <div className="w-12 h-12 bg-gray-200 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);
```

### 5.4 Error Handling

**Error Categories and Responses:**

| Error Type | User Message | Action |
|------------|--------------|--------|
| Network offline | "You're offline. Some features may be limited." | Show banner, enable offline mode |
| API 401 | "Session expired" | Redirect to login |
| API 403 | "You don't have permission" | Show error, suggest action |
| API 404 | "This [item] couldn't be found" | Show empty state |
| API 500 | "Something went wrong. Please try again." | Show retry button |
| Validation | Inline field errors | Highlight fields |
| Rate limit | "Too many requests. Please wait." | Show countdown |

**Error Boundary Strategy:**

```typescript
// Error boundary hierarchy
<RootErrorBoundary>      {/* Catches catastrophic errors */}
  <LayoutErrorBoundary>  {/* Catches layout-level errors */}
    <PageErrorBoundary>  {/* Catches page-level errors */}
      <FeatureErrorBoundary> {/* Catches feature-level errors */}
        <Component />
      </FeatureErrorBoundary>
    </PageErrorBoundary>
  </LayoutErrorBoundary>
</RootErrorBoundary>
```

**Error UI Components:**

```
┌─────────────────────────────────────┐
│  [Error Icon]                       │
│                                     │
│  Something went wrong               │
│                                     │
│  We couldn't load your games.       │
│  This might be a temporary issue.   │
│                                     │
│  [Try Again]    [Go Home]           │
└─────────────────────────────────────┘
```

### 5.5 Empty States

**Empty State Templates:**

| Context | Icon | Title | Description | CTA |
|---------|------|-------|-------------|-----|
| No games logged | Paddle icon | No games yet | Start tracking your pickleball journey | Log Your First Game |
| No friends | People icon | Find your community | Connect with other players in your area | Find Players |
| No upcoming games | Calendar icon | Nothing scheduled | Find a game or create your own | Find a Game |
| No results (search) | Search icon | No results found | Try adjusting your filters | Clear Filters |
| Empty notifications | Bell icon | All caught up | You'll see updates here | - |
| No clubs joined | Building icon | Join a club | Connect with local pickleball communities | Browse Clubs |

**Empty State Component:**

```
┌─────────────────────────────────────┐
│                                     │
│         [Illustration]              │
│                                     │
│      No games logged yet            │
│                                     │
│  Track your progress and see your   │
│  improvement over time.             │
│                                     │
│     [Log Your First Game]           │
│                                     │
└─────────────────────────────────────┘
```

### 5.6 Accessibility Requirements (WCAG 2.1 AA)

**Color Contrast Requirements:**

| Element | Minimum Contrast | Our Implementation |
|---------|------------------|-------------------|
| Normal text | 4.5:1 | 7:1 (gray-900 on white) |
| Large text (18px+) | 3:1 | 4.5:1 |
| UI components | 3:1 | 4.5:1 |
| Non-text contrast | 3:1 | 4.5:1 |

**Interactive Element Requirements:**

| Requirement | Implementation |
|-------------|----------------|
| Touch target size | Minimum 44x44px |
| Focus indicators | 2px solid primary outline |
| Keyboard navigation | All interactive elements focusable |
| Screen reader labels | aria-label on icon-only buttons |
| Form labels | Associated label for every input |
| Error identification | Color + icon + text |
| Skip links | "Skip to main content" link |

**Specific Implementations:**

```typescript
// Focus-visible styles
const focusStyles = `
  focus:outline-none
  focus-visible:ring-2
  focus-visible:ring-primary-500
  focus-visible:ring-offset-2
`;

// Screen reader only text
const srOnly = `
  absolute w-px h-px p-0 -m-px
  overflow-hidden clip-rect(0,0,0,0)
  whitespace-nowrap border-0
`;

// Touch target padding
const touchTarget = `
  min-h-[44px] min-w-[44px]
  flex items-center justify-center
`;
```

**Motion and Animation:**

```typescript
// Respect reduced motion preference
const motionSafe = {
  transition: 'prefers-reduced-motion: no-preference',
  animation: 'prefers-reduced-motion: no-preference',
};

// CSS implementation
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Age-Friendly Considerations (35+ median user age):**

| Feature | Implementation |
|---------|----------------|
| Font size | Base 16px, scalable up to 24px |
| Contrast | High contrast mode available |
| Touch targets | Larger than minimum (48px) |
| Labels | Always visible, not placeholder-only |
| Error messages | Clear, specific, non-technical |
| Undo actions | Confirmation + undo for destructive actions |

---

## 6. Key User Flows

### 6.1 New User Onboarding

**Flow Diagram:**

```
[App Launch]
    │
    ▼
[Welcome Screen]
    │ "Get Started"
    ▼
[Skill Assessment]
    │ Select level 1-5
    ▼
[Play Preferences]
    │ Casual/Competitive, Singles/Doubles
    ▼
[Location Permission]
    │ Allow / Skip
    ▼
[Completion Screen]
    │ "Find a Game" / "Explore Courts"
    ▼
[Dashboard]
```

**Screen Wireframes:**

**1. Welcome Screen:**
```
┌─────────────────────────────────────┐
│                                     │
│         [App Logo]                  │
│                                     │
│    Welcome to PickleApp             │
│                                     │
│  Find courts, games, and players    │
│  in your area.                      │
│                                     │
│  Trusted by 50,000+ players         │
│                                     │
│                                     │
│       [Get Started]                 │
│                                     │
│       Already have an account?      │
│            [Sign In]                │
└─────────────────────────────────────┘
```

**2. Skill Assessment:**
```
┌─────────────────────────────────────┐
│  [Back]              Step 1 of 4    │
├─────────────────────────────────────┤
│                                     │
│  What's your skill level?           │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ ○ Just Starting              │    │
│  │   Never played or brand new  │    │
│  ├─────────────────────────────┤    │
│  │ ● Learning                   │    │
│  │   Know basics, still learning│    │
│  ├─────────────────────────────┤    │
│  │ ○ Intermediate               │    │
│  │   Play regularly, comfortable│    │
│  ├─────────────────────────────┤    │
│  │ ○ Advanced                   │    │
│  │   Competitive, play leagues  │    │
│  ├─────────────────────────────┤    │
│  │ ○ Expert                     │    │
│  │   Tournament level           │    │
│  └─────────────────────────────┘    │
│                                     │
│         [Continue]                  │
│            Skip                     │
└─────────────────────────────────────┘
```

**3. Play Preferences:**
```
┌─────────────────────────────────────┐
│  [Back]              Step 2 of 4    │
├─────────────────────────────────────┤
│                                     │
│  How do you like to play?           │
│                                     │
│  Play Style:                        │
│  [Casual ▼] [Competitive ▼]         │
│                                     │
│  Preferred Format:                  │
│  [ ] Singles                        │
│  [x] Doubles                        │
│  [x] Mixed Doubles                  │
│                                     │
│  When do you usually play?          │
│  [ ] Mornings  [x] Evenings         │
│  [x] Weekdays  [x] Weekends         │
│                                     │
│         [Continue]                  │
│            Skip                     │
└─────────────────────────────────────┘
```

**4. Location Permission:**
```
┌─────────────────────────────────────┐
│  [Back]              Step 3 of 4    │
├─────────────────────────────────────┤
│                                     │
│       [Location Icon]               │
│                                     │
│  Find courts near you               │
│                                     │
│  Enable location to discover        │
│  courts and players in your area.   │
│                                     │
│  • Find nearby courts               │
│  • Match with local players         │
│  • Get directions easily            │
│                                     │
│                                     │
│      [Enable Location]              │
│                                     │
│         Maybe later                 │
└─────────────────────────────────────┘
```

**5. Completion:**
```
┌─────────────────────────────────────┐
│                     Step 4 of 4     │
├─────────────────────────────────────┤
│                                     │
│       [Checkmark Icon]              │
│                                     │
│     You're all set!                 │
│                                     │
│  Your profile is ready.             │
│  Let's get you playing.             │
│                                     │
│                                     │
│      [Find a Game]                  │
│                                     │
│      [Explore Courts]               │
│                                     │
│      [Browse Community]             │
│                                     │
└─────────────────────────────────────┘
```

**Success Metrics:**
- Completion rate: Target 70%+
- Time to complete: Target < 2 minutes
- Location permission acceptance: Target 60%+

### 6.2 Finding and Joining a Game

**Flow Diagram:**

```
[Dashboard "Find a Game"]
    │
    ▼
[Game List/Map View]
    │ Apply filters
    ▼
[Filtered Results]
    │ Select game
    ▼
[Game Detail Modal/Page]
    │ "Join Game"
    ▼
[Confirmation]
    │
    ▼
[Add to Calendar prompt]
    │
    ▼
[Game added to "My Games"]
```

**Screen Wireframes:**

**1. Game Discovery:**
```
┌─────────────────────────────────────┐
│  Find a Game                    [x] │
├─────────────────────────────────────┤
│  [Search by location...]            │
│                                     │
│  Filters: [Date ▼] [Skill ▼] [+]    │
├─────────────────────────────────────┤
│  [List] [Map]            12 games   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ Central Park Courts    2.3mi│    │
│  │ Today, 6:00 PM              │    │
│  │ Doubles | 3.0-3.5 skill     │    │
│  │ 3/4 players                 │    │
│  │               [View] [Join] │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Riverside Courts       4.1mi│    │
│  │ Tomorrow, 9:00 AM           │    │
│  │ Singles | 2.5-3.0 skill     │    │
│  │ 1/2 players                 │    │
│  │               [View] [Join] │    │
│  └─────────────────────────────┘    │
│  ...                                │
├─────────────────────────────────────┤
│  [Create a Game]                    │
└─────────────────────────────────────┘
```

**2. Game Detail:**
```
┌─────────────────────────────────────┐
│  [Back]                   [Share]   │
├─────────────────────────────────────┤
│                                     │
│  Central Park Courts                │
│  Today, 6:00 PM - 8:00 PM           │
│                                     │
│  Doubles | Casual | 3.0-3.5 skill   │
│                                     │
├─────────────────────────────────────┤
│  Players (3/4)                      │
│  [Avatar] Mike T. (Host)   3.2      │
│  [Avatar] Sarah K.         3.4      │
│  [Avatar] John D.          3.1      │
│  [Empty slot]                       │
│                                     │
├─────────────────────────────────────┤
│  Notes from host:                   │
│  "Friendly game, all welcome.       │
│   Paddles available if needed."     │
│                                     │
├─────────────────────────────────────┤
│  Court Location                     │
│  [Mini Map]                         │
│  1234 Park Ave, City, State         │
│  [Get Directions]                   │
│                                     │
├─────────────────────────────────────┤
│         [Join This Game]            │
└─────────────────────────────────────┘
```

**3. Join Confirmation:**
```
┌─────────────────────────────────────┐
│                                     │
│       [Checkmark Icon]              │
│                                     │
│    You're in!                       │
│                                     │
│  Central Park Courts                │
│  Today at 6:00 PM                   │
│                                     │
│  [Add to Calendar]                  │
│                                     │
│  [Message Host]                     │
│                                     │
│  [View My Games]                    │
│                                     │
│         [Done]                      │
└─────────────────────────────────────┘
```

**Edge Cases:**
- Game is full: Show waitlist option
- Skill mismatch: Show warning, allow override
- Offline: Queue join request, sync when online
- Conflicting game: Show conflict, confirm intent

### 6.3 Logging a Game Result

**Flow Diagram:**

```
[Dashboard "Log Game"]
    │
    ▼
[Game Type Selection]
    │ Singles/Doubles
    ▼
[Player Selection]
    │ Search/Select opponents
    ▼
[Score Entry]
    │ Enter final score
    ▼
[Optional Details]
    │ Location, notes, photos
    ▼
[Confirmation]
    │
    ▼
[Result Summary + Share option]
```

**Screen Wireframes:**

**1. Game Type:**
```
┌─────────────────────────────────────┐
│  [Back]              Log a Game     │
├─────────────────────────────────────┤
│                                     │
│  What type of game?                 │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     [Singles Icon]          │    │
│  │        Singles              │    │
│  │         1v1                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     [Doubles Icon]          │    │
│  │        Doubles              │    │
│  │         2v2                 │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

**2. Player Selection (Doubles):**
```
┌─────────────────────────────────────┐
│  [Back]                    Doubles  │
├─────────────────────────────────────┤
│                                     │
│  Your Team                          │
│  [Avatar] You                       │
│  [+ Add Partner]                    │
│                                     │
│  ─────────────────────────          │
│                                     │
│  Opposing Team                      │
│  [+ Add Opponent]                   │
│  [+ Add Opponent]                   │
│                                     │
├─────────────────────────────────────┤
│  [Search players...]                │
│                                     │
│  Recent Players:                    │
│  [Avatar] Mike T.        [Add]      │
│  [Avatar] Sarah K.       [Add]      │
│  [Avatar] John D.        [Add]      │
│                                     │
│  [Add player not on app]            │
│                                     │
├─────────────────────────────────────┤
│         [Continue]                  │
└─────────────────────────────────────┘
```

**3. Score Entry:**
```
┌─────────────────────────────────────┐
│  [Back]                      Score  │
├─────────────────────────────────────┤
│                                     │
│  Final Score                        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Your Team                  │    │
│  │         [11]                │    │
│  │     ▲         ▼             │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Opponents                  │    │
│  │         [7]                 │    │
│  │     ▲         ▼             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [+ Add another game]               │
│                                     │
│  You won!                           │
│                                     │
├─────────────────────────────────────┤
│         [Continue]                  │
└─────────────────────────────────────┘
```

**4. Optional Details:**
```
┌─────────────────────────────────────┐
│  [Back]                    Details  │
├─────────────────────────────────────┤
│                                     │
│  Location (optional)                │
│  [Search or select court...]        │
│                                     │
│  When did you play?                 │
│  [Today ▼] [Just now ▼]             │
│                                     │
│  Notes (optional)                   │
│  [Add notes about the game...]      │
│                                     │
│  Photo (optional)                   │
│  [+ Add photo]                      │
│                                     │
│  Request verification?              │
│  [Toggle: Off]                      │
│  Send to opponents to confirm       │
│                                     │
├─────────────────────────────────────┤
│         [Log Game]                  │
│            Skip details             │
└─────────────────────────────────────┘
```

**5. Result Summary:**
```
┌─────────────────────────────────────┐
│                                     │
│       [Trophy Icon]                 │
│                                     │
│        Victory!                     │
│                                     │
│  You & Partner: 11                  │
│  Opponents: 7                       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 7-day streak!           🔥  │    │
│  │ +15 XP earned               │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Share to Feed]                    │
│                                     │
│  [View Updated Stats]               │
│                                     │
│         [Done]                      │
└─────────────────────────────────────┘
```

**Time Target:** Complete basic log in < 30 seconds

### 6.4 Creating a Tournament

**Flow Diagram:**

```
[Club/Admin Dashboard]
    │ "Create Tournament"
    ▼
[Basic Info]
    │ Name, dates, location
    ▼
[Format Selection]
    │ Bracket type, divisions
    ▼
[Division Setup]
    │ Skill levels, events
    ▼
[Registration Settings]
    │ Fees, limits, deadlines
    ▼
[Review & Publish]
    │
    ▼
[Tournament Created]
    │ Share options
    ▼
[Tournament Management Dashboard]
```

**Screen Wireframes:**

**1. Basic Info:**
```
┌─────────────────────────────────────┐
│  [Cancel]     Create Tournament     │
├─────────────────────────────────────┤
│  Step 1 of 5: Basic Info            │
│  ════════════════════════           │
│                                     │
│  Tournament Name *                  │
│  [Spring Open Championship    ]     │
│                                     │
│  Dates *                            │
│  [Mar 15, 2026] to [Mar 17, 2026]   │
│                                     │
│  Location *                         │
│  [Search venue or court...]         │
│                                     │
│  Description                        │
│  [Add tournament description...]    │
│                                     │
│  Cover Image                        │
│  [+ Upload image]                   │
│                                     │
├─────────────────────────────────────┤
│         [Continue]                  │
└─────────────────────────────────────┘
```

**2. Format Selection:**
```
┌─────────────────────────────────────┐
│  [Back]         Create Tournament   │
├─────────────────────────────────────┤
│  Step 2 of 5: Format                │
│  ══════════════════                 │
│                                     │
│  Tournament Format *                │
│  ┌─────────────────────────────┐    │
│  │ ○ Single Elimination         │    │
│  │ ● Double Elimination         │    │
│  │ ○ Round Robin               │    │
│  │ ○ Pool Play + Playoffs      │    │
│  │ ○ Swiss System              │    │
│  └─────────────────────────────┘    │
│                                     │
│  Games per Match                    │
│  [Best of 3 ▼]                      │
│                                     │
│  Game Point                         │
│  [11 ▼] win by [2 ▼]                │
│                                     │
│  DUPR Results Submission            │
│  [Toggle: On]                       │
│                                     │
├─────────────────────────────────────┤
│         [Continue]                  │
└─────────────────────────────────────┘
```

**3. Division Setup:**
```
┌─────────────────────────────────────┐
│  [Back]         Create Tournament   │
├─────────────────────────────────────┤
│  Step 3 of 5: Divisions             │
│  ════════════════════               │
│                                     │
│  Add Divisions                      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Men's Doubles 3.0-3.5       │    │
│  │ 16 teams max | $40/team     │    │
│  │                      [Edit] │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Women's Doubles 3.0-3.5     │    │
│  │ 16 teams max | $40/team     │    │
│  │                      [Edit] │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Mixed Doubles 3.0-3.5       │    │
│  │ 16 teams max | $40/team     │    │
│  │                      [Edit] │    │
│  └─────────────────────────────┘    │
│                                     │
│  [+ Add Division]                   │
│                                     │
├─────────────────────────────────────┤
│         [Continue]                  │
└─────────────────────────────────────┘
```

**4. Registration Settings:**
```
┌─────────────────────────────────────┐
│  [Back]         Create Tournament   │
├─────────────────────────────────────┤
│  Step 4 of 5: Registration          │
│  ══════════════════════             │
│                                     │
│  Registration Opens *               │
│  [Feb 1, 2026]                      │
│                                     │
│  Registration Closes *              │
│  [Mar 10, 2026]                     │
│                                     │
│  Waitlist                           │
│  [Toggle: On]                       │
│                                     │
│  Partner Finding                    │
│  [Toggle: On] Allow players to      │
│  register and find partners         │
│                                     │
│  Refund Policy                      │
│  [Full refund until ▼] [Mar 1]      │
│  [50% refund until ▼] [Mar 8]       │
│                                     │
│  Additional Info Required           │
│  [ ] T-shirt size                   │
│  [ ] Emergency contact              │
│  [ ] Dietary restrictions           │
│                                     │
├─────────────────────────────────────┤
│         [Continue]                  │
└─────────────────────────────────────┘
```

**5. Review & Publish:**
```
┌─────────────────────────────────────┐
│  [Back]         Create Tournament   │
├─────────────────────────────────────┤
│  Step 5 of 5: Review                │
│  ════════════════════               │
│                                     │
│  Spring Open Championship           │
│  Mar 15-17, 2026                    │
│  Central Sports Complex             │
│                                     │
│  Format: Double Elimination         │
│  3 Divisions | 48 team capacity     │
│  $40 per team                       │
│                                     │
│  Registration: Feb 1 - Mar 10       │
│  DUPR submission: Enabled           │
│                                     │
│  ─────────────────────────          │
│                                     │
│  Visibility                         │
│  ○ Public (anyone can view)         │
│  ● Unlisted (link only)             │
│  ○ Private (invite only)            │
│                                     │
├─────────────────────────────────────┤
│  [Save as Draft]                    │
│         [Publish Tournament]        │
└─────────────────────────────────────┘
```

### 6.5 Managing a Club

**Flow Diagram:**

```
[Club Dashboard]
    │
    ├── Members Tab
    │   ├── View members
    │   ├── Approve requests
    │   ├── Manage roles
    │   └── Remove members
    │
    ├── Events Tab
    │   ├── Create event
    │   ├── Manage RSVPs
    │   └── Send reminders
    │
    ├── Announcements Tab
    │   ├── Post announcement
    │   └── View engagement
    │
    └── Settings Tab
        ├── Club info
        ├── Membership rules
        └── Permissions
```

**Screen Wireframes:**

**1. Club Dashboard:**
```
┌─────────────────────────────────────┐
│  [Back]    Riverside Pickleball     │
│                        Club Admin   │
├─────────────────────────────────────┤
│  Quick Stats                        │
│  [156]     [23]      [4]     [89%]  │
│  Members   Active    Events  Engage │
├─────────────────────────────────────┤
│  [Members] [Events] [Posts] [⚙️]    │
├─────────────────────────────────────┤
│                                     │
│  Pending Actions                    │
│  ┌─────────────────────────────┐    │
│  │ 3 membership requests       │    │
│  │ 2 event RSVPs to confirm    │    │
│  │                    [View]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  Upcoming Events                    │
│  ┌─────────────────────────────┐    │
│  │ Weekly Open Play            │    │
│  │ Tomorrow, 6PM | 18/24 spots │    │
│  │               [Manage]      │    │
│  └─────────────────────────────┘    │
│                                     │
│  [+ Create Event]                   │
│  [+ Post Announcement]              │
│                                     │
└─────────────────────────────────────┘
```

**2. Member Management:**
```
┌─────────────────────────────────────┐
│  [Back]              Members (156)  │
├─────────────────────────────────────┤
│  [Search members...]                │
│                                     │
│  [All] [Admins] [Pending] [Active]  │
├─────────────────────────────────────┤
│  Pending Requests (3)               │
│  ┌─────────────────────────────┐    │
│  │ [Avatar] Jane S.    3.2     │    │
│  │ Requested 2 days ago        │    │
│  │      [Approve] [Decline]    │    │
│  └─────────────────────────────┘    │
│                                     │
│  Admins (4)                         │
│  ┌─────────────────────────────┐    │
│  │ [Avatar] You (Owner)        │    │
│  │ [Avatar] Mike T. (Admin)    │    │
│  │ [Avatar] Sarah K. (Admin)   │    │
│  │ [Avatar] John D. (Admin)    │    │
│  └─────────────────────────────┘    │
│                                     │
│  Members (149)                      │
│  ┌─────────────────────────────┐    │
│  │ [Avatar] Alex R.     [•••]  │    │
│  │ Joined Mar 2025 | 12 events │    │
│  └─────────────────────────────┘    │
│  ...                                │
└─────────────────────────────────────┘
```

**3. Create Event:**
```
┌─────────────────────────────────────┐
│  [Cancel]           Create Event    │
├─────────────────────────────────────┤
│                                     │
│  Event Name *                       │
│  [Weekly Open Play           ]      │
│                                     │
│  Event Type                         │
│  [Open Play ▼]                      │
│                                     │
│  Date & Time *                      │
│  [Mar 20, 2026] [6:00 PM]           │
│  Duration: [2 hours ▼]              │
│                                     │
│  Location *                         │
│  [Club Courts (default) ▼]          │
│                                     │
│  Capacity                           │
│  [24] players max                   │
│                                     │
│  Skill Level                        │
│  [All levels ▼]                     │
│                                     │
│  Recurring                          │
│  [Toggle: On]                       │
│  [Weekly ▼] on [Thursday ▼]         │
│                                     │
│  Description                        │
│  [Add event details...]             │
│                                     │
├─────────────────────────────────────┤
│         [Create Event]              │
└─────────────────────────────────────┘
```

**4. Club Settings:**
```
┌─────────────────────────────────────┐
│  [Back]            Club Settings    │
├─────────────────────────────────────┤
│                                     │
│  CLUB INFORMATION                   │
│  ┌─────────────────────────────┐    │
│  │ Name, description, logo     │    │
│  │ Location, contact info      │    │
│  │                      [Edit] │    │
│  └─────────────────────────────┘    │
│                                     │
│  MEMBERSHIP                         │
│  ┌─────────────────────────────┐    │
│  │ Join policy: [Approval ▼]   │    │
│  │ Skill requirement: [None ▼] │    │
│  │ Max members: [Unlimited ▼]  │    │
│  └─────────────────────────────┘    │
│                                     │
│  PRIVACY                            │
│  ┌─────────────────────────────┐    │
│  │ Visibility: [Public ▼]      │    │
│  │ Show members: [Toggle: On]  │    │
│  │ Show events: [Toggle: On]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  NOTIFICATIONS                      │
│  ┌─────────────────────────────┐    │
│  │ New members: [Toggle: On]   │    │
│  │ Event RSVPs: [Toggle: On]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ─────────────────────────          │
│  [Delete Club]                      │
│                                     │
└─────────────────────────────────────┘
```

---

## Appendix A: Component Library Reference

### Button Variants

| Variant | Use Case | Style |
|---------|----------|-------|
| Primary | Main CTA | Filled, primary color |
| Secondary | Secondary actions | Outlined, primary color |
| Tertiary | Tertiary actions | Text only, primary color |
| Destructive | Delete, remove | Filled/outlined, error color |
| Ghost | Subtle actions | Text only, gray |

### Card Patterns

| Type | Use Case | Features |
|------|----------|----------|
| Basic | Simple content | Padding, shadow |
| Interactive | Clickable items | Hover state, cursor |
| Selectable | Multi-select | Checkbox, selection state |
| Expandable | Detail reveal | Expand/collapse |
| Media | Image content | Image header |

### Form Patterns

| Pattern | Implementation |
|---------|----------------|
| Inline validation | Show errors on blur |
| Form-level errors | Show at top of form |
| Required fields | Asterisk + aria-required |
| Character counts | Show for limited fields |
| Password strength | Visual indicator |

---

## Appendix B: Animation Guidelines

**Transition Durations:**

| Type | Duration | Easing |
|------|----------|--------|
| Micro (hover, focus) | 100-150ms | ease-out |
| Small (buttons, toggles) | 150-200ms | ease-out |
| Medium (modals, drawers) | 200-300ms | ease-in-out |
| Large (page transitions) | 300-400ms | ease-in-out |

**Motion Principles:**
1. Purposeful - animations serve a function
2. Quick - never delay the user
3. Natural - follow physics (ease curves)
4. Consistent - same actions, same animations

---

## Appendix C: Icon System

**Icon Library:** Lucide React (MIT licensed)

**Icon Sizes:**

| Size | Use Case | Pixels |
|------|----------|--------|
| xs | Inline text | 12px |
| sm | Compact UI | 16px |
| md | Standard | 20px |
| lg | Buttons, emphasis | 24px |
| xl | Feature icons | 32px |
| 2xl | Empty states | 48px |

**Custom Icons Needed:**
- Pickleball paddle
- Pickleball (ball)
- Court layout
- DUPR logo (brand guideline compliant)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2026 | Architecture Team | Initial document |

---

*This document serves as the source of truth for frontend implementation. All component development should reference this architecture.*
