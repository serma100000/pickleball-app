import { eq, and, desc, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { emitToUser, SocketEvents } from '../lib/socket.js';

const { notifications } = schema;

export interface CreateNotificationInput {
  userId: string;
  type:
    | 'game_invite'
    | 'game_reminder'
    | 'game_result'
    | 'friend_request'
    | 'club_invite'
    | 'tournament_update'
    | 'achievement'
    | 'system';
  title: string;
  message?: string;
  data?: Record<string, unknown>;
}

export const notificationService = {
  /**
   * Create a notification
   */
  async create(input: CreateNotificationInput) {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data,
      })
      .returning();

    // Send real-time notification
    emitToUser(input.userId, SocketEvents.NOTIFICATION, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
    });

    return notification;
  },

  /**
   * Get notifications for user
   */
  async getForUser(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const offset = (page - 1) * limit;

    const whereClause = unreadOnly
      ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      : eq(notifications.userId, userId);

    const items = await db.query.notifications.findMany({
      where: whereClause,
      orderBy: desc(notifications.createdAt),
      limit,
      offset,
    });

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(whereClause);

    return {
      items,
      total: Number(totalResult[0].count),
      page,
      limit,
      totalPages: Math.ceil(Number(totalResult[0].count) / limit),
    };
  },

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );

    return Number(result[0].count);
  },

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string) {
    const [notification] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      )
      .returning();

    // Emit read event
    emitToUser(userId, SocketEvents.NOTIFICATION_READ, { id });

    return notification;
  },

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string) {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );

    return true;
  },

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string) {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      );

    return true;
  },

  /**
   * Delete all notifications for user
   */
  async deleteAll(userId: string) {
    await db.delete(notifications).where(eq(notifications.userId, userId));
    return true;
  },

  /**
   * Send bulk notifications
   */
  async sendBulk(
    userIds: string[],
    notification: Omit<CreateNotificationInput, 'userId'>
  ) {
    const created = [];

    for (const userId of userIds) {
      const n = await this.create({
        ...notification,
        userId,
      });
      created.push(n);
    }

    return created;
  },

  /**
   * Send game reminder notifications
   */
  async sendGameReminder(gameId: string, playerIds: string[], minutesUntilStart: number) {
    const message = minutesUntilStart <= 60
      ? `Your game starts in ${minutesUntilStart} minutes!`
      : `Your game starts in ${Math.round(minutesUntilStart / 60)} hours!`;

    await this.sendBulk(playerIds, {
      type: 'game_reminder',
      title: 'Game Reminder',
      message,
      data: { gameId, minutesUntilStart },
    });
  },

  /**
   * Send achievement unlocked notification
   */
  async sendAchievementUnlocked(userId: string, achievementName: string, achievementId: string) {
    await this.create({
      userId,
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: `You earned: ${achievementName}`,
      data: { achievementId },
    });
  },
};
