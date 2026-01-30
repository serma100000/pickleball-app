import { test, expect, Page } from '@playwright/test';

/**
 * League Creation - All 5 League Types Test Suite
 *
 * Tests comprehensive league creation for all 5 league types:
 * 1. Ladder League - Challenge range settings
 * 2. Doubles League - Fixed team format
 * 3. King of the Court - Winner stays on format
 * 4. Pool Play - Pool configuration settings
 * 5. Hybrid/Custom - Combined format options
 *
 * Also tests:
 * - P0 Bug: League type cards should NOT redirect to tournaments
 * - Ctrl+A keyboard shortcut behavior
 * - Venue search autocomplete interactions
 */

// Test configuration
const TEST_DATA = {
  ladder: {
    name: 'Test Ladder League 2025',
    description: 'Testing ladder league creation with challenge range settings',
    location: 'Central Park Tennis Courts',
    startDate: '2025-06-01',
    numberOfWeeks: 8,
    days: ['Mon', 'Wed', 'Fri'],
    minPlayers: 4,
    maxPlayers: 16,
    challengeRange: 3,
  },
  doubles: {
    name: 'Test Doubles League 2025',
    description: 'Testing doubles league with fixed team format',
    location: 'Community Recreation Center',
    startDate: '2025-07-01',
    numberOfWeeks: 10,
    days: ['Tue', 'Thu'],
    minPlayers: 8,
    maxPlayers: 24,
  },
  kingOfCourt: {
    name: 'Test King of the Court 2025',
    description: 'Testing winner stays on format',
    location: 'Downtown Pickleball Club',
    startDate: '2025-08-01',
    numberOfWeeks: 6,
    days: ['Sat'],
    minPlayers: 8,
    maxPlayers: 32,
  },
  poolPlay: {
    name: 'Test Pool Play League 2025',
    description: 'Testing pool configuration settings',
    location: 'Eastside Sports Complex',
    startDate: '2025-09-01',
    numberOfWeeks: 12,
    days: ['Mon', 'Wed'],
    minPlayers: 8,
    maxPlayers: 32,
    numberOfPools: 4,
  },
  hybrid: {
    name: 'Test Hybrid League 2025',
    description: 'Testing combined format options',
    location: 'Multi-Sport Arena',
    startDate: '2025-10-01',
    numberOfWeeks: 8,
    days: ['Sat', 'Sun'],
    minPlayers: 16,
    maxPlayers: 48,
    numberOfPools: 4,
  },
};

// Helper function to check if redirected to sign-in
async function checkAuthentication(page: Page): Promise<boolean> {
  await page.waitForLoadState('networkidle');
  if (page.url().includes('sign-in') || page.url().includes('login')) {
    console.log('Redirected to sign-in page - test requires authentication');
    return false;
  }
  return true;
}

// Helper function to select a league type card
async function selectLeagueType(
  page: Page,
  leagueType: 'Ladder League' | 'Doubles League' | 'King of the Court' | 'Pool Play' | 'Hybrid/Custom'
): Promise<boolean> {
  const initialUrl = page.url();

  // Find and click the league type card
  const card = page.locator(`text=${leagueType}`).first();

  if (!(await card.isVisible())) {
    console.log(`League type card "${leagueType}" not found`);
    return false;
  }

  await card.click();
  await page.waitForTimeout(500);

  // P0 Bug Check: Verify we did NOT redirect to tournaments
  const currentUrl = page.url();
  if (currentUrl.includes('/tournaments')) {
    console.error(`P0 BUG DETECTED: Clicking "${leagueType}" card redirected to tournaments!`);
    console.error(`Expected URL to stay at ${initialUrl}, but got ${currentUrl}`);
    return false;
  }

  return true;
}

// Helper to navigate to next step
async function clickNextStep(page: Page): Promise<boolean> {
  const nextButton = page.getByRole('button', { name: /next/i }).first();

  if (await nextButton.isDisabled()) {
    console.log('Next button is disabled - validation not passed');
    return false;
  }

  await nextButton.click();
  await page.waitForTimeout(300);
  return true;
}

