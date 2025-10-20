import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertNotificationSchema } from "@shared/schema";
import { Tournament } from "@shared/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Megaphone } from "lucide-react";

import {Dialog,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Simple form schema to avoid TypeScript issues
const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters long" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters long" }),
  type: z.string().default("general"),
  tournamentId: z.number().optional().nullable(),
  targetAudience: z.string().default("all"),
  sendAsPush: z.boolean().default(true),
  sendAsEmail: z.boolean().default(false),
  createdBy: z.number().default(1),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface AnnouncementFormProps {
  isOpen: boolean;
  onClose: () => void;
  announcement?: any;
  isEditing?: boolean;
}

const AnnouncementForm = ({ 
  isOpen, 
  onClose, 
  announcement, 
  isEditing = false 
}: AnnouncementFormProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  // Fetch tournaments for dropdown
  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: ['/tournaments'],
  });

  // Prepare default values
  const defaultValues: Partial<FormValues> = isEditing && announcement
    ? {
        ...announcement,
      }
    : {
        title: "",
        message: "",
        type: "general",
        isActive: true,
      };

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Mutation for creating/editing announcements
  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (isEditing && announcement) {        return apiRequest("PATCH", `/announcements/${announcement.id}`, data);
      } else {
        return apiRequest("POST", "/announcements", data);
      }
    },
    onSuccess: async () => {
      // Invalidate announcements query
      await queryClient.invalidateQueries({ queryKey: ['/announcements'] });
      
      toast({
        title: isEditing ? "Announcement Updated" : "Announcement Created",
        description: `The announcement has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      
      // Clear form and close dialog
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} announcement. Please try again.`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    }
  });

  const onSubmit = (data: FormValues) => {
    setIsSaving(true);
    mutation.mutate(data);
  };

  // Type options for announcements
  const announcementTypes = [
    { value: "general", label: "General" },
    { value: "tournament", label: "Tournament" },
    { value: "maintenance", label: "Maintenance" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Announcement" : "Create New Announcement"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the announcement details below." 
              : "Create a new announcement to broadcast to users."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Announcement title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Announcement message" 
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {announcementTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch("type") === "tournament" && (
                <FormField
                  control={form.control}
                  name="tournamentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tournament" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>                          {tournaments?.map((tournament: Tournament) => (
                            <SelectItem key={tournament.id} value={tournament.id.toString()}>
                              {tournament.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Make this announcement visible to users
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving || mutation.isPending}
              >
                {isSaving || mutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Megaphone className="mr-2 h-4 w-4" />
                    {isEditing ? "Update Announcement" : "Send Announcement"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementForm;
