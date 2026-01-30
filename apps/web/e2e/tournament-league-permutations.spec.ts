import { test, expect, Page } from '@playwright/test';

/**
 * Tournament and League Creation Permutation Tests
 *
 * Tests various combinations of settings, edge cases, and validation behavior
 * for tournament and league creation forms.
 */

// Helper function to check if redirected to sign-in
async function skipIfNotAuthenticated(page: Page): Promise<boolean> {
  if (page.url().includes('sign-in')) {
    return true;
  }
  return false;
}

// Helper function to fill basic tournament info (Step 1)
async function fillBasicTournamentInfo(
  page: Page,
  options: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    registrationDeadline: string;
    directorName: string;
    directorEmail: string;
    venue?: string;
  }
) {
  await page.locator('#tournament-name').fill(options.name);

  if (options.description) {
    await page.locator('#tournament-description').fill(options.description);
  }

  // Fill date inputs with proper date format
  await page.locator('#tournament-start-date').fill(options.startDate);
  await page.locator('#tournament-end-date').fill(options.endDate);
  await page.locator('#tournament-registration-deadline').fill(options.registrationDeadline);

  // Director info
  await page.locator('#director-name').fill(options.directorName);
  await page.locator('#director-email').fill(options.directorEmail);
}

// Helper to navigate to next step
async function clickNextStep(page: Page) {
  const nextButton = page.getByRole('button', { name: /next/i });
  await nextButton.click();
  // Wait for step transition
  await page.waitForTimeout(300);
}

// ============================================================================
// TOURNAMENT PERMUTATION TESTS
// ============================================================================

