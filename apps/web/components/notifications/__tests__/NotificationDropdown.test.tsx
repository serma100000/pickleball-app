/**
 * Unit Tests for NotificationDropdown Component
 *
 * Tests cover:
 * - Open/close behavior
 * - Badge display
 * - Loading states
 * - Empty state
 * - Notification list rendering
 * - Mark all as read functionality
 * - Keyboard navigation (Escape to close)
 * - Click outside to close
 * - Accessibility attributes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationDropdown } from '../NotificationDropdown';

// Mock NotificationItem to simplify tests
vi.mock('../NotificationItem', () => ({
  NotificationItem: ({ notification, onMarkAsRead, onClose }: {
    notification: { id: string; title: string };
    onMarkAsRead: (id: string) => void;
    onClose: () => void;
  }) => (
    <div
      data-testid={`notification-${notification.id}`}
      onClick={() => {
        onMarkAsRead(notification.id);
        onClose();
      }}
    >
      {notification.title}
    </div>
  ),
}));

describe('NotificationDropdown', () => {
  const mockNotifications = [
    {
      id: '1',
      type: 'game_invite' as const,
      title: 'Game Invitation',
      message: 'You have been invited to play',
      data: {},
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'game_result' as const,
      title: 'Game Complete',
      message: 'Your game results are in',
      data: {},
      isRead: true,
      readAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  const defaultProps = {
    notifications: mockNotifications,
    unreadCount: 1,
    isOpen: false,
    onToggle: vi.fn(),
    onClose: vi.fn(),
    onMarkAsRead: vi.fn(),
    onMarkAllAsRead: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Bell Button', () => {
    const getBellButton = () => {
      // Get the bell button specifically by aria-controls
      const buttons = screen.getAllByRole('button');
      return buttons.find(btn => btn.getAttribute('aria-controls') === 'notification-dropdown');
    };

    it('should render bell button', () => {
      render(<NotificationDropdown {...defaultProps} />);

      const bellButton = getBellButton();
      expect(bellButton).toBeInTheDocument();
    });

    it('should call onToggle when bell button is clicked', () => {
      const onToggle = vi.fn();
      render(<NotificationDropdown {...defaultProps} onToggle={onToggle} />);

      const bellButton = getBellButton();
      fireEvent.click(bellButton!);

      expect(onToggle).toHaveBeenCalled();
    });

    it('should have aria-expanded false when closed', () => {
      render(<NotificationDropdown {...defaultProps} />);

      const bellButton = getBellButton();
      expect(bellButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-expanded true when open', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      const bellButton = getBellButton();
      expect(bellButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-haspopup true', () => {
      render(<NotificationDropdown {...defaultProps} />);

      const bellButton = getBellButton();
      expect(bellButton).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should include unread count in aria-label', () => {
      render(<NotificationDropdown {...defaultProps} unreadCount={5} />);

      const bellButton = getBellButton();
      expect(bellButton?.getAttribute('aria-label')).toContain('5 unread');
    });
  });

  describe('Badge Display', () => {
    it('should show unread count badge when > 0', () => {
      render(<NotificationDropdown {...defaultProps} unreadCount={5} />);

      // Badge shows count
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not show badge when unread count is 0', () => {
      render(<NotificationDropdown {...defaultProps} unreadCount={0} />);

      // Badge should not be visible
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show 99+ when unread count exceeds 99', () => {
      render(<NotificationDropdown {...defaultProps} unreadCount={150} />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Dropdown Panel', () => {
    it('should not render dropdown when closed', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render dropdown when open', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('dialog', { name: /notifications/i })).toBeInTheDocument();
    });

    it('should have header with title', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    });

    it('should show new count badge in header when unread > 0', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} unreadCount={3} />);

      expect(screen.getByText('3 new')).toBeInTheDocument();
    });

    it('should not show new count badge when unread is 0', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} unreadCount={0} />);

      expect(screen.queryByText(/new$/)).not.toBeInTheDocument();
    });
  });

  describe('Mark All as Read', () => {
    it('should show mark all read button when unread > 0', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} unreadCount={1} />);

      expect(
        screen.getByRole('button', { name: /mark all notifications as read/i })
      ).toBeInTheDocument();
    });

    it('should not show mark all read button when unread is 0', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} unreadCount={0} />);

      expect(
        screen.queryByRole('button', { name: /mark all notifications as read/i })
      ).not.toBeInTheDocument();
    });

    it('should call onMarkAllAsRead when clicked', () => {
      const onMarkAllAsRead = vi.fn();
      render(
        <NotificationDropdown
          {...defaultProps}
          isOpen={true}
          unreadCount={1}
          onMarkAllAsRead={onMarkAllAsRead}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /mark all notifications as read/i }));

      expect(onMarkAllAsRead).toHaveBeenCalled();
    });
  });

  describe('Notification List', () => {
    it('should render notifications', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      expect(screen.getByTestId('notification-1')).toBeInTheDocument();
      expect(screen.getByTestId('notification-2')).toBeInTheDocument();
    });

    it('should have list role for notifications container', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('list', { name: /notification list/i })).toBeInTheDocument();
    });

    it('should render listitems for each notification', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      const listitems = screen.getAllByRole('listitem');
      expect(listitems.length).toBe(2);
    });

    it('should call onMarkAsRead and onClose when notification is clicked', () => {
      const onMarkAsRead = vi.fn();
      const onClose = vi.fn();
      render(
        <NotificationDropdown
          {...defaultProps}
          isOpen={true}
          onMarkAsRead={onMarkAsRead}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByTestId('notification-1'));

      expect(onMarkAsRead).toHaveBeenCalledWith('1');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} isLoading={true} />);

      // Should show spinner (animate-spin)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should not render notifications when loading', () => {
      render(
        <NotificationDropdown
          {...defaultProps}
          isOpen={true}
          isLoading={true}
          notifications={mockNotifications}
        />
      );

      expect(screen.queryByTestId('notification-1')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no notifications', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} notifications={[]} />);

      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      expect(screen.getByText(/we'll let you know when something happens/i)).toBeInTheDocument();
    });

    it('should have hidden icon in empty state', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} notifications={[]} />);

      const hiddenIcon = document.querySelector('[aria-hidden="true"]');
      expect(hiddenIcon).toBeInTheDocument();
    });
  });

  describe('Footer Link', () => {
    it('should show view all link when has notifications', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('link', { name: /view all notifications/i })).toBeInTheDocument();
    });

    it('should have correct href', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('link', { name: /view all notifications/i })).toHaveAttribute(
        'href',
        '/profile/notifications'
      );
    });

    it('should not show view all link when no notifications', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} notifications={[]} />);

      expect(
        screen.queryByRole('link', { name: /view all notifications/i })
      ).not.toBeInTheDocument();
    });

    it('should call onClose when view all link is clicked', () => {
      const onClose = vi.fn();
      render(<NotificationDropdown {...defaultProps} isOpen={true} onClose={onClose} />);

      fireEvent.click(screen.getByRole('link', { name: /view all notifications/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close dropdown on Escape key', () => {
      const onClose = vi.fn();
      render(<NotificationDropdown {...defaultProps} isOpen={true} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('should not close on Escape when dropdown is closed', () => {
      const onClose = vi.fn();
      render(<NotificationDropdown {...defaultProps} isOpen={false} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Click Outside', () => {
    it('should close dropdown when clicking outside', () => {
      const onClose = vi.fn();
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <NotificationDropdown {...defaultProps} isOpen={true} onClose={onClose} />
        </div>
      );

      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should not close dropdown when clicking inside', () => {
      const onClose = vi.fn();
      render(<NotificationDropdown {...defaultProps} isOpen={true} onClose={onClose} />);

      fireEvent.mouseDown(screen.getByRole('dialog'));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not close dropdown when clicking bell button', () => {
      const onClose = vi.fn();
      render(<NotificationDropdown {...defaultProps} isOpen={true} onClose={onClose} />);

      // Get the bell button specifically (there are multiple buttons)
      const bellButton = screen.getAllByRole('button').find(btn =>
        btn.getAttribute('aria-label')?.includes('Notifications')
      );
      expect(bellButton).toBeDefined();
      fireEvent.mouseDown(bellButton!);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role on dropdown', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-label on dialog', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('dialog', { name: /notifications/i })).toBeInTheDocument();
    });

    it('should have aria-hidden on bell icon', () => {
      render(<NotificationDropdown {...defaultProps} />);

      const bellIcon = document.querySelector('svg[aria-hidden="true"]');
      expect(bellIcon).toBeInTheDocument();
    });

    it('should have aria-controls pointing to dropdown id', () => {
      render(<NotificationDropdown {...defaultProps} />);

      expect(screen.getByRole('button', { name: /notifications/i })).toHaveAttribute(
        'aria-controls',
        'notification-dropdown'
      );
    });

    it('should have matching id on dropdown', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={true} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('id', 'notification-dropdown');
    });
  });

  describe('Focus Management', () => {
    it('should focus first focusable element when dropdown opens', async () => {
      const { rerender } = render(<NotificationDropdown {...defaultProps} isOpen={false} />);

      rerender(<NotificationDropdown {...defaultProps} isOpen={true} />);

      await waitFor(() => {
        const focusedElement = document.activeElement;
        // Should focus either mark all read button or first notification
        expect(focusedElement?.tagName.toLowerCase()).toMatch(/button|a|div/);
      });
    });
  });
});
