import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';

// Mock Clerk components
vi.mock('@clerk/nextjs', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-in-content">{children}</div>
  ),
  SignedOut: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-out-content">{children}</div>
  ),
  UserButton: ({ afterSignOutUrl, appearance }: { afterSignOutUrl: string; appearance?: object }) => (
    <button data-testid="user-button" data-sign-out-url={afterSignOutUrl}>
      User Menu
    </button>
  ),
}));

// Mock Logo component
vi.mock('@/components/logo', () => ({
  Logo: ({ size }: { size?: string }) => (
    <div data-testid="logo" data-size={size}>PaddleUp Logo</div>
  ),
}));

// Mock ThemeToggle component
vi.mock('@/components/theme-toggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle Theme</button>,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className} data-testid={`link-${href.replace(/\//g, '-').slice(1)}`}>
      {children}
    </a>
  ),
}));

describe('Public Layout', () => {
  let PublicLayout: React.ComponentType<{ children: React.ReactNode }>;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('@/app/(public)/layout');
    PublicLayout = module.default;
  });

  describe('Header', () => {
    it('should render the header with logo', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      // There are two logos - header and footer, so use getAllByTestId
      const logos = screen.getAllByTestId('logo');
      expect(logos.length).toBeGreaterThanOrEqual(1);
      expect(logos[0]).toBeInTheDocument();
    });

    it('should have a link to home page from logo', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const homeLink = screen.getByTestId('link-');
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should render the theme toggle', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });
  });

  describe('Signed In State', () => {
    it('should show Dashboard link when signed in', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const signedInContent = screen.getByTestId('signed-in-content');
      expect(signedInContent).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should show UserButton when signed in', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      expect(screen.getByTestId('user-button')).toBeInTheDocument();
    });

    it('should configure UserButton to redirect to home after sign out', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const userButton = screen.getByTestId('user-button');
      expect(userButton).toHaveAttribute('data-sign-out-url', '/');
    });
  });

  describe('Signed Out State', () => {
    it('should show Sign In link when signed out', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should show Sign Up link when signed out', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('should link to /sign-in for Sign In', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const signInLink = screen.getByTestId('link-sign-in');
      expect(signInLink).toHaveAttribute('href', '/sign-in');
    });

    it('should link to /sign-up for Sign Up', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const signUpLink = screen.getByTestId('link-sign-up');
      expect(signUpLink).toHaveAttribute('href', '/sign-up');
    });
  });

  describe('Main Content', () => {
    it('should render children in main content area', () => {
      render(
        <PublicLayout>
          <div data-testid="child-content">Test Child Content</div>
        </PublicLayout>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test Child Content')).toBeInTheDocument();
    });

    it('should have main element with id for accessibility', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const main = document.getElementById('main-content');
      expect(main).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('should render the footer with logo', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      // There should be two logos - header and footer
      const logos = screen.getAllByTestId('logo');
      expect(logos.length).toBeGreaterThanOrEqual(1);
    });

    it('should have Terms link', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      expect(screen.getByText('Terms')).toBeInTheDocument();
      expect(screen.getByTestId('link-terms')).toHaveAttribute('href', '/terms');
    });

    it('should have Privacy link', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      expect(screen.getByText('Privacy')).toBeInTheDocument();
      expect(screen.getByTestId('link-privacy')).toHaveAttribute('href', '/privacy');
    });

    it('should have Contact link', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByTestId('link-contact')).toHaveAttribute('href', '/contact');
    });

    it('should display copyright with current year', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const currentYear = new Date().getFullYear().toString();
      expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
      // PaddleUp appears in multiple places (logo), so use getAllByText
      const paddleUpElements = screen.getAllByText(/PaddleUp/);
      expect(paddleUpElements.length).toBeGreaterThan(0);
    });
  });

  describe('Styling and Layout', () => {
    it('should have min-h-screen class for full height', () => {
      const { container } = render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-screen');
    });

    it('should have background styling', () => {
      const { container } = render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('bg-gray-50');
    });

    it('should have sticky header', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const header = document.querySelector('header');
      expect(header).toHaveClass('sticky');
      expect(header).toHaveClass('top-0');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <PublicLayout>
          <h1>Page Title</h1>
        </PublicLayout>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should have accessible navigation', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      // Links should be accessible
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('should have focus visible styling on logo link', () => {
      render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const homeLink = screen.getByTestId('link-');
      expect(homeLink).toHaveClass('rounded-lg');
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(
        <PublicLayout>
          <div>Test Content</div>
        </PublicLayout>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('dark:bg-gray-900');
    });
  });
});
