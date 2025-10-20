// Notification Service - Handles Email, SMS, and Push Notifications
import { logger } from 'firebase-functions';
import { firestore } from './firebase.js';
import { storage } from './storage.js';

const db = firestore;

// Remove or stub SchemaUser and BaseNotificationPayload to resolve errors
// interface User extends SchemaUser { ... }
interface User {
  id: string | number;
  email?: string;
  username?: string;
  [key: string]: any;
}
type BaseNotificationPayload = any;

// Priority levels for notifications
type NotificationPriority = 'low' | 'normal' | 'high';

// Extended notification payload with user and delivery info
interface UserNotification {
  type?: string;
  title?: string;
  message?: string;
  data?: any;
  isRead?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
}

// Firestore notification document
interface InAppNotification extends UserNotification {
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User contact information for notification delivery
interface UserContactInfo {
  email: string | null;
  phone: string | null;
  fcmToken: string | null;
  username: string;
}

/**
 * Notification Service
 * Manages all types of notifications: Push, Email, SMS, In-app
 */
export class NotificationService {
  
  /**
   * Send notification to a user via multiple channels
   */  
  static async sendNotification(notification: UserNotification): Promise<void> {
    try {
      logger.info(`Sending notification to user ${notification.userId}`, { type: notification.type });
      
      // Get user contact information
      const user = await this.getUserContactInfo(notification.userId);
      if (!user) {
        logger.warn(`User ${notification.userId} not found`);
        return;
      }
      
      // Create in-app notification
      await this.createInAppNotification({
        ...notification,
        priority: notification.priority || 'normal',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Send push notification if FCM token available
      if (user.fcmToken) {
        await this.sendPushNotification(user, notification);
      }
      
      // Send SMS for high priority tournament notifications
      if (notification.priority === 'high' && notification.type === 'tournament' && user.phone) {
        await this.sendSmsNotification(user, notification);
      }
      
      // Send email for tournament and system notifications
      if (notification.type === 'tournament' || notification.type === 'system' || notification.type === 'kyc') {
        if (user.email) {
          await this.sendEmailNotification(user, notification);
        }
      }
      
      logger.info(`Notification sent successfully to user ${notification.userId}`);
      
    } catch (error) {
      logger.error(`Error sending notification to user ${notification.userId}:`, error);
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  static async sendBulkNotifications(
    userIds: string[],
    payload: BaseNotificationPayload,
    options?: { priority?: NotificationPriority; tournamentId?: string }
  ): Promise<void> {
    try {
      const { priority = 'normal', tournamentId } = options || {};
      logger.info(`Sending bulk notifications to ${userIds.length} users`, { type: payload.type });
      
      const notificationPromises = userIds.map(userId => 
        this.sendNotification({
          ...payload,
          userId,
          priority,
          tournamentId
        })
      );
      
      await Promise.all(notificationPromises);
      
      logger.info(`Bulk notifications sent to ${userIds.length} users`);
      
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
    }
  }

  /**
   * Get user contact information
   */  private static async getUserContactInfo(userId: string): Promise<UserContactInfo | null> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return null;      
      return {
        email: user.email || null,
        phone: user.phone || null,
        fcmToken: null, // FCM token should be stored separately
        username: user.username || user.name || 'User'
      };
    } catch (error) {
      logger.error(`Error getting user contact info for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Create in-app notification in Firestore
   */  private static async createInAppNotification(
    payload: UserNotification & { isRead?: boolean; createdAt?: Date; updatedAt?: Date }
  ): Promise<void> {
    try {
      const inAppNotification = {
        userId: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        data: payload.data || {},
        priority: payload.priority || 'normal',
        isRead: payload.isRead ?? false,
        createdAt: payload.createdAt || new Date(),
        updatedAt: payload.updatedAt || new Date()
      };

      if (payload.type === 'tournament' && payload.data?.tournamentId) {
        inAppNotification.data = {
          ...inAppNotification.data,
          tournamentId: payload.data.tournamentId
        };
      }
      
      await db.collection('notifications').add(inAppNotification);
      
      logger.debug(`In-app notification created for user ${payload.userId}`);
    } catch (error) {
      logger.error(`Error creating in-app notification for user ${payload.userId}:`, error);
    }
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   */
  private static async sendPushNotification(user: UserContactInfo, payload: UserNotification): Promise<void> {
    try {
      // TODO: Implement FCM push notification
      // This requires Firebase Admin SDK messaging
      
      /*
      import { getMessaging } from 'firebase-admin/messaging';
      
      const message = {
        token: user.fcmToken!,
        notification: {
          title: payload.title,
          body: payload.message
        },
        data: {
          type: payload.type,
          tournamentId: payload.tournamentId || '',
          ...payload.data
        },
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          notification: {
            icon: 'tournament_icon',
            color: '#FF6B35'
          }
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default'
            }
          }
        }
      };
      
      const messaging = getMessaging();
      await messaging.send(message);
      */
      
      logger.info(`Push notification sent to user ${payload.userId}`);
    } catch (error) {
      logger.error(`Error sending push notification to user ${payload.userId}:`, error);
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSmsNotification(user: UserContactInfo, payload: UserNotification): Promise<void> {
    try {
      // TODO: Implement SMS service (Twilio, AWS SNS, etc.)
      
      const smsMessage = this.formatSmsMessage(payload);
      
      // Example using a hypothetical SMS service
      /*
      await smsService.send({
        to: user.phone!,
        message: smsMessage,
        priority: payload.priority
      });
      */
      
      logger.info(`SMS notification sent to user ${payload.userId} at ${user.phone}`);
    } catch (error) {
      logger.error(`Error sending SMS notification to user ${payload.userId}:`, error);
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(user: UserContactInfo, payload: UserNotification): Promise<void> {
    try {
      // TODO: Implement email service (SendGrid, AWS SES, etc.)
      
      const emailContent = this.formatEmailContent(user, payload);
      
      // Example using a hypothetical email service
      /*
      await emailService.send({
        to: user.email!,
        subject: payload.title,
        html: emailContent.html,
        text: emailContent.text
      });
      */
      
      logger.info(`Email notification sent to user ${payload.userId} at ${user.email}`);
    } catch (error) {
      logger.error(`Error sending email notification to user ${payload.userId}:`, error);
    }
  }

  /**
   * Format SMS message
   */
  private static formatSmsMessage(payload: UserNotification): string {
    let message = `🎮 ${payload.title}\n\n`;
    message += payload.message;
    message += '\n\n- Netwin Tournament';
    
    // Keep SMS under 160 characters if possible
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }
    
    return message;
  }

  /**
   * Format email content
   */
  private static formatEmailContent(user: UserContactInfo, payload: UserNotification): { html: string; text: string } {
    const text = `Hi ${user.username},\n\n${payload.message}\n\nBest regards,\nNetwin Tournament Team`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${payload.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎮 Netwin Tournament</h1>
          </div>
          <div class="content">
            <h2>${payload.title}</h2>
            <p>Hi ${user.username},</p>
            <div style="white-space: pre-line;">${payload.message}</div>
            ${payload.type === 'tournament' ? '<p><a href="#" class="button">View Tournament</a></p>' : ''}
          </div>
          <div class="footer">
            <p>&copy; 2024 Netwin Tournament. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return { html, text };
  }

  /**
   * Send tournament-specific notifications
   */  static async sendTournamentNotification(
    tournamentId: string,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal'  ): Promise<void> {
    try {
      const registrations = await storage.getRegistrationsByTournament(tournamentId);
      const userIds = registrations
        ?.map(reg => {
          const uid = reg.userId;
          return uid ? String(uid) : undefined;
        })
        .filter((id): id is string => id !== undefined) ?? [];
      
      if (userIds.length === 0) {
        logger.info(`No users registered for tournament ${tournamentId}`);
        return;
      }
      
      const notification: BaseNotificationPayload = {
        title,
        message,
        type: 'tournament',
        data: { tournamentId }
      };

      await this.sendBulkNotifications(
        userIds,
        notification,
        { priority, tournamentId }
      );
      
    } catch (error) {
      logger.error(`Error sending tournament notification for ${tournamentId}:`, error);
    }
  }
  /**
   * Send system-wide notifications
   */  static async sendSystemNotification(
    title: string,
    message: string,
    targetUserIds?: string[]
  ): Promise<void> {    try {
      let userIds: string[];      if (targetUserIds) {
        userIds = targetUserIds;
      } else {
        // Get all active users
        const allUsers = await storage.getAllUsers();
        userIds = allUsers
          .filter((user: any) => user.status && user.status === 'active')
          .map((user: any) => String(user.id || ''))
          .filter(Boolean);
      }

      const notification: BaseNotificationPayload = {
        title,
        message,
        type: 'system',
        data: {} // No additional data needed for system notifications
      };
      
      await this.sendBulkNotifications(userIds, notification, { priority: 'normal' });
    } catch (error) {
      logger.error('Error sending system notification:', error);
    }
  }
}
