/**
 * Unit Tests for Empty State Components
 *
 * Tests cover:
 * - NoGames, NoGamesInline rendering
 * - NoTournaments, NoTournamentsFiltered, NoTournamentsInline rendering
 * - NoLeagues, NoLeaguesFiltered, NoLeaguesInline rendering
 * - NoNotifications, NoNotificationsInline, AllNotificationsRead, NoNotificationsPage rendering
 * - Props handling (compact, context, callbacks)
 * - Links and actions
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoGames, NoGamesInline } from '../NoGames';
import { NoTournaments, NoTournamentsFiltered, NoTournamentsInline } from '../NoTournaments';
import { NoLeagues, NoLeaguesFiltered, NoLeaguesInline } from '../NoLeagues';
import { NoNotifications, NoNotificationsInline, AllNotificationsRead, NoNotificationsPage } from '../NoNotifications';

describe('NoGames', () => {
  describe('Default Rendering', () => {
    it('should render title and description', () => {
      render(<NoGames />);

      expect(screen.getByText('No games logged yet')).toBeInTheDocument();
      expect(screen.getByText(/track your matches/i)).toBeInTheDocument();
    });

    it('should render primary action button with correct link', () => {
      render(<NoGames />);

      const link = screen.getByRole('link', { name: /log your first game/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/games/new');
    });

    it('should render feature highlights in non-compact mode', () => {
      render(<NoGames />);

      expect(screen.getByText('Win Rate')).toBeInTheDocument();
      expect(screen.getByText('Skill Rating')).toBeInTheDocument();
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    it('should hide feature highlights in compact mode', () => {
      render(<NoGames compact />);

      expect(screen.queryByText('Win Rate')).not.toBeInTheDocument();
      expect(screen.queryByText('Skill Rating')).not.toBeInTheDocument();
    });
  });

  describe('NoGamesInline', () => {
    it('should render compact version', () => {
      render(<NoGamesInline />);

      expect(screen.getByText('No games yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /log game/i })).toBeInTheDocument();
    });

    it('should have correct link', () => {
      render(<NoGamesInline />);

      expect(screen.getByRole('link', { name: /log game/i })).toHaveAttribute('href', '/games/new');
    });

    it('should have aria-hidden on icon', () => {
      render(<NoGamesInline />);

      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });
});

describe('NoTournaments', () => {
  describe('Manage Context (default)', () => {
    it('should render manage context title and description', () => {
      render(<NoTournaments />);

      expect(screen.getByText('No tournaments yet')).toBeInTheDocument();
      expect(screen.getByText(/create a tournament/i)).toBeInTheDocument();
    });

    it('should render both primary and secondary actions', () => {
      render(<NoTournaments />);

      expect(screen.getByRole('link', { name: /create tournament/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /browse tournaments/i })).toBeInTheDocument();
    });

    it('should render feature highlights in non-compact mode', () => {
      render(<NoTournaments />);

      expect(screen.getByText('Registration')).toBeInTheDocument();
      expect(screen.getByText('Scheduling')).toBeInTheDocument();
      expect(screen.getByText('Brackets')).toBeInTheDocument();
    });

    it('should have correct links', () => {
      render(<NoTournaments />);

      expect(screen.getByRole('link', { name: /create tournament/i })).toHaveAttribute('href', '/tournaments/new');
      expect(screen.getByRole('link', { name: /browse tournaments/i })).toHaveAttribute('href', '/tournaments/browse');
    });
  });

  describe('Browse Context', () => {
    it('should render browse context title and description', () => {
      render(<NoTournaments context="browse" />);

      expect(screen.getByText('No tournaments available')).toBeInTheDocument();
      expect(screen.getByText(/no tournaments in your area/i)).toBeInTheDocument();
    });

    it('should only render create tournament action', () => {
      render(<NoTournaments context="browse" />);

      expect(screen.getByRole('link', { name: /create tournament/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /browse tournaments/i })).not.toBeInTheDocument();
    });
  });

  describe('NoTournamentsFiltered', () => {
    it('should display filter label in description', () => {
      render(<NoTournamentsFiltered filterLabel="Doubles" />);

      expect(screen.getByText('No tournaments found')).toBeInTheDocument();
      expect(screen.getByText(/no tournaments match the "doubles" filter/i)).toBeInTheDocument();
    });

    it('should call onClearFilter when clear filter is clicked', () => {
      const onClearFilter = vi.fn();
      render(<NoTournamentsFiltered filterLabel="Doubles" onClearFilter={onClearFilter} />);

      fireEvent.click(screen.getByRole('button', { name: /clear filter/i }));

      expect(onClearFilter).toHaveBeenCalled();
    });

    it('should not show clear filter button when callback is not provided', () => {
      render(<NoTournamentsFiltered filterLabel="Doubles" />);

      expect(screen.queryByRole('button', { name: /clear filter/i })).not.toBeInTheDocument();
    });
  });

  describe('NoTournamentsInline', () => {
    it('should render compact version', () => {
      render(<NoTournamentsInline />);

      expect(screen.getByText('No tournaments')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /create/i })).toBeInTheDocument();
    });

    it('should have correct link', () => {
      render(<NoTournamentsInline />);

      expect(screen.getByRole('link', { name: /create/i })).toHaveAttribute('href', '/tournaments/new');
    });
  });
});

describe('NoLeagues', () => {
  describe('Browse Context (default)', () => {
    it('should render browse context title and description', () => {
      render(<NoLeagues />);

      expect(screen.getByText('No leagues available')).toBeInTheDocument();
      expect(screen.getByText(/no leagues in your area/i)).toBeInTheDocument();
    });

    it('should render create league action', () => {
      render(<NoLeagues />);

      expect(screen.getByRole('link', { name: /create league/i })).toHaveAttribute('href', '/leagues/new');
    });

    it('should render league format tags in non-compact mode', () => {
      render(<NoLeagues />);

      expect(screen.getByText('Ladder')).toBeInTheDocument();
      expect(screen.getByText('Round Robin')).toBeInTheDocument();
      expect(screen.getByText('Doubles')).toBeInTheDocument();
      expect(screen.getByText('Mixed Doubles')).toBeInTheDocument();
      expect(screen.getByText('Singles')).toBeInTheDocument();
    });
  });

  describe('Joined Context', () => {
    it('should render joined context title and description', () => {
      render(<NoLeagues context="joined" />);

      expect(screen.getByText('No leagues joined')).toBeInTheDocument();
      expect(screen.getByText(/join a league for regular/i)).toBeInTheDocument();
    });

    it('should use onBrowse callback when provided', () => {
      const onBrowse = vi.fn();
      render(<NoLeagues context="joined" onBrowse={onBrowse} />);

      fireEvent.click(screen.getByRole('button', { name: /browse leagues/i }));

      expect(onBrowse).toHaveBeenCalled();
    });

    it('should use link when onBrowse is not provided', () => {
      render(<NoLeagues context="joined" />);

      expect(screen.getByRole('link', { name: /browse leagues/i })).toHaveAttribute('href', '/leagues');
    });

    it('should render benefit highlights', () => {
      render(<NoLeagues context="joined" />);

      expect(screen.getByText('Improve Skills')).toBeInTheDocument();
      expect(screen.getByText('Meet Players')).toBeInTheDocument();
      expect(screen.getByText('Compete')).toBeInTheDocument();
    });
  });

  describe('NoLeaguesFiltered', () => {
    it('should display filter label in description', () => {
      render(<NoLeaguesFiltered filterLabel="Singles" />);

      expect(screen.getByText('No leagues found')).toBeInTheDocument();
      expect(screen.getByText(/no leagues match your "singles" filter/i)).toBeInTheDocument();
    });

    it('should call onClearFilter when clear filter is clicked', () => {
      const onClearFilter = vi.fn();
      render(<NoLeaguesFiltered filterLabel="Singles" onClearFilter={onClearFilter} />);

      fireEvent.click(screen.getByRole('button', { name: /clear filter/i }));

      expect(onClearFilter).toHaveBeenCalled();
    });
  });

  describe('NoLeaguesInline', () => {
    it('should render compact version', () => {
      render(<NoLeaguesInline />);

      expect(screen.getByText('No leagues joined')).toBeInTheDocument();
    });

    it('should use onBrowse callback when provided', () => {
      const onBrowse = vi.fn();
      render(<NoLeaguesInline onBrowse={onBrowse} />);

      fireEvent.click(screen.getByRole('button', { name: /browse/i }));

      expect(onBrowse).toHaveBeenCalled();
    });

    it('should use link when onBrowse is not provided', () => {
      render(<NoLeaguesInline />);

      expect(screen.getByRole('link', { name: /browse/i })).toHaveAttribute('href', '/leagues');
    });
  });
});

describe('NoNotifications', () => {
  describe('Default Rendering', () => {
    it('should render title and description', () => {
      render(<NoNotifications />);

      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      expect(screen.getByText(/we'll let you know when something happens/i)).toBeInTheDocument();
    });

    it('should render settings action', () => {
      render(<NoNotifications />);

      expect(screen.getByRole('link', { name: /notification settings/i })).toHaveAttribute('href', '/profile/notifications');
    });
  });

  describe('NoNotificationsInline', () => {
    it('should render compact version', () => {
      render(<NoNotificationsInline />);

      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      expect(screen.getByText(/we'll let you know when something happens/i)).toBeInTheDocument();
    });

    it('should have aria-hidden on icon', () => {
      render(<NoNotificationsInline />);

      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('AllNotificationsRead', () => {
    it('should render caught up message', () => {
      render(<AllNotificationsRead />);

      expect(screen.getByText('All caught up!')).toBeInTheDocument();
      expect(screen.getByText(/you've read all your notifications/i)).toBeInTheDocument();
    });

    it('should have aria-hidden on icon', () => {
      render(<AllNotificationsRead />);

      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('NoNotificationsPage', () => {
    it('should render full page version', () => {
      render(<NoNotificationsPage />);

      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText(/you don't have any notifications right now/i)).toBeInTheDocument();
    });

    it('should render settings hint section', () => {
      render(<NoNotificationsPage />);

      expect(screen.getByText('Customize your notifications')).toBeInTheDocument();
      expect(screen.getByText('Choose what you want to be notified about')).toBeInTheDocument();
    });

    it('should have settings link in hint section', () => {
      render(<NoNotificationsPage />);

      const settingsLinks = screen.getAllByRole('link', { name: /settings/i });
      expect(settingsLinks.length).toBeGreaterThan(0);
      expect(settingsLinks[0]).toHaveAttribute('href', '/profile/notifications');
    });
  });
});

describe('Accessibility', () => {
  it('NoGames should have decorative icons hidden', () => {
    render(<NoGames />);

    const hiddenIcons = document.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenIcons.length).toBeGreaterThan(0);
  });

  it('NoTournaments should have proper heading structure', () => {
    render(<NoTournaments />);

    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('NoLeagues should have proper heading structure', () => {
    render(<NoLeagues />);

    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('NoNotifications should have proper heading structure', () => {
    render(<NoNotifications />);

    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });
});

describe('Compact Mode', () => {
  it('NoGames compact should not render feature highlights', () => {
    render(<NoGames compact />);

    expect(screen.queryByText('What you can track')).not.toBeInTheDocument();
  });

  it('NoTournaments compact should not render feature highlights', () => {
    render(<NoTournaments compact />);

    expect(screen.queryByText('Tournament features')).not.toBeInTheDocument();
  });

  it('NoLeagues compact should not render benefit highlights', () => {
    render(<NoLeagues context="joined" compact />);

    expect(screen.queryByText('Why join a league?')).not.toBeInTheDocument();
  });

  it('NoNotifications compact should render without error', () => {
    const { container } = render(<NoNotifications compact />);

    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('Custom ClassName', () => {
  it('NoGames should accept custom className', () => {
    render(<NoGames className="custom-class" />);

    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('NoTournaments should accept custom className', () => {
    render(<NoTournaments className="custom-class" />);

    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('NoLeagues should accept custom className', () => {
    render(<NoLeagues className="custom-class" />);

    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('NoNotifications should accept custom className', () => {
    render(<NoNotifications className="custom-class" />);

    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });
});
