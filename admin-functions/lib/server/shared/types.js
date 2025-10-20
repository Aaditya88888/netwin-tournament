import { z } from 'zod';
export const insertNotificationSchema = z.object({
    title: z.string().min(1).max(100),
    message: z.string().min(1).max(1000)
});
;
export var SupportTicketStatus;
(function (SupportTicketStatus) {
    SupportTicketStatus["OPEN"] = "open";
    SupportTicketStatus["IN_PROGRESS"] = "in-progress";
    SupportTicketStatus["RESOLVED"] = "resolved";
    SupportTicketStatus["CLOSED"] = "closed";
    SupportTicketStatus["PENDING"] = "pending";
})(SupportTicketStatus || (SupportTicketStatus = {}));
export var SupportTicketPriority;
(function (SupportTicketPriority) {
    SupportTicketPriority["LOW"] = "low";
    SupportTicketPriority["MEDIUM"] = "medium";
    SupportTicketPriority["HIGH"] = "high";
    SupportTicketPriority["URGENT"] = "urgent";
})(SupportTicketPriority || (SupportTicketPriority = {}));
;
