import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import {Send, 
  User, 
  Mail, 
  Calendar, 
  Tag, 
  AlertCircle, 
  Clock,
  MessageSquare,
  UserCheck,
  Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  SupportTicket as BaseSupportTicket, 
  SupportTicketResponse, 
  SupportTicketStatus, 
  SupportTicketPriority 
} from "@shared/types";

// Extend the base support ticket type to include responses
interface SupportTicket extends BaseSupportTicket {
  responses?: SupportTicketResponse[];
}

const responseSchema = z.object({
  message: z.string().min(10, "Response must be at least 10 characters"),
  isInternal: z.boolean().default(false),
  status: z.enum(['open', 'in-progress', 'resolved', 'closed', 'pending'] as const).optional(),
});

type ResponseFormValues = z.infer<typeof responseSchema>;

interface SupportTicketDetailDialogProps {
  ticket: SupportTicket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdate: () => void;
}

export function SupportTicketDetailDialog({ 
  ticket, 
  open, 
  onOpenChange, 
  onTicketUpdate 
}: SupportTicketDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResponseFormValues>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      message: "",
      isInternal: false,
      status: ticket.status,
    },
  });

  // Send response mutation
  const sendResponseMutation = useMutation({
    mutationFn: async (values: ResponseFormValues) => {
      const response = await apiRequest("POST", `/support-tickets/${ticket.ticketId}/responses`, values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Response sent",
        description: "Your response has been sent successfully.",
      });
      form.reset();
      onTicketUpdate();
      // Don't close dialog, keep it open for potential follow-up
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send response.",
        variant: "destructive",
      });
    },
  });

  // Update status mutation (separate from response)
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/support-tickets/${ticket.ticketId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Ticket status has been updated successfully.",
      });
      onTicketUpdate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: ResponseFormValues) => {
    setIsSubmitting(true);
    try {
      // Send the response first
      await sendResponseMutation.mutateAsync(values);
      
      // If status is different from current ticket status, update it
      if (values.status && values.status !== ticket.status) {
        await updateStatusMutation.mutateAsync(values.status);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityBadgeVariant = (priority: SupportTicketPriority) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (status: SupportTicketStatus) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in-progress': return 'default';
      case 'resolved': return 'default';
      case 'closed': return 'secondary';
      default: return 'default';
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    try {
      return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col sm:max-w-[90vw] md:max-w-4xl lg:max-w-6xl lg:h-[95vh] p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MessageSquare className="h-5 w-5" />
            Support Ticket Details
          </DialogTitle>
          <DialogDescription className="text-sm">
            Ticket ID: {ticket.ticketId}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6 flex-1 min-h-0 overflow-auto px-6 py-4">
          {/* Left Column - Ticket Info (Collapsible on mobile) */}
          <div className="lg:col-span-1 space-y-4 order-1 lg:order-none">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base lg:text-lg">Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Subject</span>
                  </div>
                  <p className="text-sm pl-6">{ticket.subject}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">User</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    <p className="text-sm font-medium">{ticket.username || 'Unknown'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{ticket.userEmail}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Category</span>
                  <Badge variant="outline" className="capitalize">{ticket.category}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Priority</span>
                  <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Status</span>
                  <Badge variant={getStatusBadgeVariant(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Created</span>
                  </div>
                  <p className="text-sm pl-6">{formatTimestamp(ticket.createdAt)}</p>
                </div>

                {ticket.assignedToName && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Assigned To</span>
                    </div>
                    <p className="text-sm pl-6">{ticket.assignedToName}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Messages and Response */}
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0 order-2 lg:order-none">
            {/* Original Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base lg:text-lg">Original Request</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-3 lg:p-4 rounded-lg">
                  <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Responses */}
            <Card className="flex flex-col min-h-0">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-base lg:text-lg">
                  Responses ({ticket.responses?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-hidden p-3 lg:p-6">
                <ScrollArea className="h-[150px] sm:h-[200px] lg:h-[250px] pr-2 lg:pr-4">
                  <div className="space-y-3 lg:space-y-4">
                    {ticket.responses && ticket.responses.length > 0 ? (
                      ticket.responses.map((response, index) => (
                        <div key={response.id || index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 lg:h-8 lg:w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-3 w-3 lg:h-4 lg:w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-xs lg:text-sm">{response.responderName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTimestamp(response.createdAt)}
                                </p>
                              </div>
                            </div>
                            {response.isInternal && (
                              <Badge variant="secondary" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                Internal
                              </Badge>
                            )}
                          </div>
                          <div className="ml-8 lg:ml-10 bg-muted/30 p-2 lg:p-3 rounded-lg">
                            <p className="whitespace-pre-wrap text-xs lg:text-sm">{response.message}</p>
                          </div>
                          {index < (ticket.responses?.length || 0) - 1 && <Separator className="my-3 lg:my-4" />}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-6 lg:py-8 text-sm">
                        No responses yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Response Form */}
            <Card className="flex-shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base lg:text-lg">Send Response</CardTitle>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Type your response here..."
                              className="min-h-[80px] lg:min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <FormField
                        control={form.control}
                        name="isInternal"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm">
                              Internal note (not visible to user)
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Update Status</FormLabel>
                            <FormControl>
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-full sm:w-[160px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
                      >
                        Close
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto"
                      >
                        <Send className="h-4 w-4" />
                        {isSubmitting ? "Sending..." : "Send Response"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
