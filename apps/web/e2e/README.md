# Paddle Up E2E Tests

Comprehensive end-to-end testing suite using Playwright.

## Test Structure

```
e2e/
  landing.spec.ts      # Landing page tests
  auth.spec.ts         # Authentication flow tests
  dashboard.spec.ts    # Dashboard tests (protected)
  tournaments.spec.ts  # Tournament flow tests
  games.spec.ts        # Games flow tests
  mobile.spec.ts       # Mobile-specific tests
  dark-mode.spec.ts    # Theme toggle tests
  pwa.spec.ts          # PWA feature tests
  accessibility.spec.ts # Accessibility tests
  fixtures.ts          # Test utilities and helpers
```

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Run with browser visible
pnpm test:e2e:headed

# Debug mode
pnpm test:e2e:debug

# View test report
pnpm test:e2e:report

# Update snapshots
pnpm test:e2e:update-snapshots
```

## Running Specific Tests

```bash
# Run a single test file
pnpm test:e2e landing

# Run tests matching a pattern
pnpm test:e2e -g "should display"

# Run tests for a specific browser
pnpm test:e2e --project="Mobile Chrome"
```

## Browser Projects

Tests run against multiple browsers and devices:

- **Desktop Chrome** - Primary desktop browser
- **Desktop Firefox** - Firefox support
- **Desktop Safari** - WebKit/Safari support
- **Mobile Chrome** - Pixel 5 emulation
- **Mobile Safari** - iPhone 12 emulation
- **Tablet** - iPad Pro 11 emulation

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- Base URL: `http://localhost:3000` (configurable via `PLAYWRIGHT_BASE_URL`)
- Screenshots: On failure only
- Video: On first retry only
- Trace: On first retry only
- Timeout: 60 seconds per test
- Action timeout: 10 seconds

## Test Categories

### Landing Page (`landing.spec.ts`)
- Hero section visibility
- Navigation functionality
- CTA button functionality
- Footer links
- Responsive design

### Authentication (`auth.spec.ts`)
- Sign in page loads
- Sign up page loads
- Clerk UI visible
- Protected route redirects
- Auth page accessibility

### Dashboard (`dashboard.spec.ts`)
- Redirect when unauthenticated
- Stats cards (when authenticated)
- Navigation structure
- Quick actions

### Tournaments (`tournaments.spec.ts`)
- Protected route access
- Tournament list loading
- Create wizard structure
- Format options

### Games (`games.spec.ts`)
- Protected route access
- Games list structure
- Log game form
- Score entry

### Mobile (`mobile.spec.ts`)
- Touch target sizes (44px minimum)
- Mobile navigation
- Bottom nav functionality
- Viewport and content
- No horizontal scroll

### Dark Mode (`dark-mode.spec.ts`)
- Theme toggle functionality
- Theme persistence
- Dark mode styles
- System preference respect

### PWA (`pwa.spec.ts`)
- Meta tags (theme-color, viewport)
- Manifest file validity
- Install prompt (mobile)
- Service worker

### Accessibility (`accessibility.spec.ts`)
- Keyboard navigation
- ARIA labels
- Heading structure
- Color contrast
- Alt text on images
- Link accessibility
- Form accessibility

## Writing Tests

### Best Practices

1. **Use resilient selectors**
   ```typescript
   // Prefer role-based selectors
   page.getByRole('button', { name: /submit/i })

   // Or data-testid for complex components
   page.locator('[data-testid="stats-card"]')
   ```

2. **Handle async content**
   ```typescript
   // Wait for Clerk to load
   await page.waitForTimeout(2000);

   // Wait for network idle
   await page.waitForLoadState('networkidle');
   ```

3. **Skip tests appropriately**
   ```typescript
   // Skip mobile-only tests on desktop
   test.skip(!isMobile, 'Mobile-only test');

   // Skip if redirected (protected route)
   if (page.url().includes('sign-in')) {
     test.skip();
     return;
   }
   ```

4. **Test protected routes**
   ```typescript
   // Verify redirect to sign-in
   await page.goto('/dashboard');
   await expect(page).toHaveURL(/sign-in/);
   ```

### Adding data-testid Attributes

For complex selectors, add `data-testid` attributes to components:

```tsx
<div data-testid="stats-card">
  ...
</div>
```

## CI Integration

For CI environments:
- Set `PLAYWRIGHT_BASE_URL` to your preview/staging URL
- Tests will retry 2 times on failure
- GitHub Actions reporter is enabled

## Troubleshooting

### Tests timeout
- Increase timeout in config
- Check if dev server is running
- Verify base URL is correct

### Clerk tests fail
- Clerk loads asynchronously - add wait times
- Check Clerk environment variables

### Mobile tests fail
- Ensure running with correct project
- Check viewport size in test

### Screenshots not captured
- Screenshots only on failure by default
- Use `screenshot: 'on'` for all tests
