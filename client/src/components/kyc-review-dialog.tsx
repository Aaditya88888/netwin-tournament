import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, User, FileText, Image } from 'lucide-react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { KycDocument, User as UserType } from "@shared/schema";

import {Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type KycReviewDialogProps = {
  document: KycDocument;
  user?: UserType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function KycReviewDialog({ document, user, open, onOpenChange }: KycReviewDialogProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateKycStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      console.log('Document object:', document);
      console.log('Document keys:', Object.keys(document));
      console.log('Sending KYC status update:', { status, userId: document.userId, docId: document.id });
      const response = await apiRequest("PATCH", `/users/${document.userId}/kyc`, {
        kycStatus: status,
        docId: document.id,
        rejectionReason: status === "REJECTED" ? rejectionReason : undefined,
      });
      
      // Check if response has content before trying to parse JSON
      const text = await response.text();
      console.log('Response text from KYC update:', text);
      if (text) {
        try {
          const parsed = JSON.parse(text);
          console.log('Parsed response:', parsed);
          return parsed;
        } catch (e) {
          console.log('Response is not JSON:', text);
          return { message: text };
        }
      }
      return { message: 'KYC status updated successfully' };
    },
    onSuccess: () => {
      console.log('KYC status update successful');
      toast({
        title: "KYC status updated",
        description: "The KYC document status has been updated successfully.",
      });
      onOpenChange(false);
      // Invalidate multiple queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['/kyc/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/admin/kyc'] });
      queryClient.invalidateQueries({ queryKey: [`/users/${document.userId}/kyc`] });
      queryClient.invalidateQueries({ queryKey: [`/users/${document.userId}`] });
      queryClient.invalidateQueries({ queryKey: ['/users'] });
    },
    onError: (error: any) => {
      console.error('KYC status update failed:', error);
      toast({
        title: "Failed to update KYC status",
        description: error.message || "There was an error updating the KYC document status.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = () => {
    updateKycStatusMutation.mutate({ status: "APPROVED" });
  };

  const handleReject = () => {
    if (!rejectionReason) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting the document.",
        variant: "destructive",
      });
      return;
    }
    updateKycStatusMutation.mutate({ status: "REJECTED" });
  };  // Get actual document image URLs from the document or user's kycDocuments
  const getDocumentImageUrl = (docType: string) => {
    // First check the document object which should have the direct URLs
    switch (docType) {
      case "idProof":
      case "aadhaar":
        if (document.frontImage) return document.frontImage;
        break;
      case "addressProof":
      case "pan":
        if (document.backImage) return document.backImage;
        break;
      case "selfie":
        if (document.selfie) return document.selfie;
        break;
    }
    
    // Fall back to user kycDocuments if available
    if (!user?.kycDocuments) return "";
    
    switch (docType) {
      case "idProof":
      case "aadhaar":
        return user.kycDocuments.idProof || "";
      case "addressProof":
      case "pan":
        return user.kycDocuments.addressProof || "";
      case "selfie":
        return user.kycDocuments.selfie || "";
      default:
        return "";
    }
  };

  // Check if image URL exists and is valid
  const hasValidImage = (docType: string) => {
    const url = getDocumentImageUrl(docType);
    return url && url.trim() !== "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card text-card-foreground max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" />
            Review KYC Document
          </DialogTitle>
          <DialogDescription>
            Review the submitted KYC documents and approve or reject them.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-medium text-foreground">{user?.name || "User"}</h2>
              <p className="text-sm text-muted-foreground">
                Submitted on {document.submittedAt ? new Date(document.submittedAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500">
                Pending Review
              </span>
            </div>
          </div>

          <Tabs defaultValue="documents">
            <TabsList className="mb-4">
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="user-info">User Information</TabsTrigger>
            </TabsList>            <TabsContent value="documents" className="space-y-4">
              {/* ID Proof Document */}
              {hasValidImage("idProof") && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    ID Proof Document
                  </h3>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-700">
                    <img
                      src={getDocumentImageUrl("idProof")}
                      alt="ID Proof document"
                      className="object-contain w-full h-full bg-muted"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+";
                        e.currentTarget.alt = "Failed to load image";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Address Proof Document */}
              {hasValidImage("addressProof") && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Address Proof Document
                  </h3>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-gray-700">
                    <img
                      src={getDocumentImageUrl("addressProof")}
                      alt="Address Proof document"
                      className="object-contain w-full h-full bg-muted"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+";
                        e.currentTarget.alt = "Failed to load image";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Selfie Document */}
              {hasValidImage("selfie") && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Selfie Verification
                  </h3>
                  <div className="relative aspect-square max-w-sm mx-auto overflow-hidden rounded-lg border border-gray-700">
                    <img
                      src={getDocumentImageUrl("selfie")}
                      alt="User selfie"
                      className="object-cover w-full h-full bg-muted"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+";
                        e.currentTarget.alt = "Failed to load image";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* No Documents Available */}
              {!hasValidImage("idProof") && !hasValidImage("addressProof") && !hasValidImage("selfie") && (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">No documents available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No KYC documents have been uploaded for this user.
                  </p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="user-info">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                    <p className="text-foreground">{user?.username || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                    <p className="text-foreground">{user?.email || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">User ID</h3>
                    <p className="text-foreground">{user?.id || "N/A"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Account Status</h3>
                    <p className="text-foreground">
                      {user?.isBanned ? (
                        <span className="text-red-500">Banned</span>
                      ) : (
                        <span className="text-green-500">Active</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Rejection reason (only shown when rejecting) */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Rejection Reason (required if rejecting)
            </h3>
            <Textarea
              placeholder="Please provide a reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <div className="flex space-x-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateKycStatusMutation.isPending}
              className="flex items-center"
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={updateKycStatusMutation.isPending}
            >
              {updateKycStatusMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