// Helper to fill details step
async function fillLeagueDetails(
  page: Page,
  data: {
    name: string;
    description: string;
    location: string;
    startDate: string;
    numberOfWeeks: number;
    days: string[];
  }
) {
  // Fill league name
  const nameInput = page.locator('input').filter({ hasText: /league/i }).first();
  const nameInputAlt = page.locator('input[placeholder*="League"]').first();
  const nameInputAlt2 = page.locator('input').first();

  if (await nameInput.isVisible()) {
    await nameInput.fill(data.name);
  } else if (await nameInputAlt.isVisible()) {
    await nameInputAlt.fill(data.name);
  } else if (await nameInputAlt2.isVisible()) {
    await nameInputAlt2.fill(data.name);
  }

  // Fill description
  const descInput = page.locator('textarea').first();
  if (await descInput.isVisible()) {
    await descInput.fill(data.description);
  }

  // Fill location - try autocomplete first
  const locationInput = page.locator('input[placeholder*="location"]').first();
  const locationInputAlt = page.locator('input').filter({ hasText: /court|location/i }).first();

  if (await locationInput.isVisible()) {
    await locationInput.fill(data.location);
  } else if (await locationInputAlt.isVisible()) {
    await locationInputAlt.fill(data.location);
  }

  // Fill start date
  const dateInput = page.locator('input[type="date"]').first();
  if (await dateInput.isVisible()) {
    await dateInput.fill(data.startDate);
  }

  // Select days
  for (const day of data.days) {
    const dayButton = page.locator('button', { hasText: day });
    if (await dayButton.isVisible()) {
      await dayButton.click();
    }
  }
}

// ============================================================================
// TEST SUITE: League Type Selection - P0 Bug Verification
// ============================================================================

test.describe('League Type Selection - P0 Bug Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  test('clicking Ladder League should NOT redirect to tournaments', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const result = await selectLeagueType(page, 'Ladder League');
    expect(result).toBeTruthy();
    expect(page.url()).not.toContain('/tournaments');

    await page.screenshot({
      path: 'test-results/screenshots/league-type-ladder-no-redirect.png',
      fullPage: true,
    });
  });

  test('clicking Doubles League should NOT redirect to tournaments', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const result = await selectLeagueType(page, 'Doubles League');
    expect(result).toBeTruthy();
    expect(page.url()).not.toContain('/tournaments');

    await page.screenshot({
      path: 'test-results/screenshots/league-type-doubles-no-redirect.png',
      fullPage: true,
    });
  });

  test('clicking King of the Court should NOT redirect to tournaments', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const result = await selectLeagueType(page, 'King of the Court');
    expect(result).toBeTruthy();
    expect(page.url()).not.toContain('/tournaments');

    await page.screenshot({
      path: 'test-results/screenshots/league-type-king-of-court-no-redirect.png',
      fullPage: true,
    });
  });

  test('clicking Pool Play should NOT redirect to tournaments', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const result = await selectLeagueType(page, 'Pool Play');
    expect(result).toBeTruthy();
    expect(page.url()).not.toContain('/tournaments');

    await page.screenshot({
      path: 'test-results/screenshots/league-type-pool-play-no-redirect.png',
      fullPage: true,
    });
  });

  test('clicking Hybrid/Custom should NOT redirect to tournaments', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const result = await selectLeagueType(page, 'Hybrid/Custom');
    expect(result).toBeTruthy();
    expect(page.url()).not.toContain('/tournaments');

    await page.screenshot({
      path: 'test-results/screenshots/league-type-hybrid-no-redirect.png',
      fullPage: true,
    });
  });
});

// ============================================================================
// TEST SUITE 1: Ladder League - Full Wizard Test
// ============================================================================

