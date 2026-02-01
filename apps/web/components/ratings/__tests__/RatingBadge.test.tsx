import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RatingBadge, RatingValue, type RatingSource } from '../RatingBadge';

describe('RatingBadge', () => {
  describe('Rating Display', () => {
    it('displays rating formatted to 2 decimal places', () => {
      render(<RatingBadge rating={3.5} source="dupr" />);

      expect(screen.getByText('3.50')).toBeInTheDocument();
    });

    it('displays rating with trailing zeros', () => {
      render(<RatingBadge rating={4} source="dupr" />);

      expect(screen.getByText('4.00')).toBeInTheDocument();
    });

    it('displays rating with precision', () => {
      render(<RatingBadge rating={3.756} source="dupr" />);

      expect(screen.getByText('3.76')).toBeInTheDocument();
    });
  });

  describe('DUPR Verified Badge', () => {
    it('displays DUPR source label', () => {
      render(<RatingBadge rating={4.0} source="dupr" />);

      expect(screen.getByText('DUPR')).toBeInTheDocument();
    });

    it('shows DUPR logo/icon', () => {
      render(<RatingBadge rating={4.0} source="dupr" />);

      // DUPR logo shows "D"
      expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('applies blue color scheme for DUPR', () => {
      const { container } = render(<RatingBadge rating={4.0} source="dupr" />);

      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass('border-blue-200');
    });

    it('shows reliability percentage for DUPR', () => {
      render(<RatingBadge rating={4.0} source="dupr" reliability={0.75} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('shows verified checkmark when reliability >= 60%', () => {
      const { container } = render(
        <RatingBadge rating={4.0} source="dupr" reliability={0.6} />
      );

      // Should have a green checkmark icon
      const checkIcon = container.querySelector('.text-green-500');
      expect(checkIcon).toBeInTheDocument();
    });

    it('shows warning icon when reliability < 60%', () => {
      const { container } = render(
        <RatingBadge rating={4.0} source="dupr" reliability={0.5} />
      );

      // Should have an amber warning icon
      const warningIcon = container.querySelector('.text-amber-500');
      expect(warningIcon).toBeInTheDocument();
    });

    it('hides reliability when showReliability is false', () => {
      render(
        <RatingBadge
          rating={4.0}
          source="dupr"
          reliability={0.75}
          showReliability={false}
        />
      );

      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });
  });

  describe('Internal Badge', () => {
    it('displays Internal source label', () => {
      render(<RatingBadge rating={3.5} source="internal" />);

      expect(screen.getByText('Internal')).toBeInTheDocument();
    });

    it('shows PaddleUp icon (P)', () => {
      render(<RatingBadge rating={3.5} source="internal" />);

      expect(screen.getByText('P')).toBeInTheDocument();
    });

    it('applies purple color scheme for Internal', () => {
      const { container } = render(<RatingBadge rating={3.5} source="internal" />);

      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass('border-purple-200');
    });

    it('does not show reliability percentage', () => {
      render(<RatingBadge rating={3.5} source="internal" reliability={0.8} />);

      expect(screen.queryByText('80%')).not.toBeInTheDocument();
    });
  });

  describe('Self-Reported Badge', () => {
    it('displays Self-Reported source label', () => {
      render(<RatingBadge rating={3.0} source="self_reported" />);

      expect(screen.getByText('Self-Reported')).toBeInTheDocument();
    });

    it('shows question mark icon', () => {
      const { container } = render(
        <RatingBadge rating={3.0} source="self_reported" />
      );

      // HelpCircle icon should be present
      const helpIcon = container.querySelector('.text-gray-400');
      expect(helpIcon).toBeInTheDocument();
    });

    it('applies gray color scheme', () => {
      const { container } = render(
        <RatingBadge rating={3.0} source="self_reported" />
      );

      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass('border-gray-200');
    });

    it('does not show verified indicator', () => {
      const { container } = render(
        <RatingBadge rating={3.0} source="self_reported" />
      );

      const checkIcon = container.querySelector('.text-green-500');
      expect(checkIcon).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      const { container } = render(
        <RatingBadge rating={4.0} source="dupr" size="sm" />
      );

      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass('gap-1.5');
    });

    it('renders medium size (default)', () => {
      const { container } = render(<RatingBadge rating={4.0} source="dupr" />);

      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass('gap-2');
    });

    it('renders large size', () => {
      const { container } = render(
        <RatingBadge rating={4.0} source="dupr" size="lg" />
      );

      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass('gap-2.5');
    });
  });

  describe('Source Label Visibility', () => {
    it('shows source label by default', () => {
      render(<RatingBadge rating={4.0} source="dupr" />);

      expect(screen.getByText('DUPR')).toBeInTheDocument();
    });

    it('hides source label when showSource is false', () => {
      render(<RatingBadge rating={4.0} source="dupr" showSource={false} />);

      expect(screen.queryByText('DUPR')).not.toBeInTheDocument();
    });
  });

  describe('Verified Override', () => {
    it('uses verified prop when provided', () => {
      const { container } = render(
        <RatingBadge rating={4.0} source="dupr" reliability={0.5} verified={true} />
      );

      // Should show green checkmark despite low reliability
      const checkIcon = container.querySelector('.text-green-500');
      expect(checkIcon).toBeInTheDocument();
    });

    it('respects verified=false override', () => {
      const { container } = render(
        <RatingBadge rating={4.0} source="dupr" reliability={0.8} verified={false} />
      );

      // Should show warning despite high reliability
      const warningIcon = container.querySelector('.text-amber-500');
      expect(warningIcon).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('shows tooltip on hover with source name', async () => {
      render(<RatingBadge rating={4.0} source="dupr" />);

      const badge = screen.getByRole('img');
      fireEvent.mouseEnter(badge);

      expect(screen.getByText('DUPR Rating')).toBeInTheDocument();
    });

    it('shows tooltip with description', async () => {
      render(<RatingBadge rating={4.0} source="dupr" />);

      const badge = screen.getByRole('img');
      fireEvent.mouseEnter(badge);

      expect(
        screen.getByText(/official dupr rating synced/i)
      ).toBeInTheDocument();
    });

    it('shows tooltip with reliability for DUPR', async () => {
      render(<RatingBadge rating={4.0} source="dupr" reliability={0.75} />);

      const badge = screen.getByRole('img');
      fireEvent.mouseEnter(badge);

      expect(screen.getByText(/reliability: 75%/i)).toBeInTheDocument();
    });

    it('shows verified status in tooltip when verified', async () => {
      render(<RatingBadge rating={4.0} source="dupr" reliability={0.8} />);

      const badge = screen.getByRole('img');
      fireEvent.mouseEnter(badge);

      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', async () => {
      render(<RatingBadge rating={4.0} source="dupr" />);

      const badge = screen.getByRole('img');
      fireEvent.mouseEnter(badge);

      expect(screen.getByText('DUPR Rating')).toBeInTheDocument();

      fireEvent.mouseLeave(badge);

      // Tooltip content should be removed
      expect(screen.queryByText('DUPR Rating')).not.toBeInTheDocument();
    });

    it('shows internal rating description in tooltip', async () => {
      render(<RatingBadge rating={3.5} source="internal" />);

      const badge = screen.getByRole('img');
      fireEvent.mouseEnter(badge);

      expect(
        screen.getByText(/rating calculated from games played/i)
      ).toBeInTheDocument();
    });

    it('shows self-reported warning in tooltip', async () => {
      render(<RatingBadge rating={3.0} source="self_reported" />);

      const badge = screen.getByRole('img');
      fireEvent.mouseEnter(badge);

      expect(
        screen.getByText(/rating provided by the player.*not verified/i)
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label with rating info', () => {
      render(<RatingBadge rating={4.0} source="dupr" />);

      const badge = screen.getByRole('img');
      expect(badge).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Rating: 4.00')
      );
    });

    it('includes source in aria-label', () => {
      render(<RatingBadge rating={4.0} source="dupr" />);

      const badge = screen.getByRole('img');
      expect(badge).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Source: DUPR')
      );
    });

    it('includes verified status in aria-label', () => {
      render(<RatingBadge rating={4.0} source="dupr" reliability={0.8} />);

      const badge = screen.getByRole('img');
      expect(badge).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Verified')
      );
    });

    it('includes reliability in aria-label for DUPR', () => {
      render(<RatingBadge rating={4.0} source="dupr" reliability={0.75} />);

      const badge = screen.getByRole('img');
      expect(badge).toHaveAttribute(
        'aria-label',
        expect.stringContaining('75% reliability')
      );
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <RatingBadge rating={4.0} source="dupr" className="my-custom-class" />
      );

      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveClass('my-custom-class');
    });
  });
});

describe('RatingValue', () => {
  it('displays rating formatted to 2 decimal places', () => {
    render(<RatingValue rating={3.5} source="dupr" />);

    expect(screen.getByText('3.50')).toBeInTheDocument();
  });

  it('shows verified checkmark for DUPR by default', () => {
    const { container } = render(<RatingValue rating={4.0} source="dupr" />);

    const checkIcon = container.querySelector('.text-green-500');
    expect(checkIcon).toBeInTheDocument();
  });

  it('does not show verified checkmark for other sources by default', () => {
    const { container } = render(<RatingValue rating={3.5} source="internal" />);

    const checkIcon = container.querySelector('.text-green-500');
    expect(checkIcon).not.toBeInTheDocument();
  });

  it('respects verified prop override', () => {
    const { container } = render(
      <RatingValue rating={3.5} source="internal" verified={true} />
    );

    const checkIcon = container.querySelector('.text-green-500');
    expect(checkIcon).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <RatingValue rating={4.0} source="dupr" className="my-custom-class" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('my-custom-class');
  });
});

describe('Source Info', () => {
  const sources: RatingSource[] = ['dupr', 'internal', 'self_reported'];

  sources.forEach((source) => {
    it(`renders correctly for ${source} source`, () => {
      render(<RatingBadge rating={3.5} source={source} />);

      // Should render without throwing
      expect(screen.getByText('3.50')).toBeInTheDocument();
    });
  });
});