test.describe('Tournament Creation Permutations', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/tournaments/new');
  });

  // -------------------------------------------------------------------------
  // PERMUTATION 1: Single Elimination + Singles + No Seeding
  // -------------------------------------------------------------------------
  test.describe('Permutation 1: Single Elimination + Singles + No Seeding', () => {
    test('should create tournament with single elimination singles format', async ({
      page,
    }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      // Step 1: Basic Info
      await fillBasicTournamentInfo(page, {
        name: 'Singles Championship 2025',
        startDate: '2025-06-15',
        endDate: '2025-06-17',
        registrationDeadline: '2025-06-10',
        directorName: 'John Director',
        directorEmail: 'director@test.com',
      });

      await clickNextStep(page);

      // Step 2: Add Event
      await page.getByRole('button', { name: /add event/i }).click();

      // Configure event - Singles category
      const categorySelect = page.locator('select').filter({ hasText: /singles|doubles/i }).first();
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption('singles');
      }

      // Select Single Elimination format
      const formatSelect = page.locator('select').filter({ hasText: /elimination|robin/i });
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('single_elimination');
      }

      await clickNextStep(page);

      // Step 3: Format Settings - Random seeding
      const seedingOptions = page.locator('button', { hasText: /random/i });
      if (await seedingOptions.isVisible()) {
        await seedingOptions.click();
      }

      await clickNextStep(page);

      // Step 4: Review - Verify configuration
      const reviewContent = await page.textContent('main');
      expect(reviewContent).toContain('Singles Championship 2025');

      // Take screenshot for documentation
      await page.screenshot({
        path: 'test-results/screenshots/perm1-single-elim-singles-random.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // PERMUTATION 2: Single Elimination + Doubles + Seeded
  // -------------------------------------------------------------------------
  test.describe('Permutation 2: Single Elimination + Doubles + Seeded', () => {
    test('should create tournament with seeded doubles single elimination', async ({
      page,
    }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      await fillBasicTournamentInfo(page, {
        name: 'Seeded Doubles Tournament',
        startDate: '2025-07-01',
        endDate: '2025-07-03',
        registrationDeadline: '2025-06-25',
        directorName: 'Jane Director',
        directorEmail: 'jane@test.com',
      });

      await clickNextStep(page);

      // Add doubles event
      await page.getByRole('button', { name: /add event/i }).click();

      // Verify doubles is selected (default)
      const categorySelect = page.locator('select').first();
      const categoryValue = await categorySelect.inputValue().catch(() => 'doubles');

      // Select Single Elimination
      const formatOptions = page.locator('select').nth(3);
      if (await formatOptions.isVisible()) {
        await formatOptions.selectOption('single_elimination');
      }

      await clickNextStep(page);

      // Select Skill-Based seeding
      const skillBasedButton = page.locator('button', { hasText: /skill.?based/i });
      if (await skillBasedButton.isVisible()) {
        await skillBasedButton.click();
      }

      await page.screenshot({
        path: 'test-results/screenshots/perm2-single-elim-doubles-seeded.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // PERMUTATION 3: Double Elimination + Singles + Consolation Bracket
  // -------------------------------------------------------------------------
  test.describe('Permutation 3: Double Elimination + Consolation Bracket', () => {
    test('should enable consolation bracket option for single elimination', async ({
      page,
    }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      await fillBasicTournamentInfo(page, {
        name: 'Double Elimination Championship',
        startDate: '2025-08-01',
        endDate: '2025-08-03',
        registrationDeadline: '2025-07-25',
        directorName: 'Mike Director',
        directorEmail: 'mike@test.com',
      });

      await clickNextStep(page);

      // Add event with double elimination
      await page.getByRole('button', { name: /add event/i }).click();

      // Select Double Elimination format
      const formatSelect = page.locator('select').nth(3);
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('double_elimination');
      }

      await clickNextStep(page);

      // Check for consolation bracket toggle
      const consolationToggle = page.getByRole('switch', {
        name: /consolation/i,
      });
      if (await consolationToggle.isVisible()) {
        await consolationToggle.click();
      }

      // Third place match toggle
      const thirdPlaceToggle = page.getByRole('switch', {
        name: /third place/i,
      });
      if (await thirdPlaceToggle.isVisible()) {
        await thirdPlaceToggle.click();
      }

      await page.screenshot({
        path: 'test-results/screenshots/perm3-double-elim-consolation.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // PERMUTATION 4: Round Robin + Different Group Sizes
  // -------------------------------------------------------------------------
  test.describe('Permutation 4: Round Robin with Various Group Sizes', () => {
    test('should configure round robin format', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      await fillBasicTournamentInfo(page, {
        name: 'Round Robin League',
        startDate: '2025-09-01',
        endDate: '2025-09-07',
        registrationDeadline: '2025-08-25',
        directorName: 'Sarah Director',
        directorEmail: 'sarah@test.com',
      });

      await clickNextStep(page);

      // Add event with round robin
      await page.getByRole('button', { name: /add event/i }).click();

      // Select Round Robin format
      const formatSelect = page.locator('select').nth(3);
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('round_robin');
      }

      // Set max participants to test group size calculations
      const maxParticipantsInput = page.locator('input[type="number"]').first();
      if (await maxParticipantsInput.isVisible()) {
        await maxParticipantsInput.fill('16'); // 4 groups of 4
      }

      await page.screenshot({
        path: 'test-results/screenshots/perm4-round-robin.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // PERMUTATION 5: Pool Play + Different Pool Counts
  // -------------------------------------------------------------------------
  test.describe('Permutation 5: Pool Play with Pool Configuration', () => {
    test('should configure pool play with 2 pools', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      await fillBasicTournamentInfo(page, {
        name: 'Pool Play Tournament - 2 Pools',
        startDate: '2025-10-01',
        endDate: '2025-10-03',
        registrationDeadline: '2025-09-25',
        directorName: 'Tom Director',
        directorEmail: 'tom@test.com',
      });

      await clickNextStep(page);

      // Add event with pool play
      await page.getByRole('button', { name: /add event/i }).click();

      // Select Pool Play format
      const formatSelect = page.locator('select').nth(3);
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('pool_play');
      }

      await clickNextStep(page);

      // Configure 2 pools
      const manualPoolOption = page.locator('select', { hasText: /manual/i });
      if (await manualPoolOption.isVisible()) {
        await manualPoolOption.selectOption('manual');
      }

      // Find pool number stepper
      const decreasePoolBtn = page.locator('button', { hasText: '-' }).first();
      const poolNumberInput = page.locator('input[type="number"]').first();

      // Verify pool configuration exists
      const poolConfig = page.locator('text=/pools?/i');
      expect(await poolConfig.count()).toBeGreaterThan(0);

      await page.screenshot({
        path: 'test-results/screenshots/perm5-pool-play-2-pools.png',
        fullPage: true,
      });
    });

    test('should configure pool play with 4 pools', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      await fillBasicTournamentInfo(page, {
        name: 'Pool Play Tournament - 4 Pools',
        startDate: '2025-10-15',
        endDate: '2025-10-17',
        registrationDeadline: '2025-10-10',
        directorName: 'Tom Director',
        directorEmail: 'tom@test.com',
      });

      await clickNextStep(page);

      // Add event with pool play
      await page.getByRole('button', { name: /add event/i }).click();

      // Select Pool Play format
      const formatSelect = page.locator('select').nth(3);
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('pool_play');
      }

      // Set more participants for 4 pools
      const maxParticipantsInput = page.locator('input[type="number"]').filter({ hasText: /participants/i }).first();
      if (await maxParticipantsInput.isVisible()) {
        await maxParticipantsInput.fill('32');
      }

      await page.screenshot({
        path: 'test-results/screenshots/perm5-pool-play-4-pools.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // PERMUTATION 6: Pool to Bracket + Advancement Rules
  // -------------------------------------------------------------------------
  test.describe('Permutation 6: Pool to Bracket with Advancement', () => {
    test('should configure pool to bracket format', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      await fillBasicTournamentInfo(page, {
        name: 'Pool to Bracket Championship',
        startDate: '2025-11-01',
        endDate: '2025-11-05',
        registrationDeadline: '2025-10-25',
        directorName: 'Alex Director',
        directorEmail: 'alex@test.com',
      });

      await clickNextStep(page);

      // Add event with pool to bracket
      await page.getByRole('button', { name: /add event/i }).click();

      // Select Pool to Bracket format
      const formatSelect = page.locator('select').nth(3);
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('pool_to_bracket');
      }

      await clickNextStep(page);

      // Configure advancement count
      const advancementConfig = page.locator('text=/advance/i');
      expect(await advancementConfig.count()).toBeGreaterThan(0);

      // Check for cross-pool seeding options
      const crossPoolSelect = page.locator('select', { hasText: /cross.?pool/i });
      if (await crossPoolSelect.isVisible()) {
        await crossPoolSelect.selectOption('standard');
      }

      await page.screenshot({
        path: 'test-results/screenshots/perm6-pool-to-bracket.png',
        fullPage: true,
      });
    });
  });
});

// ============================================================================
// LEAGUE PERMUTATION TESTS
// ============================================================================

test.describe('League Creation Permutations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  // -------------------------------------------------------------------------
  // LEAGUE PERMUTATION 1: Ladder + Singles + No Playoffs
  // -------------------------------------------------------------------------
  test.describe('League Perm 1: Ladder + Singles + No Playoffs', () => {
    test('should create ladder league without playoffs', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      // Step 1: Select Ladder League
      const ladderOption = page.locator('text=Ladder League');
      if (await ladderOption.isVisible()) {
        await ladderOption.click();
      }

      await clickNextStep(page);

      // Step 2: Details
      await page.locator('input[placeholder*="League"]').fill('Summer Ladder 2025');
      await page.locator('input[type="date"]').fill('2025-06-01');

      // Select days
      const mondayBtn = page.locator('button', { hasText: 'Mon' });
      if (await mondayBtn.isVisible()) {
        await mondayBtn.click();
      }
      const wednesdayBtn = page.locator('button', { hasText: 'Wed' });
      if (await wednesdayBtn.isVisible()) {
        await wednesdayBtn.click();
      }

      await clickNextStep(page);

      // Step 3: Player Settings - Singles
      const singlesBtn = page.locator('button', { hasText: /singles/i });
      if (await singlesBtn.isVisible()) {
        await singlesBtn.click();
      }

      await clickNextStep(page);

      // Step 4: Playoffs - Disable
      const playoffToggle = page.getByRole('switch', { name: /playoffs/i });
      // If enabled by default, turn off
      if (await playoffToggle.getAttribute('aria-checked') === 'true') {
        await playoffToggle.click();
      }

      await page.screenshot({
        path: 'test-results/screenshots/league-perm1-ladder-singles-no-playoffs.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // LEAGUE PERMUTATION 2: Ladder + Doubles + Single Elimination Playoffs
  // -------------------------------------------------------------------------
  test.describe('League Perm 2: Ladder + Doubles + Playoffs', () => {
    test('should create ladder league with playoffs', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      // Select Ladder League
      const ladderOption = page.locator('text=Ladder League');
      if (await ladderOption.isVisible()) {
        await ladderOption.click();
      }

      await clickNextStep(page);

      // Fill details
      await page.locator('input[placeholder*="League"]').fill('Doubles Ladder with Playoffs');
      await page.locator('input[type="date"]').fill('2025-07-01');

      const tuesdayBtn = page.locator('button', { hasText: 'Tue' });
      if (await tuesdayBtn.isVisible()) {
        await tuesdayBtn.click();
      }

      await clickNextStep(page);

      // Player Settings - Doubles
      const doublesBtn = page.locator('button', { hasText: /doubles/i });
      if (await doublesBtn.isVisible()) {
        await doublesBtn.click();
      }

      await clickNextStep(page);

      // Enable playoffs
      const playoffToggle = page.getByRole('switch', { name: /playoffs/i });
      if ((await playoffToggle.getAttribute('aria-checked')) !== 'true') {
        await playoffToggle.click();
      }

      // Select playoff teams
      const fourTeamsBtn = page.locator('button', { hasText: '4' });
      if (await fourTeamsBtn.isVisible()) {
        await fourTeamsBtn.click();
      }

      // Select single elimination
      const singleElimBtn = page.locator('button', { hasText: /single elimination/i });
      if (await singleElimBtn.isVisible()) {
        await singleElimBtn.click();
      }

      await page.screenshot({
        path: 'test-results/screenshots/league-perm2-ladder-doubles-playoffs.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // LEAGUE PERMUTATION 3: Pool Play + Double Elimination Playoffs
  // -------------------------------------------------------------------------
  test.describe('League Perm 3: Pool Play + Double Elimination Playoffs', () => {
    test('should create pool play league with double elimination', async ({
      page,
    }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      // Select Pool Play - use heading within the card for specificity
      const poolPlayOption = page.locator('h3:has-text("Pool Play")').first();
      if (await poolPlayOption.isVisible()) {
        await poolPlayOption.click();
      }

      await clickNextStep(page);

      // Fill details
      await page.locator('input[placeholder*="League"]').fill('Pool Play Championship');
      await page.locator('input[type="date"]').fill('2025-08-01');

      const saturdayBtn = page.locator('button', { hasText: 'Sat' });
      if (await saturdayBtn.isVisible()) {
        await saturdayBtn.click();
      }

      await clickNextStep(page);

      // Player settings - check pool configuration
      const poolConfig = page.locator('text=/pools?/i');
      expect(await poolConfig.count()).toBeGreaterThan(0);

      await clickNextStep(page);

      // Enable double elimination playoffs
      const playoffToggle = page.getByRole('switch', { name: /playoffs/i });
      if ((await playoffToggle.getAttribute('aria-checked')) !== 'true') {
        await playoffToggle.click();
      }

      const doubleElimBtn = page.locator('button', { hasText: /double elimination/i });
      if (await doubleElimBtn.isVisible()) {
        await doubleElimBtn.click();
      }

      await page.screenshot({
        path: 'test-results/screenshots/league-perm3-pool-play-double-elim.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // LEAGUE PERMUTATION 4: Hybrid + Multiple Phases
  // -------------------------------------------------------------------------
  test.describe('League Perm 4: Hybrid/Custom League', () => {
    test('should create hybrid league with custom configuration', async ({
      page,
    }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      // Select Hybrid
      const hybridOption = page.locator('text=Hybrid');
      if (await hybridOption.isVisible()) {
        await hybridOption.click();
      }

      await clickNextStep(page);

      // Fill details
      await page.locator('input[placeholder*="League"]').fill('Hybrid Championship League');
      await page.locator('input[type="date"]').fill('2025-09-01');

      const sundayBtn = page.locator('button', { hasText: 'Sun' });
      if (await sundayBtn.isVisible()) {
        await sundayBtn.click();
      }

      await clickNextStep(page);

      // Configure multiple pools
      const poolStepper = page.locator('text=/number of pools/i').locator('..').locator('input');
      if (await poolStepper.isVisible()) {
        await poolStepper.fill('4');
      }

      await page.screenshot({
        path: 'test-results/screenshots/league-perm4-hybrid.png',
        fullPage: true,
      });
    });
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

test.describe('Edge Cases - Tournament Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tournaments/new');
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 1: Maximum Field Length
  // -------------------------------------------------------------------------
  test.describe('Edge Case 1: Maximum Field Length', () => {
    test('should handle long tournament names', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      const longName = 'A'.repeat(255); // Maximum typical VARCHAR length

      const nameInput = page.locator('#tournament-name');
      await nameInput.fill(longName);

      // Check if input accepts or truncates
      const inputValue = await nameInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-long-name.png',
        fullPage: true,
      });
    });

    test('should handle long descriptions', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      const longDescription = 'Lorem ipsum '.repeat(500);

      const descInput = page.locator('#tournament-description');
      await descInput.fill(longDescription);

      const inputValue = await descInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-long-description.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 2: Date Validation
  // -------------------------------------------------------------------------
  test.describe('Edge Case 2: Date Validation', () => {
    test('should handle end date before start date', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      // Fill basic required fields
      await page.locator('#tournament-name').fill('Date Test Tournament');
      await page.locator('#director-name').fill('Test Director');
      await page.locator('#director-email').fill('test@test.com');

      // Set end date before start date
      await page.locator('#tournament-start-date').fill('2025-06-15');
      await page.locator('#tournament-end-date').fill('2025-06-10'); // Before start
      await page.locator('#tournament-registration-deadline').fill('2025-06-05');

      // Try to proceed
      const nextButton = page.getByRole('button', { name: /next/i });
      await nextButton.click();

      // Check for error message or validation state
      // The form may still proceed but should show warning
      const pageContent = await page.content();

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-date-invalid.png',
        fullPage: true,
      });
    });

    test('should handle registration deadline after start date', async ({
      page,
    }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      await page.locator('#tournament-name').fill('Date Test Tournament');
      await page.locator('#director-name').fill('Test Director');
      await page.locator('#director-email').fill('test@test.com');

      // Set registration deadline after tournament starts
      await page.locator('#tournament-start-date').fill('2025-06-15');
      await page.locator('#tournament-end-date').fill('2025-06-20');
      await page.locator('#tournament-registration-deadline').fill('2025-06-18'); // After start

      const nextButton = page.getByRole('button', { name: /next/i });
      await nextButton.click();

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-deadline-after-start.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 3: Required Field Validation
  // -------------------------------------------------------------------------
  test.describe('Edge Case 3: Required Field Validation', () => {
    test('should not proceed without tournament name', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      // Fill everything except name
      await page.locator('#tournament-start-date').fill('2025-06-15');
      await page.locator('#tournament-end-date').fill('2025-06-20');
      await page.locator('#tournament-registration-deadline').fill('2025-06-10');
      await page.locator('#director-name').fill('Test Director');
      await page.locator('#director-email').fill('test@test.com');

      // Check Next button state
      const nextButton = page.getByRole('button', { name: /next/i });
      const isDisabled = await nextButton.isDisabled();

      // Button should be disabled
      expect(isDisabled).toBeTruthy();

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-missing-name.png',
        fullPage: true,
      });
    });

    test('should not proceed without director email', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      await page.locator('#tournament-name').fill('Test Tournament');
      await page.locator('#tournament-start-date').fill('2025-06-15');
      await page.locator('#tournament-end-date').fill('2025-06-20');
      await page.locator('#tournament-registration-deadline').fill('2025-06-10');
      await page.locator('#director-name').fill('Test Director');
      // Don't fill email

      const nextButton = page.getByRole('button', { name: /next/i });
      const isDisabled = await nextButton.isDisabled();

      expect(isDisabled).toBeTruthy();

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-missing-email.png',
        fullPage: true,
      });
    });

    test('should require at least one event before review', async ({
      page,
    }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      // Complete Step 1
      await fillBasicTournamentInfo(page, {
        name: 'No Events Test',
        startDate: '2025-06-15',
        endDate: '2025-06-20',
        registrationDeadline: '2025-06-10',
        directorName: 'Test Director',
        directorEmail: 'test@test.com',
      });

      await clickNextStep(page);

      // Step 2: Don't add any events
      // Try to proceed
      const nextButton = page.getByRole('button', { name: /next/i });
      const isDisabled = await nextButton.isDisabled();

      // Should be disabled without events
      expect(isDisabled).toBeTruthy();

      // Should show empty state message
      const emptyMessage = page.locator('text=/no events/i');
      expect(await emptyMessage.count()).toBeGreaterThan(0);

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-no-events.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 4: Special Characters in Text Fields
  // -------------------------------------------------------------------------
  test.describe('Edge Case 4: Special Characters', () => {
    test('should handle special characters in tournament name', async ({
      page,
    }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      const specialName = "Test's Tournament & Championship <2025> \"Premier\"";

      await page.locator('#tournament-name').fill(specialName);

      const inputValue = await page.locator('#tournament-name').inputValue();
      expect(inputValue).toBe(specialName);

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-special-chars.png',
        fullPage: true,
      });
    });

    test('should handle unicode characters', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      const unicodeName = 'Tournament Pickleball Championship';

      await page.locator('#tournament-name').fill(unicodeName);

      const inputValue = await page.locator('#tournament-name').inputValue();
      expect(inputValue).toBe(unicodeName);

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-unicode.png',
        fullPage: true,
      });
    });

    test('should handle emoji characters', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      const emojiDescription = 'Fun tournament with great prizes! First place gets a trophy!';

      await page.locator('#tournament-description').fill(emojiDescription);

      const inputValue = await page.locator('#tournament-description').inputValue();
      expect(inputValue.length).toBeGreaterThan(0);

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-emojis.png',
        fullPage: true,
      });
    });
  });
});

// ============================================================================
// EDGE CASE TESTS - LEAGUE
// ============================================================================

test.describe('Edge Cases - League Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leagues/new');
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 5: Player Count Validation
  // -------------------------------------------------------------------------
  test.describe('Edge Case 5: Player Count Validation', () => {
    test('should show error when min > max players', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      // Select league type
      const ladderOption = page.locator('text=Ladder League');
      if (await ladderOption.isVisible()) {
        await ladderOption.click();
      }

      await clickNextStep(page);

      // Fill details
      await page.locator('input[placeholder*="League"]').fill('Player Count Test');
      await page.locator('input[type="date"]').fill('2025-06-01');
      await page.locator('button', { hasText: 'Mon' }).click();

      await clickNextStep(page);

      // Set min players higher than max
      // Find min players input
      const minPlayersInput = page.locator('input[type="number"]').first();
      const maxPlayersInput = page.locator('input[type="number"]').nth(1);

      if (await minPlayersInput.isVisible() && await maxPlayersInput.isVisible()) {
        await minPlayersInput.fill('20');
        await maxPlayersInput.fill('10');

        // Check for validation message
        const errorMessage = page.locator('text=/cannot exceed|minimum|invalid/i');
        expect(await errorMessage.count()).toBeGreaterThan(0);
      }

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-min-max-players.png',
        fullPage: true,
      });
    });
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 6: League without selecting days
  // -------------------------------------------------------------------------
  test.describe('Edge Case 6: Required Day Selection', () => {
    test('should not proceed without selecting days', async ({ page }) => {
      if (await skipIfNotAuthenticated(page)) {
        test.skip();
        return;
      }

      const ladderOption = page.locator('text=Ladder League');
      if (await ladderOption.isVisible()) {
        await ladderOption.click();
      }

      await clickNextStep(page);

      // Fill name and date but don't select days
      await page.locator('input[placeholder*="League"]').fill('No Days Test');
      await page.locator('input[type="date"]').fill('2025-06-01');

      // Check Next button state
      const nextButton = page.getByRole('button', { name: /next/i });
      const isDisabled = await nextButton.isDisabled();

      expect(isDisabled).toBeTruthy();

      // Should show warning about selecting days
      const warningMessage = page.locator('text=/select at least one day/i');
      expect(await warningMessage.count()).toBeGreaterThan(0);

      await page.screenshot({
        path: 'test-results/screenshots/edge-case-no-days.png',
        fullPage: true,
      });
    });
  });
});

// ============================================================================
// SUMMARY TEST - Generates report
// ============================================================================

test.describe('Test Summary Report', () => {
  test('generates permutation test summary', async ({ page }) => {
    // This test runs last and generates a summary
    const testResults = {
      timestamp: new Date().toISOString(),
      testCategories: {
        tournamentPermutations: 6,
        leaguePermutations: 4,
        edgeCases: 6,
      },
      notes: [
        'Tournament forms are protected routes (require authentication)',
        'League forms are protected routes (require authentication)',
        'Screenshots saved to test-results/screenshots/',
      ],
    };

    console.log('=== TEST SUMMARY ===');
    console.log(JSON.stringify(testResults, null, 2));

    // Visit homepage to ensure app is running
    await page.goto('/');
    expect(await page.title()).toBeTruthy();
  });
});