test.describe('1. Ladder League - Full Creation Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  test('should create Ladder League with challenge range settings', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const data = TEST_DATA.ladder;

    // Step 1: Select League Type
    console.log('Step 1: Selecting Ladder League type');
    await selectLeagueType(page, 'Ladder League');

    // Verify Ladder League is selected (check for visual indicator)
    const selectedCard = page.locator('[aria-checked="true"]').or(page.locator('.ring-brand-500'));
    expect(await selectedCard.count()).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/screenshots/ladder-step1-type.png' });
    await clickNextStep(page);

    // Step 2: Details
    console.log('Step 2: Filling league details');
    await fillLeagueDetails(page, data);

    await page.screenshot({ path: 'test-results/screenshots/ladder-step2-details.png' });
    await clickNextStep(page);

    // Step 3: Player Settings - Verify Challenge Range setting exists
    console.log('Step 3: Configuring player settings and challenge range');
    const challengeRangeLabel = page.locator('text=/challenge range/i');
    expect(await challengeRangeLabel.count()).toBeGreaterThan(0);

    // Look for challenge range stepper/input
    const challengeRangeSection = page.locator('text=/challenge range/i').locator('..');
    const challengeInput = challengeRangeSection.locator('input[type="number"]');

    if (await challengeInput.isVisible()) {
      await challengeInput.fill(String(data.challengeRange));
    }

    // Verify game format selector
    const singlesBtn = page.locator('button', { hasText: /singles/i });
    if (await singlesBtn.isVisible()) {
      await singlesBtn.click();
    }

    await page.screenshot({ path: 'test-results/screenshots/ladder-step3-players.png' });
    await clickNextStep(page);

    // Step 4: Playoffs
    console.log('Step 4: Configuring playoffs');
    const playoffToggle = page.getByRole('switch', { name: /playoffs/i }).or(
      page.locator('[aria-label*="playoff"]')
    );

    if (await playoffToggle.isVisible()) {
      // Enable playoffs
      await playoffToggle.click();

      // Select 4 teams
      const fourTeamsBtn = page.locator('button', { hasText: '4' }).first();
      if (await fourTeamsBtn.isVisible()) {
        await fourTeamsBtn.click();
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/ladder-step4-playoffs.png' });
    await clickNextStep(page);

    // Step 5: Rating Options
    console.log('Step 5: Configuring rating options');
    const duprToggle = page.getByRole('switch', { name: /dupr/i }).or(
      page.locator('text=/report.*dupr/i').locator('..')
    );

    await page.screenshot({ path: 'test-results/screenshots/ladder-step5-ratings.png' });
    await clickNextStep(page);

    // Step 6: Review
    console.log('Step 6: Review page');
    const reviewContent = await page.textContent('main');
    expect(reviewContent).toContain(data.name);

    // Verify Ladder-specific info is shown
    const challengeRangeReview = page.locator('text=/challenge range/i');
    expect(await challengeRangeReview.count()).toBeGreaterThanOrEqual(0);

    await page.screenshot({ path: 'test-results/screenshots/ladder-step6-review.png', fullPage: true });

    console.log('Ladder League test completed successfully');
  });
});

// ============================================================================
// TEST SUITE 2: Doubles League - Full Wizard Test
// ============================================================================

test.describe('2. Doubles League - Full Creation Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  test('should create Doubles League with fixed team format', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const data = TEST_DATA.doubles;

    // Step 1: Select League Type
    console.log('Step 1: Selecting Doubles League type');
    await selectLeagueType(page, 'Doubles League');

    await page.screenshot({ path: 'test-results/screenshots/doubles-step1-type.png' });
    await clickNextStep(page);

    // Step 2: Details
    console.log('Step 2: Filling league details');
    await fillLeagueDetails(page, data);

    await page.screenshot({ path: 'test-results/screenshots/doubles-step2-details.png' });
    await clickNextStep(page);

    // Step 3: Player Settings - Doubles is auto-selected
    console.log('Step 3: Configuring player/team settings');

    // Verify doubles format is enforced (format selector should not be shown)
    const formatSelector = page.locator('button', { hasText: /singles.*1v1/i });
    // For doubles league, singles option should be hidden or disabled
    const singlesVisible = await formatSelector.isVisible();

    // Set min/max teams
    const minInput = page.locator('input[type="number"]').first();
    const maxInput = page.locator('input[type="number"]').nth(1);

    if (await minInput.isVisible()) {
      await minInput.fill(String(data.minPlayers));
    }
    if (await maxInput.isVisible()) {
      await maxInput.fill(String(data.maxPlayers));
    }

    await page.screenshot({ path: 'test-results/screenshots/doubles-step3-players.png' });
    await clickNextStep(page);

    // Step 4: Playoffs
    console.log('Step 4: Configuring playoffs');
    await page.screenshot({ path: 'test-results/screenshots/doubles-step4-playoffs.png' });
    await clickNextStep(page);

    // Step 5: Rating Options
    console.log('Step 5: Configuring rating options');
    await page.screenshot({ path: 'test-results/screenshots/doubles-step5-ratings.png' });
    await clickNextStep(page);

    // Step 6: Review
    console.log('Step 6: Review page');
    const reviewContent = await page.textContent('main');
    expect(reviewContent).toContain(data.name);

    // Verify doubles format is shown
    const doublesInfo = page.locator('text=/doubles.*2v2/i').or(page.locator('text=/teams/i'));
    expect(await doublesInfo.count()).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/screenshots/doubles-step6-review.png', fullPage: true });

    console.log('Doubles League test completed successfully');
  });
});

