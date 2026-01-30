import { test as setup, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const authFile = path.join(__dirname, '../.playwright/.auth/user.json');

/**
 * Global setup for Clerk authentication.
 * This runs once before all tests and saves the authenticated state.
 *
 * Required environment variables:
 * - E2E_CLERK_USER_EMAIL: Test user email
 * - E2E_CLERK_USER_PASSWORD: Test user password
 */
setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  const password = process.env.E2E_CLERK_USER_PASSWORD;

  if (!email || !password) {
    console.warn('⚠️  E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD not set.');
    console.warn('   Skipping authentication setup. Tests requiring auth will fail.');
    console.warn('   To fix: Add these to .env.local or set them in CI secrets.');
    return;
  }

  console.log('🔑 Starting authentication setup...');
  console.log(`   Email: ${email.slice(0, 3)}***`);

  // Navigate to sign-in page
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
  console.log('   Navigated to /sign-in');

  // Wait for Clerk form to load - look for the email input
  // Clerk uses "Enter your email address" placeholder
  const emailInput = page.getByPlaceholder('Enter your email address');

  await emailInput.waitFor({ state: 'visible', timeout: 45000 });
  console.log('   Email input found');

  // Fill email
  await emailInput.fill(email);
  console.log('   Email entered');

  // Click Continue button
  const continueButton = page.getByRole('button', { name: /continue/i });
  await continueButton.click();
  console.log('   Clicked continue');

  // Wait for password field - Clerk shows password after email is entered
  const passwordInput = page.getByPlaceholder('Enter your password');
  await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
  console.log('   Password input visible');

  await passwordInput.fill(password);
  console.log('   Password entered');

  // Click Continue/Sign in button to submit
  const signInButton = page.getByRole('button', { name: /continue/i });
  await signInButton.click();
  console.log('   Clicked sign in');

  // Check if we hit 2FA/device verification
  await page.waitForTimeout(3000);
  const currentUrl = page.url();

  if (currentUrl.includes('factor-two') || currentUrl.includes('factor-one')) {
    console.error('❌ Account has 2FA or device verification enabled.');
    console.error('   To fix, go to Clerk Dashboard and:');
    console.error('   1. Disable "Device verification" in Sessions settings');
    console.error('   2. Or disable email verification codes for development');
    console.error('   3. Or create a test account without 2FA enabled');
    await page.screenshot({ path: 'test-results/2fa-required.png' });
    throw new Error('2FA/Device verification required. See console for instructions.');
  }

  // Wait for successful authentication - should redirect to dashboard
  await expect(page).toHaveURL(/\/(dashboard|home|tournaments|leagues)/, { timeout: 30000 });
  console.log('   Redirected to authenticated page');

  // Verify we're logged in by checking for user menu or authenticated content
  // Wait for any sign of being logged in
  await page.waitForTimeout(2000); // Give the page time to settle
  console.log('   Page settled');

  // Save authentication state
  await page.context().storageState({ path: authFile });
  console.log('✅ Authentication successful. State saved to:', authFile);
});
