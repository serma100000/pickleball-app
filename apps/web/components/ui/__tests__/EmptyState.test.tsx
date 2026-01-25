/**
 * Unit Tests for EmptyState Component
 *
 * Tests cover:
 * - Basic rendering with required props
 * - Icon variant styling
 * - Primary action (button vs link)
 * - Secondary action (button vs link)
 * - Compact mode styling
 * - Children rendering
 * - Custom className
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Trophy, Gamepad2 } from 'lucide-react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  describe('Basic Rendering', () => {
    it('should render title', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="No items found"
          description="There are no items to display"
        />
      );

      expect(screen.getByRole('heading', { name: /no items found/i })).toBeInTheDocument();
    });

    it('should render description', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="No items found"
          description="There are no items to display"
        />
      );

      expect(screen.getByText('There are no items to display')).toBeInTheDocument();
    });

    it('should render icon', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="No items found"
          description="There are no items to display"
        />
      );

      // Icon should be inside a rounded div with aria-hidden
      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('should have centered layout', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="No items found"
          description="There are no items to display"
        />
      );

      expect(container.querySelector('.text-center')).toBeInTheDocument();
      expect(container.querySelector('.items-center')).toBeInTheDocument();
    });
  });

  describe('Icon Variants', () => {
    it('should apply default variant styling', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          iconVariant="default"
          title="Test"
          description="Test description"
        />
      );

      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveClass('bg-pickle-100');
    });

    it('should apply success variant styling', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          iconVariant="success"
          title="Test"
          description="Test description"
        />
      );

      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveClass('bg-green-100');
    });

    it('should apply warning variant styling', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          iconVariant="warning"
          title="Test"
          description="Test description"
        />
      );

      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveClass('bg-yellow-100');
    });

    it('should apply error variant styling', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          iconVariant="error"
          title="Test"
          description="Test description"
        />
      );

      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveClass('bg-red-100');
    });

    it('should apply info variant styling', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          iconVariant="info"
          title="Test"
          description="Test description"
        />
      );

      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveClass('bg-blue-100');
    });
  });

  describe('Primary Action', () => {
    it('should render primary action as link when href is provided', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          primaryActionLabel="Get Started"
          primaryActionHref="/get-started"
        />
      );

      expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute(
        'href',
        '/get-started'
      );
    });

    it('should render primary action as button when onClick is provided', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          primaryActionLabel="Do Something"
          primaryActionOnClick={handleClick}
        />
      );

      const button = screen.getByRole('button', { name: /do something/i });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });

    it('should not render primary action when no label is provided', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          primaryActionHref="/test"
        />
      );

      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should not render primary action when no href or onClick is provided', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          primaryActionLabel="Test"
        />
      );

      expect(screen.queryByRole('button', { name: /test/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /test/i })).not.toBeInTheDocument();
    });
  });

  describe('Secondary Action', () => {
    it('should render secondary action as link when href is provided', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          secondaryActionLabel="Learn More"
          secondaryActionHref="/learn-more"
        />
      );

      expect(screen.getByRole('link', { name: /learn more/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /learn more/i })).toHaveAttribute(
        'href',
        '/learn-more'
      );
    });

    it('should render secondary action as button when onClick is provided', () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          secondaryActionLabel="Cancel"
          secondaryActionOnClick={handleClick}
        />
      );

      const button = screen.getByRole('button', { name: /cancel/i });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });

    it('should render both primary and secondary actions', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          primaryActionLabel="Primary"
          primaryActionHref="/primary"
          secondaryActionLabel="Secondary"
          secondaryActionHref="/secondary"
        />
      );

      expect(screen.getByRole('link', { name: /primary/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /secondary/i })).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should have smaller padding in compact mode', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          compact
        />
      );

      expect(container.firstChild).toHaveClass('p-8');
    });

    it('should have larger padding in default mode', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
        />
      );

      expect(container.firstChild).toHaveClass('p-12');
    });

    it('should have smaller icon in compact mode', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          compact
        />
      );

      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveClass('w-12', 'h-12');
    });

    it('should have larger icon in default mode', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
        />
      );

      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveClass('w-16', 'h-16');
    });

    it('should have smaller title text in compact mode', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          compact
        />
      );

      const heading = screen.getByRole('heading');
      expect(heading).toHaveClass('text-base');
    });

    it('should have larger title text in default mode', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
        />
      );

      const heading = screen.getByRole('heading');
      expect(heading).toHaveClass('text-lg');
    });
  });

  describe('Children', () => {
    it('should render children content', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
        >
          <div data-testid="child-content">Additional content</div>
        </EmptyState>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Additional content')).toBeInTheDocument();
    });

    it('should render children after actions', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          primaryActionLabel="Action"
          primaryActionHref="/action"
        >
          <div data-testid="child-content">Additional content</div>
        </EmptyState>
      );

      const childContent = screen.getByTestId('child-content');
      const actionButton = screen.getByRole('link', { name: /action/i });

      // Child should come after action in DOM
      const parent = container.querySelector('.flex.flex-col');
      const children = parent?.children;
      if (children) {
        const actionIndex = Array.from(children).findIndex((el) =>
          el.contains(actionButton)
        );
        const childIndex = Array.from(children).findIndex((el) =>
          el.contains(childContent)
        );
        expect(childIndex).toBeGreaterThan(actionIndex);
      }
    });
  });

  describe('Custom ClassName', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          className="custom-empty-state"
        />
      );

      expect(container.firstChild).toHaveClass('custom-empty-state');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          className="custom-empty-state"
        />
      );

      expect(container.firstChild).toHaveClass('bg-white', 'rounded-xl', 'custom-empty-state');
    });
  });

  describe('Accessibility', () => {
    it('should have heading level 3', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
        />
      );

      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should have aria-hidden on icon', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
        />
      );

      const icon = container.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('should have accessible button/link for actions', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
          primaryActionLabel="Get Started"
          primaryActionHref="/start"
        />
      );

      expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('should have dark mode background class', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
        />
      );

      expect(container.firstChild).toHaveClass('dark:bg-gray-800');
    });

    it('should have dark mode border class', () => {
      const { container } = render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
        />
      );

      expect(container.firstChild).toHaveClass('dark:border-gray-700');
    });

    it('should have dark mode text colors', () => {
      render(
        <EmptyState
          icon={Trophy}
          title="Test"
          description="Test description"
        />
      );

      const heading = screen.getByRole('heading');
      expect(heading).toHaveClass('dark:text-white');
    });
  });
});