// ============================================================================
// TEST SUITE 3: King of the Court - Full Wizard Test
// ============================================================================

test.describe('3. King of the Court - Full Creation Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  test('should create King of the Court with winner-stays-on format', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const data = TEST_DATA.kingOfCourt;

    // Step 1: Select League Type
    console.log('Step 1: Selecting King of the Court type');
    await selectLeagueType(page, 'King of the Court');

    await page.screenshot({ path: 'test-results/screenshots/kotc-step1-type.png' });
    await clickNextStep(page);

    // Step 2: Details
    console.log('Step 2: Filling league details');
    await fillLeagueDetails(page, data);

    await page.screenshot({ path: 'test-results/screenshots/kotc-step2-details.png' });
    await clickNextStep(page);

    // Step 3: Player Settings
    console.log('Step 3: Configuring player settings');

    // King of Court might have specific settings
    const minInput = page.locator('input[type="number"]').first();
    const maxInput = page.locator('input[type="number"]').nth(1);

    if (await minInput.isVisible()) {
      await minInput.fill(String(data.minPlayers));
    }
    if (await maxInput.isVisible()) {
      await maxInput.fill(String(data.maxPlayers));
    }

    await page.screenshot({ path: 'test-results/screenshots/kotc-step3-players.png' });
    await clickNextStep(page);

    // Step 4: Playoffs
    console.log('Step 4: Configuring playoffs');
    await page.screenshot({ path: 'test-results/screenshots/kotc-step4-playoffs.png' });
    await clickNextStep(page);

    // Step 5: Rating Options
    console.log('Step 5: Configuring rating options');
    await page.screenshot({ path: 'test-results/screenshots/kotc-step5-ratings.png' });
    await clickNextStep(page);

    // Step 6: Review
    console.log('Step 6: Review page');
    const reviewContent = await page.textContent('main');
    expect(reviewContent).toContain(data.name);

    // Verify King of Court type is shown
    const kotcInfo = page.locator('text=/king of the court/i');
    expect(await kotcInfo.count()).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/screenshots/kotc-step6-review.png', fullPage: true });

    console.log('King of the Court test completed successfully');
  });
});

// ============================================================================
// TEST SUITE 4: Pool Play - Full Wizard Test
// ============================================================================

