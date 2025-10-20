import { db } from "@/config/firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { useAdminAuth } from "@/context/AdminAuthContext";


export interface AuditLogEntry {
  id?: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    timestamp: any;
  };
  severity: "low" | "medium" | "high" | "critical";
  category: "user" | "tournament" | "finance" | "system" | "security" | "data";
}

class AuditLogger {
  private static instance: AuditLogger;
  private collectionName = "auditLogs";

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, "metadata" | "id">): Promise<void> {
    try {
      const auditEntry: Omit<AuditLogEntry, "id"> = {
        ...entry,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: serverTimestamp(),
        },
      };

      await addDoc(collection(db, this.collectionName), auditEntry);
    } catch (error) {
      console.error("Failed to log audit entry:", error);
      // Don't throw - audit logging should not break the application
    }
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limitCount = 100): Promise<AuditLogEntry[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        orderBy("metadata.timestamp", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as AuditLogEntry));
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserLogs(userId: string, limitCount = 50): Promise<AuditLogEntry[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("userId", "==", userId),
        orderBy("metadata.timestamp", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as AuditLogEntry));
    } catch (error) {
      console.error("Failed to fetch user audit logs:", error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceLogs(resource: string, resourceId: string, limitCount = 50): Promise<AuditLogEntry[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("resource", "==", resource),
        where("resourceId", "==", resourceId),
        orderBy("metadata.timestamp", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as AuditLogEntry));
    } catch (error) {
      console.error("Failed to fetch resource audit logs:", error);
      return [];
    }
  }

  // Predefined logging methods for common actions
  async logUserAction(userId: string, userEmail: string, action: string, resourceId: string, details: any = {}) {
    await this.log({
      userId,
      userEmail,
      action,
      resource: "user",
      resourceId,
      details,
      severity: "medium",
      category: "user",
    });
  }

  async logTournamentAction(userId: string, userEmail: string, action: string, tournamentId: string, details: any = {}) {
    await this.log({
      userId,
      userEmail,
      action,
      resource: "tournament",
      resourceId: tournamentId,
      details,
      severity: "medium",
      category: "tournament",
    });
  }

  async logFinanceAction(userId: string, userEmail: string, action: string, resourceId: string, details: any = {}) {
    await this.log({
      userId,
      userEmail,
      action,
      resource: "finance",
      resourceId,
      details,
      severity: "high",
      category: "finance",
    });
  }

  async logSecurityAction(userId: string, userEmail: string, action: string, details: any = {}) {
    await this.log({
      userId,
      userEmail,
      action,
      resource: "security",
      resourceId: "system",
      details,
      severity: "critical",
      category: "security",
    });
  }

  async logSystemAction(userId: string, userEmail: string, action: string, details: any = {}) {
    await this.log({
      userId,
      userEmail,
      action,
      resource: "system",
      resourceId: "config",
      details,
      severity: "high",
      category: "system",
    });
  }

  async logDataAction(userId: string, userEmail: string, action: string, resourceId: string, details: any = {}) {
    await this.log({
      userId,
      userEmail,
      action,
      resource: "data",
      resourceId,
      details,
      severity: "medium",
      category: "data",
    });
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// React hook for audit logging

export function useAuditLogger() {
  const { user } = useAdminAuth();

  const logAction = async (
    action: string,
    resource: string,
    resourceId: string,
    details: any = {},
    severity: AuditLogEntry["severity"] = "medium",
    category: AuditLogEntry["category"] = "system"
  ) => {
    if (!user) return;
      await auditLogger.log({
      userId: user.uid,
      userEmail: user.email || "unknown",
      action,
      resource,
      resourceId,
      details,
      severity,
      category,
    });
  };

  return {
    logAction,
    logUserAction: (action: string, resourceId: string, details?: any) =>
      logAction(action, "user", resourceId, details, "medium", "user"),
    logTournamentAction: (action: string, resourceId: string, details?: any) =>
      logAction(action, "tournament", resourceId, details, "medium", "tournament"),
    logFinanceAction: (action: string, resourceId: string, details?: any) =>
      logAction(action, "finance", resourceId, details, "high", "finance"),
    logSecurityAction: (action: string, details?: any) =>
      logAction(action, "security", "system", details, "critical", "security"),
    logSystemAction: (action: string, details?: any) =>
      logAction(action, "system", "config", details, "high", "system"),
    logDataAction: (action: string, resourceId: string, details?: any) =>
      logAction(action, "data", resourceId, details, "medium", "data"),
  };
}
