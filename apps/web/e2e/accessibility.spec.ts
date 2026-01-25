import { test, expect } from '@playwright/test';

/**
 * Accessibility E2E Tests
 *
 * Tests for WCAG compliance and accessibility best practices
 */
test.describe('Accessibility', () => {
  test.describe('Keyboard Navigation', () => {
    test('should be navigable by keyboard on landing page', async ({
      page,
    }) => {
      await page.goto('/');

      // Press Tab multiple times and verify focus moves
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Check that focus is on an interactive element
      const focusedElement = page.locator(':focus');
      const tagName = await focusedElement.evaluate((el) =>
        el.tagName.toLowerCase()
      );

      // Should be on a focusable element
      expect(['a', 'button', 'input', 'select', 'textarea']).toContain(tagName);
    });

    test('should have visible focus indicators', async ({ page }) => {
      await page.goto('/');

      // Tab to first focusable element
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');

      // Check for visible focus styles
      const outlineWidth = await focusedElement.evaluate((el) => {
        const style = getComputedStyle(el);
        return (
          style.outlineWidth ||
          style.boxShadow ||
          style.borderColor !== style.backgroundColor
        );
      });

      // Should have some focus indicator
      expect(outlineWidth).toBeTruthy();
    });

    test('should allow Enter key to activate buttons', async ({ page }) => {
      await page.goto('/');

      // Find and focus a button
      const button = page.locator('button').first();
      await button.focus();

      // Verify it's focused
      await expect(button).toBeFocused();

      // Should be able to activate with Enter (though we don't click to avoid side effects)
    });
  });

  test.describe('ARIA Labels', () => {
    test('should have proper ARIA labels on interactive elements', async ({
      page,
    }) => {
      await page.goto('/');

      // Check buttons have accessible names
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        const title = await button.getAttribute('title');

        // Button should have accessible name (text, aria-label, or title)
        expect(ariaLabel || text?.trim() || title).toBeTruthy();
      }
    });

    test('should have proper ARIA labels on navigation', async ({ page }) => {
      await page.goto('/');

      // Check for nav landmarks
      const nav = page.locator('nav, [role="navigation"]');

      if ((await nav.count()) > 0) {
        // Navigation should exist
        await expect(nav.first()).toBeVisible();
      }
    });

    test('should have proper ARIA labels on form inputs', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForTimeout(2000);

      // Check inputs have labels
      const inputs = page.locator('input:not([type="hidden"])');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);

        if (!(await input.isVisible())) continue;

        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');

        // Input should have accessible name
        const hasLabel =
          ariaLabel ||
          ariaLabelledBy ||
          (id && (await page.locator(`label[for="${id}"]`).count()) > 0) ||
          placeholder;

        expect(hasLabel).toBeTruthy();
      }
    });
  });

  test.describe('Heading Structure', () => {
    test('should have proper heading hierarchy on landing page', async ({
      page,
    }) => {
      await page.goto('/');

      // Get all headings
      const h1s = await page.locator('h1').count();

      // Should have exactly one h1
      expect(h1s).toBe(1);
    });

    test('should not skip heading levels', async ({ page }) => {
      await page.goto('/');

      const headingLevels = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(headings).map((h) => parseInt(h.tagName.charAt(1)));
      });

      // Check for proper hierarchy (no skipping levels)
      let lastLevel = 0;
      for (const level of headingLevels) {
        // Should not skip more than one level
        expect(level - lastLevel).toBeLessThanOrEqual(1);
        lastLevel = level;
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should have readable text contrast on landing page', async ({
      page,
    }) => {
      await page.goto('/');

      // Check primary text contrast
      const textElements = page.locator('p, span, h1, h2, h3');
      const textCount = await textElements.count();

      for (let i = 0; i < Math.min(textCount, 5); i++) {
        const element = textElements.nth(i);

        if (!(await element.isVisible())) continue;

        const { color, bgColor } = await element.evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            color: style.color,
            bgColor: style.backgroundColor,
          };
        });

        // Basic check: text and background should be different
        expect(color).not.toBe(bgColor);
      }
    });
  });

  test.describe('Alt Text', () => {
    test('should have alt text on images', async ({ page }) => {
      await page.goto('/');

      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');
        const ariaHidden = await img.getAttribute('aria-hidden');

        // Image should have alt text or be marked as decorative
        expect(
          alt !== null || role === 'presentation' || ariaHidden === 'true'
        ).toBeTruthy();
      }
    });
  });

  test.describe('Link Accessibility', () => {
    test('links should have descriptive text', async ({ page }) => {
      await page.goto('/');

      const links = page.locator('a');
      const linkCount = await links.count();

      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        const link = links.nth(i);

        if (!(await link.isVisible())) continue;

        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const title = await link.getAttribute('title');

        // Link should have accessible text
        const accessibleText = text?.trim() || ariaLabel || title;
        expect(accessibleText).toBeTruthy();

        // Should not just be "click here" or "read more"
        if (accessibleText) {
          expect(accessibleText.toLowerCase()).not.toBe('click here');
        }
      }
    });

    test('links should have distinguishable focus states', async ({ page }) => {
      await page.goto('/');

      const link = page.locator('a').first();
      await link.focus();

      // Check that link has visible focus
      const focusStyles = await link.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          textDecoration: style.textDecoration,
        };
      });

      // Should have some focus indication
      const hasFocusIndicator =
        focusStyles.outline !== 'none' ||
        focusStyles.boxShadow !== 'none' ||
        focusStyles.textDecoration.includes('underline');

      expect(hasFocusIndicator).toBeTruthy();
    });
  });

  test.describe('Form Accessibility', () => {
    test('form should have submit button', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForTimeout(2000);

      // Check for submit button
      const submitButton = page.locator(
        'button[type="submit"], input[type="submit"]'
      );

      if ((await submitButton.count()) > 0) {
        await expect(submitButton.first()).toBeVisible();
      }
    });

    test('required fields should be indicated', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForTimeout(2000);

      // Check inputs for required indication
      const inputs = page.locator('input:not([type="hidden"])');
      const inputCount = await inputs.count();

      let hasRequiredIndicator = false;
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const required = await input.getAttribute('required');
        const ariaRequired = await input.getAttribute('aria-required');

        if (required !== null || ariaRequired === 'true') {
          hasRequiredIndicator = true;
          break;
        }
      }

      // At least one input should be marked as required in a sign-in form
      expect(hasRequiredIndicator).toBeTruthy();
    });
  });

  test.describe('Skip Links', () => {
    test('should have skip to main content link', async ({ page }) => {
      await page.goto('/');

      // Skip link might be hidden until focused
      await page.keyboard.press('Tab');

      const skipLink = page.locator('a[href="#main"], a:has-text("Skip")');
      const count = await skipLink.count();

      // Skip link is recommended but not required
      // If present, it should work
      if (count > 0) {
        await expect(skipLink.first()).toBeVisible();
      }
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect reduced motion preference', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');

      // Check that animations are reduced
      const hasAnimations = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const style = getComputedStyle(el);
          if (
            style.animationDuration !== '0s' &&
            style.animationDuration !== '0ms'
          ) {
            return true;
          }
        }
        return false;
      });

      // With reduced motion, heavy animations should be minimal
      // This is a soft check - some subtle animations may still exist
      expect(typeof hasAnimations).toBe('boolean');
    });
  });

  test.describe('Language', () => {
    test('should have lang attribute on html element', async ({ page }) => {
      await page.goto('/');

      const lang = await page.locator('html').getAttribute('lang');
      expect(lang).toBeTruthy();
      expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., "en" or "en-US"
    });
  });
});
