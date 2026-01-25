/**
 * Unit Tests for UI Skeleton Components
 *
 * Tests cover:
 * - Skeleton base component rendering
 * - SkeletonAvatar size variants
 * - SkeletonText width and height variants
 * - SkeletonCard with header and footer options
 * - SkeletonTable with configurable rows and columns
 * - SkeletonStatCard rendering
 * - SkeletonButton size variants
 * - Animation classes
 * - Custom className support
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonTableRow,
  SkeletonStatCard,
  SkeletonButton,
} from '../skeleton';

describe('Skeleton', () => {
  it('should render without errors', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('should have rounded-md class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('rounded-md');
  });

  it('should accept custom className', () => {
    const { container } = render(<Skeleton className="w-full h-4" />);
    expect(container.firstChild).toHaveClass('w-full', 'h-4');
  });

  it('should pass through additional props', () => {
    render(<Skeleton data-testid="custom-skeleton" />);
    expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument();
  });

  it('should have dark mode styling', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('dark:bg-gray-700');
  });
});

describe('SkeletonAvatar', () => {
  it('should render without errors', () => {
    const { container } = render(<SkeletonAvatar />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should be rounded-full for circular avatar', () => {
    const { container } = render(<SkeletonAvatar />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  describe('size variants', () => {
    it('should render sm size', () => {
      const { container } = render(<SkeletonAvatar size="sm" />);
      expect(container.firstChild).toHaveClass('w-8', 'h-8');
    });

    it('should render md size (default)', () => {
      const { container } = render(<SkeletonAvatar />);
      expect(container.firstChild).toHaveClass('w-10', 'h-10');
    });

    it('should render lg size', () => {
      const { container } = render(<SkeletonAvatar size="lg" />);
      expect(container.firstChild).toHaveClass('w-12', 'h-12');
    });

    it('should render xl size', () => {
      const { container } = render(<SkeletonAvatar size="xl" />);
      expect(container.firstChild).toHaveClass('w-16', 'h-16');
    });
  });

  it('should accept custom className', () => {
    const { container } = render(<SkeletonAvatar className="border-2" />);
    expect(container.firstChild).toHaveClass('border-2');
  });
});

describe('SkeletonText', () => {
  it('should render without errors', () => {
    const { container } = render(<SkeletonText />);
    expect(container.firstChild).toBeInTheDocument();
  });

  describe('width variants', () => {
    it('should render xs width', () => {
      const { container } = render(<SkeletonText width="xs" />);
      expect(container.firstChild).toHaveClass('w-12');
    });

    it('should render sm width', () => {
      const { container } = render(<SkeletonText width="sm" />);
      expect(container.firstChild).toHaveClass('w-20');
    });

    it('should render md width', () => {
      const { container } = render(<SkeletonText width="md" />);
      expect(container.firstChild).toHaveClass('w-32');
    });

    it('should render lg width', () => {
      const { container } = render(<SkeletonText width="lg" />);
      expect(container.firstChild).toHaveClass('w-48');
    });

    it('should render xl width', () => {
      const { container } = render(<SkeletonText width="xl" />);
      expect(container.firstChild).toHaveClass('w-64');
    });

    it('should render full width (default)', () => {
      const { container } = render(<SkeletonText />);
      expect(container.firstChild).toHaveClass('w-full');
    });
  });

  describe('height variants', () => {
    it('should render sm height', () => {
      const { container } = render(<SkeletonText height="sm" />);
      expect(container.firstChild).toHaveClass('h-3');
    });

    it('should render md height (default)', () => {
      const { container } = render(<SkeletonText />);
      expect(container.firstChild).toHaveClass('h-4');
    });

    it('should render lg height', () => {
      const { container } = render(<SkeletonText height="lg" />);
      expect(container.firstChild).toHaveClass('h-5');
    });
  });

  it('should accept custom className', () => {
    const { container } = render(<SkeletonText className="rounded-full" />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });
});

describe('SkeletonCard', () => {
  it('should render without errors', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have border and rounded styling', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveClass('rounded-xl', 'border');
  });

  it('should render header by default', () => {
    const { container } = render(<SkeletonCard />);
    // Header has border-b class
    expect(container.querySelector('.border-b')).toBeInTheDocument();
  });

  it('should not render header when hasHeader is false', () => {
    const { container } = render(<SkeletonCard hasHeader={false} />);
    // Should not have border-b for header separator
    const headerBorders = container.querySelectorAll('.border-b');
    // Footer would add a border-t, not border-b
    expect(headerBorders.length).toBe(0);
  });

  it('should render footer when hasFooter is true', () => {
    const { container } = render(<SkeletonCard hasFooter={true} />);
    expect(container.querySelector('.border-t')).toBeInTheDocument();
  });

  it('should not render footer by default', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelector('.border-t')).not.toBeInTheDocument();
  });

  it('should render children', () => {
    render(
      <SkeletonCard>
        <div data-testid="child">Child content</div>
      </SkeletonCard>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(<SkeletonCard className="custom-card" />);
    expect(container.firstChild).toHaveClass('custom-card');
  });
});

describe('SkeletonTableRow', () => {
  it('should render without errors', () => {
    const { container } = render(<SkeletonTableRow />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render 4 columns by default', () => {
    const { container } = render(<SkeletonTableRow />);
    // Each column is a SkeletonText
    const skeletons = container.querySelectorAll('[class*="bg-gray"]');
    expect(skeletons.length).toBe(4);
  });

  it('should render custom number of columns', () => {
    const { container } = render(<SkeletonTableRow columns={6} />);
    const skeletons = container.querySelectorAll('[class*="bg-gray"]');
    expect(skeletons.length).toBe(6);
  });

  it('should have flex layout', () => {
    const { container } = render(<SkeletonTableRow />);
    expect(container.firstChild).toHaveClass('flex', 'items-center');
  });

  it('should accept custom className', () => {
    const { container } = render(<SkeletonTableRow className="custom-row" />);
    expect(container.firstChild).toHaveClass('custom-row');
  });
});

describe('SkeletonTable', () => {
  it('should render without errors', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have border and rounded styling', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstChild).toHaveClass('rounded-xl', 'border');
  });

  it('should render 5 rows by default', () => {
    const { container } = render(<SkeletonTable />);
    // Rows are in the divide-y container
    const rows = container.querySelectorAll('.divide-y > div');
    expect(rows.length).toBe(5);
  });

  it('should render custom number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} />);
    const rows = container.querySelectorAll('.divide-y > div');
    expect(rows.length).toBe(3);
  });

  it('should render header by default', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelector('.border-b.bg-gray-50')).toBeInTheDocument();
  });

  it('should not render header when hasHeader is false', () => {
    const { container } = render(<SkeletonTable hasHeader={false} />);
    expect(container.querySelector('.border-b.bg-gray-50')).not.toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(<SkeletonTable className="custom-table" />);
    expect(container.firstChild).toHaveClass('custom-table');
  });
});

describe('SkeletonStatCard', () => {
  it('should render without errors', () => {
    const { container } = render(<SkeletonStatCard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should have card styling', () => {
    const { container } = render(<SkeletonStatCard />);
    expect(container.firstChild).toHaveClass('bg-white', 'rounded-xl', 'shadow-sm', 'border');
  });

  it('should have icon skeleton', () => {
    const { container } = render(<SkeletonStatCard />);
    expect(container.querySelector('.rounded-lg.w-9.h-9')).toBeInTheDocument();
  });

  it('should have value skeleton', () => {
    const { container } = render(<SkeletonStatCard />);
    expect(container.querySelector('.h-8.w-16')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(<SkeletonStatCard className="custom-stat" />);
    expect(container.firstChild).toHaveClass('custom-stat');
  });
});

describe('SkeletonButton', () => {
  it('should render without errors', () => {
    const { container } = render(<SkeletonButton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should be rounded-lg', () => {
    const { container } = render(<SkeletonButton />);
    expect(container.firstChild).toHaveClass('rounded-lg');
  });

  describe('size variants', () => {
    it('should render sm size', () => {
      const { container } = render(<SkeletonButton size="sm" />);
      expect(container.firstChild).toHaveClass('h-8', 'w-20');
    });

    it('should render md size (default)', () => {
      const { container } = render(<SkeletonButton />);
      expect(container.firstChild).toHaveClass('h-10', 'w-28');
    });

    it('should render lg size', () => {
      const { container } = render(<SkeletonButton size="lg" />);
      expect(container.firstChild).toHaveClass('h-12', 'w-36');
    });
  });

  it('should accept custom className', () => {
    const { container } = render(<SkeletonButton className="custom-button" />);
    expect(container.firstChild).toHaveClass('custom-button');
  });
});

describe('Dark Mode Support', () => {
  it('Skeleton should have dark mode background', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('dark:bg-gray-700');
  });

  it('SkeletonCard should have dark mode styling', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveClass('dark:bg-gray-800', 'dark:border-gray-700');
  });

  it('SkeletonTable should have dark mode styling', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstChild).toHaveClass('dark:bg-gray-800', 'dark:border-gray-700');
  });

  it('SkeletonStatCard should have dark mode styling', () => {
    const { container } = render(<SkeletonStatCard />);
    expect(container.firstChild).toHaveClass('dark:bg-gray-800', 'dark:border-gray-700');
  });
});