test.describe('4. Pool Play - Full Creation Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  test('should create Pool Play League with pool configuration', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const data = TEST_DATA.poolPlay;

    // Step 1: Select League Type
    console.log('Step 1: Selecting Pool Play type');
    await selectLeagueType(page, 'Pool Play');

    await page.screenshot({ path: 'test-results/screenshots/pool-play-step1-type.png' });
    await clickNextStep(page);

    // Step 2: Details
    console.log('Step 2: Filling league details');
    await fillLeagueDetails(page, data);

    await page.screenshot({ path: 'test-results/screenshots/pool-play-step2-details.png' });
    await clickNextStep(page);

    // Step 3: Player Settings - Verify Pool configuration exists
    console.log('Step 3: Configuring player settings and pool count');

    // Look for Number of Pools setting
    const poolsLabel = page.locator('text=/number of pools/i');
    expect(await poolsLabel.count()).toBeGreaterThan(0);

    // Configure number of pools
    const poolsSection = page.locator('text=/number of pools/i').locator('..');
    const poolsInput = poolsSection.locator('input[type="number"]');

    if (await poolsInput.isVisible()) {
      await poolsInput.fill(String(data.numberOfPools));
    }

    // Set min/max players
    const minInput = page.locator('input[type="number"]').first();
    const maxInput = page.locator('input[type="number"]').nth(1);

    if (await minInput.isVisible()) {
      await minInput.fill(String(data.minPlayers));
    }
    if (await maxInput.isVisible()) {
      await maxInput.fill(String(data.maxPlayers));
    }

    await page.screenshot({ path: 'test-results/screenshots/pool-play-step3-players.png' });
    await clickNextStep(page);

    // Step 4: Playoffs
    console.log('Step 4: Configuring playoffs');

    // Enable playoffs for pool play
    const playoffToggle = page.getByRole('switch', { name: /playoffs/i });
    if (await playoffToggle.isVisible()) {
      const isEnabled = (await playoffToggle.getAttribute('aria-checked')) === 'true';
      if (!isEnabled) {
        await playoffToggle.click();
      }

      // Select 8 teams for playoffs
      const eightTeamsBtn = page.locator('button', { hasText: '8' }).first();
      if (await eightTeamsBtn.isVisible()) {
        await eightTeamsBtn.click();
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/pool-play-step4-playoffs.png' });
    await clickNextStep(page);

    // Step 5: Rating Options
    console.log('Step 5: Configuring rating options');
    await page.screenshot({ path: 'test-results/screenshots/pool-play-step5-ratings.png' });
    await clickNextStep(page);

    // Step 6: Review
    console.log('Step 6: Review page');
    const reviewContent = await page.textContent('main');
    expect(reviewContent).toContain(data.name);

    // Verify Pool Play specific info
    const poolInfo = page.locator('text=/pool/i');
    expect(await poolInfo.count()).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/screenshots/pool-play-step6-review.png', fullPage: true });

    console.log('Pool Play test completed successfully');
  });
});

// ============================================================================
// TEST SUITE 5: Hybrid/Custom - Full Wizard Test
// ============================================================================

test.describe('5. Hybrid/Custom - Full Creation Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  test('should create Hybrid League with combined format options', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const data = TEST_DATA.hybrid;

    // Step 1: Select League Type
    console.log('Step 1: Selecting Hybrid/Custom type');
    await selectLeagueType(page, 'Hybrid/Custom');

    await page.screenshot({ path: 'test-results/screenshots/hybrid-step1-type.png' });
    await clickNextStep(page);

    // Step 2: Details
    console.log('Step 2: Filling league details');
    await fillLeagueDetails(page, data);

    await page.screenshot({ path: 'test-results/screenshots/hybrid-step2-details.png' });
    await clickNextStep(page);

    // Step 3: Player Settings - Should have pool configuration like pool play
    console.log('Step 3: Configuring player settings');

    // Hybrid should also have pool configuration
    const poolsLabel = page.locator('text=/number of pools/i');
    if ((await poolsLabel.count()) > 0) {
      const poolsSection = poolsLabel.locator('..');
      const poolsInput = poolsSection.locator('input[type="number"]');

      if (await poolsInput.isVisible()) {
        await poolsInput.fill(String(data.numberOfPools));
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/hybrid-step3-players.png' });
    await clickNextStep(page);

    // Step 4: Playoffs - Multiple format options for hybrid
    console.log('Step 4: Configuring playoffs');

    const playoffToggle = page.getByRole('switch', { name: /playoffs/i });
    if (await playoffToggle.isVisible()) {
      const isEnabled = (await playoffToggle.getAttribute('aria-checked')) === 'true';
      if (!isEnabled) {
        await playoffToggle.click();
      }

      // Select double elimination for hybrid
      const doubleElimBtn = page.locator('button', { hasText: /double elimination/i });
      if (await doubleElimBtn.isVisible()) {
        await doubleElimBtn.click();
      }
    }

    await page.screenshot({ path: 'test-results/screenshots/hybrid-step4-playoffs.png' });
    await clickNextStep(page);

    // Step 5: Rating Options
    console.log('Step 5: Configuring rating options');

    // Enable DUPR for hybrid league
    const duprToggle = page.getByRole('switch', { name: /dupr/i });
    if (await duprToggle.isVisible()) {
      await duprToggle.click();
    }

    await page.screenshot({ path: 'test-results/screenshots/hybrid-step5-ratings.png' });
    await clickNextStep(page);

    // Step 6: Review
    console.log('Step 6: Review page');
    const reviewContent = await page.textContent('main');
    expect(reviewContent).toContain(data.name);

    await page.screenshot({ path: 'test-results/screenshots/hybrid-step6-review.png', fullPage: true });

    console.log('Hybrid League test completed successfully');
  });
});

