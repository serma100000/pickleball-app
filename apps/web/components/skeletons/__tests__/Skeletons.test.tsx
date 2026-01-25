/**
 * Unit Tests for Skeleton Components
 *
 * Tests cover:
 * - DashboardSkeleton renders without errors
 * - GameListSkeleton renders without errors
 * - LeagueListSkeleton renders without errors
 * - TournamentListSkeleton renders without errors
 * - Individual skeleton components render correctly
 * - Animate-pulse class is applied
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardSkeleton, GameRowSkeleton, LeagueRowSkeleton, QuickActionSkeleton } from '../DashboardSkeleton';
import { GameListSkeleton, GameRowSkeleton as GameListRowSkeleton, GameStatsSkeleton, GameFiltersSkeleton } from '../GameListSkeleton';
import { LeagueListSkeleton, LeagueCardSkeleton, LeagueStatsSkeleton, LeagueTabsSkeleton } from '../LeagueListSkeleton';
import { TournamentListSkeleton, TournamentCardSkeleton, TournamentStatsSkeleton, TournamentTabsSkeleton } from '../TournamentListSkeleton';

describe('DashboardSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<DashboardSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<DashboardSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render stat card skeletons', () => {
    const { container } = render(<DashboardSkeleton />);

    // Should have 4 stat card skeletons
    const statCards = container.querySelectorAll('.grid.grid-cols-2 > div');
    expect(statCards.length).toBe(4);
  });

  it('should render quick action skeletons', () => {
    const { container } = render(<DashboardSkeleton />);

    // Should have quick action skeletons in the second grid
    const quickActionGrid = container.querySelectorAll('.grid.md\\:grid-cols-2');
    expect(quickActionGrid.length).toBeGreaterThan(0);
  });

  it('should render game row skeletons', () => {
    const { container } = render(<DashboardSkeleton />);

    // Should have game row skeletons
    const gameRows = container.querySelectorAll('.divide-y > div');
    expect(gameRows.length).toBeGreaterThan(0);
  });

  it('should render league row skeletons', () => {
    const { container } = render(<DashboardSkeleton />);

    // Check for league section
    const sections = container.querySelectorAll('.bg-white');
    expect(sections.length).toBeGreaterThan(0);
  });
});

describe('Dashboard GameRowSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<GameRowSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<GameRowSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render skeleton elements for game row layout', () => {
    const { container } = render(<GameRowSkeleton />);

    // Should have skeleton elements
    const skeletonElements = container.querySelectorAll('[class*="bg-gray"]');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should have flex layout for alignment', () => {
    const { container } = render(<GameRowSkeleton />);

    expect(container.querySelector('.flex.items-center.justify-between')).toBeInTheDocument();
  });
});

describe('Dashboard LeagueRowSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<LeagueRowSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<LeagueRowSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render skeleton elements for league name and status', () => {
    const { container } = render(<LeagueRowSkeleton />);

    const skeletonElements = container.querySelectorAll('[class*="bg-gray"]');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('should have skeleton for status badge (rounded-full)', () => {
    const { container } = render(<LeagueRowSkeleton />);

    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
  });
});

describe('QuickActionSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<QuickActionSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<QuickActionSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render icon skeleton with rounded-xl', () => {
    const { container } = render(<QuickActionSkeleton />);

    expect(container.querySelector('.rounded-xl')).toBeInTheDocument();
  });

  it('should have card styling', () => {
    const { container } = render(<QuickActionSkeleton />);

    expect(container.querySelector('.bg-white')).toBeInTheDocument();
    expect(container.querySelector('.border')).toBeInTheDocument();
  });
});

describe('GameListSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<GameListSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render multiple game row skeletons', () => {
    const { container } = render(<GameListSkeleton />);

    // Should render multiple rows
    const rows = container.querySelectorAll('.animate-pulse');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should render header skeleton', () => {
    const { container } = render(<GameListSkeleton />);

    // Should have header section
    const header = container.querySelector('.flex.flex-col.md\\:flex-row');
    expect(header).toBeInTheDocument();
  });

  it('should render stats skeleton', () => {
    const { container } = render(<GameListSkeleton />);

    // Should have stats grid
    const statsGrid = container.querySelector('.grid.grid-cols-2.lg\\:grid-cols-4');
    expect(statsGrid).toBeInTheDocument();
  });

  it('should have divider between rows', () => {
    const { container } = render(<GameListSkeleton />);

    expect(container.querySelector('.divide-y')).toBeInTheDocument();
  });
});

describe('GameRowSkeleton (from GameListSkeleton)', () => {
  it('should render without errors', () => {
    const { container } = render(<GameListRowSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<GameListRowSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('GameStatsSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<GameStatsSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render 4 stat cards', () => {
    const { container } = render(<GameStatsSkeleton />);

    const cards = container.querySelectorAll('.bg-white');
    expect(cards.length).toBe(4);
  });
});

describe('GameFiltersSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<GameFiltersSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<GameFiltersSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('LeagueListSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<LeagueListSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render multiple league card skeletons', () => {
    const { container } = render(<LeagueListSkeleton />);

    const rows = container.querySelectorAll('.animate-pulse');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should render header skeleton', () => {
    const { container } = render(<LeagueListSkeleton />);

    const header = container.querySelector('.flex.flex-col.md\\:flex-row');
    expect(header).toBeInTheDocument();
  });

  it('should render stats skeleton', () => {
    const { container } = render(<LeagueListSkeleton />);

    const statsGrid = container.querySelector('.grid.grid-cols-2.lg\\:grid-cols-4');
    expect(statsGrid).toBeInTheDocument();
  });
});

describe('LeagueCardSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<LeagueCardSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<LeagueCardSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should have card styling', () => {
    const { container } = render(<LeagueCardSkeleton />);

    expect(container.querySelector('.rounded-xl')).toBeInTheDocument();
    expect(container.querySelector('.border')).toBeInTheDocument();
  });
});

describe('LeagueStatsSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<LeagueStatsSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render 4 stat cards', () => {
    const { container } = render(<LeagueStatsSkeleton />);

    const cards = container.querySelectorAll('.bg-white');
    expect(cards.length).toBe(4);
  });
});

describe('LeagueTabsSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<LeagueTabsSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<LeagueTabsSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('TournamentListSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<TournamentListSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render multiple tournament card skeletons', () => {
    const { container } = render(<TournamentListSkeleton />);

    const rows = container.querySelectorAll('.animate-pulse');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should render header skeleton', () => {
    const { container } = render(<TournamentListSkeleton />);

    const header = container.querySelector('.flex.flex-col.md\\:flex-row');
    expect(header).toBeInTheDocument();
  });

  it('should render stats skeleton', () => {
    const { container } = render(<TournamentListSkeleton />);

    const statsGrid = container.querySelector('.grid.grid-cols-2.lg\\:grid-cols-4');
    expect(statsGrid).toBeInTheDocument();
  });
});

describe('TournamentCardSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<TournamentCardSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<TournamentCardSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should have card styling', () => {
    const { container } = render(<TournamentCardSkeleton />);

    expect(container.querySelector('.rounded-xl')).toBeInTheDocument();
    expect(container.querySelector('.border')).toBeInTheDocument();
  });

  it('should have progress bar skeleton', () => {
    const { container } = render(<TournamentCardSkeleton />);

    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
  });
});

describe('TournamentStatsSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<TournamentStatsSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render 4 stat cards', () => {
    const { container } = render(<TournamentStatsSkeleton />);

    const cards = container.querySelectorAll('.bg-white');
    expect(cards.length).toBe(4);
  });
});

describe('TournamentTabsSkeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<TournamentTabsSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<TournamentTabsSkeleton />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('Skeleton Animation', () => {
  it('all skeletons should use animate-pulse for loading indication', () => {
    const skeletons = [
      <DashboardSkeleton key="dashboard" />,
      <GameRowSkeleton key="gameRow" />,
      <LeagueRowSkeleton key="leagueRow" />,
      <QuickActionSkeleton key="quickAction" />,
    ];

    skeletons.forEach((skeleton) => {
      const { container } = render(skeleton);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });
});

describe('Skeleton Dark Mode', () => {
  it('DashboardSkeleton should have dark mode classes', () => {
    const { container } = render(<DashboardSkeleton />);

    expect(container.querySelector('[class*="dark:bg-gray"]')).toBeInTheDocument();
  });

  it('GameRowSkeleton should have dark mode classes', () => {
    const { container } = render(<GameRowSkeleton />);

    expect(container.querySelector('[class*="dark:bg-gray"]')).toBeInTheDocument();
  });

  it('LeagueRowSkeleton should have dark mode classes', () => {
    const { container } = render(<LeagueRowSkeleton />);

    expect(container.querySelector('[class*="dark:bg-gray"]')).toBeInTheDocument();
  });

  it('QuickActionSkeleton should have dark mode classes', () => {
    const { container } = render(<QuickActionSkeleton />);

    expect(container.querySelector('[class*="dark:bg-gray"]')).toBeInTheDocument();
  });

  it('GameListSkeleton should have dark mode classes', () => {
    const { container } = render(<GameListSkeleton />);

    expect(container.querySelector('[class*="dark:bg-gray"]')).toBeInTheDocument();
  });

  it('LeagueListSkeleton should have dark mode classes', () => {
    const { container } = render(<LeagueListSkeleton />);

    expect(container.querySelector('[class*="dark:bg-gray"]')).toBeInTheDocument();
  });

  it('TournamentListSkeleton should have dark mode classes', () => {
    const { container } = render(<TournamentListSkeleton />);

    expect(container.querySelector('[class*="dark:bg-gray"]')).toBeInTheDocument();
  });
});
