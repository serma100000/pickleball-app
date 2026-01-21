import { createClerkClient } from '@clerk/backend';

// Initialize Clerk client
export const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Get user by Clerk ID
 */
export async function getClerkUser(userId: string) {
  try {
    return await clerk.users.getUser(userId);
  } catch (error) {
    console.error('Error fetching Clerk user:', error);
    return null;
  }
}

/**
 * Get user's email addresses
 */
export async function getUserEmails(userId: string) {
  try {
    const user = await clerk.users.getUser(userId);
    return user.emailAddresses;
  } catch (error) {
    console.error('Error fetching user emails:', error);
    return [];
  }
}

/**
 * Update user metadata in Clerk
 */
export async function updateUserMetadata(
  userId: string,
  publicMetadata?: Record<string, unknown>,
  privateMetadata?: Record<string, unknown>
) {
  try {
    return await clerk.users.updateUserMetadata(userId, {
      publicMetadata,
      privateMetadata,
    });
  } catch (error) {
    console.error('Error updating user metadata:', error);
    throw error;
  }
}

/**
 * Delete a user from Clerk
 */
export async function deleteClerkUser(userId: string) {
  try {
    await clerk.users.deleteUser(userId);
    return true;
  } catch (error) {
    console.error('Error deleting Clerk user:', error);
    return false;
  }
}

/**
 * Get user's active sessions
 */
export async function getUserSessions(userId: string) {
  try {
    return await clerk.sessions.getSessionList({ userId });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return [];
  }
}

/**
 * Revoke a user session
 */
export async function revokeSession(sessionId: string) {
  try {
    await clerk.sessions.revokeSession(sessionId);
    return true;
  } catch (error) {
    console.error('Error revoking session:', error);
    return false;
  }
}

/**
 * Revoke all user sessions
 */
export async function revokeAllSessions(userId: string) {
  try {
    const sessions = await clerk.sessions.getSessionList({ userId });
    await Promise.all(
      sessions.data.map((session) => clerk.sessions.revokeSession(session.id))
    );
    return true;
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    return false;
  }
}