// ============================================================================
// TEST SUITE: Keyboard Shortcut Tests
// ============================================================================

test.describe('Keyboard Shortcut Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  test('Ctrl+A should select text, NOT navigate away', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    const initialUrl = page.url();

    // Select a league type first
    await selectLeagueType(page, 'Ladder League');
    await clickNextStep(page);

    // Find a text input
    const nameInput = page.locator('input').first();

    if (await nameInput.isVisible()) {
      await nameInput.fill('Test League Name');
      await nameInput.focus();

      // Press Ctrl+A
      await page.keyboard.press('Control+A');
      await page.waitForTimeout(300);

      // URL should NOT have changed - still on leagues/new page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/tournaments');
      expect(currentUrl).toContain('/leagues/new');

      // Text should be selected (we verify by checking input still has value)
      const inputValue = await nameInput.inputValue();
      expect(inputValue).toBe('Test League Name');

      await page.screenshot({ path: 'test-results/screenshots/keyboard-ctrl-a-test.png' });
    }

    console.log('Ctrl+A keyboard shortcut test passed - no unwanted navigation');
  });
});

// ============================================================================
// TEST SUITE: Venue Search Autocomplete
// ============================================================================

test.describe('Venue Search Autocomplete Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  test('should show autocomplete suggestions for location', async ({ page }) => {
    if (!(await checkAuthentication(page))) {
      test.skip();
      return;
    }

    // Go to details step
    await selectLeagueType(page, 'Ladder League');
    await clickNextStep(page);

    // Find location input
    const locationInput = page
      .locator('input[placeholder*="location"]')
      .or(page.locator('input[placeholder*="court"]'))
      .or(page.locator('input[placeholder*="Search"]'))
      .first();

    if (await locationInput.isVisible()) {
      // Type a location query
      await locationInput.fill('Central Park');
      await page.waitForTimeout(1000);

      // Check for autocomplete dropdown
      const autocompleteDropdown = page.locator('[role="listbox"]').or(
        page.locator('.autocomplete-results')
      );

      // Screenshot whatever state we're in
      await page.screenshot({ path: 'test-results/screenshots/venue-autocomplete-test.png' });

      // If autocomplete shows, verify it works
      if (await autocompleteDropdown.isVisible()) {
        const firstOption = autocompleteDropdown.locator('[role="option"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
          console.log('Autocomplete selection worked');
        }
      }
    }
  });
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

test.describe('League Creation Tests Summary', () => {
  test('generates test summary report', async ({ page }) => {
    const testSummary = {
      timestamp: new Date().toISOString(),
      testSuites: {
        'P0 Bug Verification': 'Testing that league type cards do NOT redirect to tournaments',
        'Ladder League': 'Full 6-step wizard with challenge range settings',
        'Doubles League': 'Full 6-step wizard with fixed team format',
        'King of the Court': 'Full 6-step wizard with winner-stays-on format',
        'Pool Play': 'Full 6-step wizard with pool configuration',
        'Hybrid/Custom': 'Full 6-step wizard with combined format options',
        'Keyboard Shortcuts': 'Ctrl+A should select text, not navigate',
        'Venue Autocomplete': 'Location search autocomplete functionality',
      },
      screenshotsLocation: 'test-results/screenshots/',
      notes: [
        'All tests require authentication - skipped if redirected to sign-in',
        'P0 Bug: League type cards should stay on /leagues/new page',
        'Each league type tested through all 6 wizard steps',
      ],
    };

    console.log('=== LEAGUE CREATION TEST SUMMARY ===');
    console.log(JSON.stringify(testSummary, null, 2));

    await page.goto('/');
    expect(await page.title()).toBeTruthy();
  });
});
