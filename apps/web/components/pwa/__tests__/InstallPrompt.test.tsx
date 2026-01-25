/**
 * Unit Tests for InstallPrompt Component
 *
 * Tests cover:
 * - Conditional rendering based on hook state
 * - iOS instructions modal display
 * - Dismiss functionality
 * - Install button interactions
 * - Accessibility attributes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallPrompt } from '../InstallPrompt';

// Mock the hooks
const mockUsePWAInstall = vi.fn();
const mockUseIsMobile = vi.fn();

vi.mock('@/hooks/use-pwa-install', () => ({
  usePWAInstall: () => mockUsePWAInstall(),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

describe('InstallPrompt', () => {
  const defaultPWAState = {
    canInstall: true,
    isInstalled: false,
    isIOS: false,
    isDismissed: false,
    isSupported: true,
    promptInstall: vi.fn().mockResolvedValue(true),
    dismissPrompt: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePWAInstall.mockReturnValue(defaultPWAState);
    mockUseIsMobile.mockReturnValue(true);
  });

  describe('Conditional Rendering', () => {
    it('should render when all conditions are met', () => {
      render(<InstallPrompt />);

      expect(screen.getByRole('region', { name: /install app prompt/i })).toBeInTheDocument();
      expect(screen.getByText('Install Paddle Up')).toBeInTheDocument();
    });

    it('should not render when already installed', () => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        isInstalled: true,
      });

      const { container } = render(<InstallPrompt />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when dismissed', () => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        isDismissed: true,
      });

      const { container } = render(<InstallPrompt />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when not supported', () => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        isSupported: false,
      });

      const { container } = render(<InstallPrompt />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when cannot install and not iOS', () => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        canInstall: false,
        isIOS: false,
      });

      const { container } = render(<InstallPrompt />);

      expect(container.firstChild).toBeNull();
    });

    it('should render on iOS even when canInstall is false', () => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        canInstall: false,
        isIOS: true,
      });

      render(<InstallPrompt />);

      expect(screen.getByRole('region', { name: /install app prompt/i })).toBeInTheDocument();
    });

    it('should not render on desktop (non-mobile)', () => {
      mockUseIsMobile.mockReturnValue(false);

      const { container } = render(<InstallPrompt />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Banner Content', () => {
    it('should display app name and description', () => {
      render(<InstallPrompt />);

      expect(screen.getByText('Install Paddle Up')).toBeInTheDocument();
      expect(screen.getByText(/add to your home screen/i)).toBeInTheDocument();
    });

    it('should have install button', () => {
      render(<InstallPrompt />);

      expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
    });

    it('should have not now button', () => {
      render(<InstallPrompt />);

      expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();
    });

    it('should have dismiss button', () => {
      render(<InstallPrompt />);

      expect(screen.getByRole('button', { name: /dismiss install prompt/i })).toBeInTheDocument();
    });
  });

  describe('Install Button Behavior', () => {
    it('should call promptInstall when clicked on non-iOS', async () => {
      const promptInstall = vi.fn().mockResolvedValue(true);
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        promptInstall,
      });

      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /install app/i }));

      expect(promptInstall).toHaveBeenCalled();
    });

    it('should show iOS instructions modal when clicked on iOS', () => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        canInstall: false,
        isIOS: true,
      });

      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /show install instructions/i }));

      expect(screen.getByRole('dialog', { name: /install paddle up/i })).toBeInTheDocument();
    });

    it('should show loading state when installing', async () => {
      const promptInstall = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        promptInstall,
      });

      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /install app/i }));

      expect(screen.getByText(/installing/i)).toBeInTheDocument();
    });

    it('should have correct aria-label on iOS', () => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        canInstall: false,
        isIOS: true,
      });

      render(<InstallPrompt />);

      expect(screen.getByRole('button', { name: /show install instructions/i })).toBeInTheDocument();
    });
  });

  describe('Dismiss Behavior', () => {
    it('should call dismissPrompt when not now is clicked', () => {
      const dismissPrompt = vi.fn();
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        dismissPrompt,
      });

      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /not now/i }));

      expect(dismissPrompt).toHaveBeenCalled();
    });

    it('should call dismissPrompt when X button is clicked', () => {
      const dismissPrompt = vi.fn();
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        dismissPrompt,
      });

      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /dismiss install prompt/i }));

      expect(dismissPrompt).toHaveBeenCalled();
    });
  });

  describe('iOS Instructions Modal', () => {
    beforeEach(() => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        canInstall: false,
        isIOS: true,
      });
    });

    it('should display iOS instructions when install is clicked', () => {
      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /show install instructions/i }));

      // Check for instruction steps - match exact text from component
      expect(screen.getByText('Tap the Share button')).toBeInTheDocument();
      // "Add to Home Screen" appears both as instruction text and button label
      // Use getAllByText and verify at least one exists
      const addToHomeScreenElements = screen.getAllByText(/add to home screen/i);
      expect(addToHomeScreenElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/tap "add" to confirm/i)).toBeInTheDocument();
    });

    it('should have numbered steps', () => {
      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /show install instructions/i }));

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should close modal when backdrop is clicked', () => {
      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /show install instructions/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click backdrop - it has the bg-black/50 class and is the overlay
      const backdrop = document.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close modal when close button is clicked', () => {
      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /show install instructions/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /close instructions/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should dismiss prompt when Got it is clicked', () => {
      const dismissPrompt = vi.fn();
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        canInstall: false,
        isIOS: true,
        dismissPrompt,
      });

      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /show install instructions/i }));
      fireEvent.click(screen.getByRole('button', { name: /got it/i }));

      expect(dismissPrompt).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have role="region" with aria-label', () => {
      render(<InstallPrompt />);

      expect(screen.getByRole('region', { name: /install app prompt/i })).toBeInTheDocument();
    });

    it('should have aria-hidden on decorative icon container', () => {
      render(<InstallPrompt />);

      // The icon is inside a container div that has aria-hidden="true"
      // The container has the gradient background class
      const iconContainer = document.querySelector('.bg-gradient-to-br');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have aria-modal on iOS instructions dialog', () => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        canInstall: false,
        isIOS: true,
      });

      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /show install instructions/i }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to title', () => {
      mockUsePWAInstall.mockReturnValue({
        ...defaultPWAState,
        canInstall: false,
        isIOS: true,
      });

      render(<InstallPrompt />);

      fireEvent.click(screen.getByRole('button', { name: /show install instructions/i }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'ios-install-title');
    });
  });
});
