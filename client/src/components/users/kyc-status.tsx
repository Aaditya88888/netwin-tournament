import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import React from "react";
import {AlertCircle, CheckCircle, Clock, X, ShieldCheck, Wallet, Trophy, FileText, ExternalLink, Maximize2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { User, KycDocument } from "@shared/types";
import KycUpload from "./kyc-upload";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface KycStatusProps {
  user: Partial<User> & { id: number | string; kycStatus?: string };
  kycDocuments?: KycDocument[];
  onRefresh?: () => void;
  isAdmin?: boolean;
}

export default function KycStatus({ user, kycDocuments = [], onRefresh, isAdmin = false }: KycStatusProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<KycDocument | null>(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const { toast } = useToast();

  if (!user) return null;

  // KYC document status helpers
  const pendingDocument = kycDocuments.find(doc => doc.status === "pending");
  const rejectedDocument = kycDocuments.find(doc => doc.status === "rejected");
  const approvedDocument = kycDocuments.find(doc => doc.status === "approved");
  
  // Determine if user can access upload form
  const canUpload = user.kycStatus === "not_submitted" || 
                    user.kycStatus === "rejected" ||
                    !user.kycStatus;

  // Handler for admin approval/rejection
  const handleStatusUpdate = async (newStatus: string, docId?: string | number) => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      const response = await apiRequest("PATCH", `/users/${user.id}/kyc`, { 
        kycStatus: newStatus.toUpperCase(), // Ensure uppercase to match server expectations
        docId: docId?.toString()
      });
      
      if (!response.ok) {
        throw new Error("Failed to update KYC status");
      }
      
      toast({
        title: "Success",
        description: `KYC status updated to ${newStatus}`,
      });
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update KYC status",
        variant: "destructive",
      });
      console.error("Error updating KYC status:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // If showing upload form
  if (showUpload && canUpload) {
    return (
      <KycUpload 
        userId={user.id?.toString() || ''} 
        onComplete={() => {
          setShowUpload(false);
          if (onRefresh) onRefresh();
        }}
        onBack={() => setShowUpload(false)}
      />
    );
  }

  // For admin view with no documents
  if (isAdmin && kycDocuments.length === 0) {
    return (
      <div className="p-6 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-medium mb-2">KYC Document Review</h3>
        <p className="text-muted-foreground mb-6">
          Review the submitted KYC documents for verification
        </p>
        <Alert>
          <AlertTitle>No Documents Found</AlertTitle>
          <AlertDescription>
            No KYC documents have been uploaded by this user.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // For admin view with documents
  if (isAdmin && kycDocuments.length > 0) {
    // Group documents by type for better organization
    const groupedDocuments = kycDocuments.reduce((groups, doc) => {
      const docType = doc.documentType || doc.type;
      if (!groups[docType]) {
        groups[docType] = [];
      }
      groups[docType].push(doc);
      return groups;
    }, {} as Record<string, typeof kycDocuments>);

    // Helper function to get the pretty document type name
    const getDocumentTypeName = (type: string) => {
      return type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'ID Document';
    };

    // Handle opening the document review dialog
    const openDocumentReview = (docType: string, docs: KycDocument[]) => {
      const primaryDoc = docs[0];
      setSelectedDocument(primaryDoc);
      setShowDocumentDialog(true);
    };

    // Handle opening image viewer
    const openImageViewer = (imageUrl: string) => {
      setSelectedImage(imageUrl);
      setShowImageViewer(true);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-medium">KYC Document Review</h3>
          <Badge className={`
            ${user.kycStatus === 'approved' ? 'bg-green-100 text-green-800' : ''}
            ${user.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' : ''}
            ${user.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${!user.kycStatus || user.kycStatus === 'not_submitted' ? 'bg-gray-100 text-gray-800' : ''}
          `}>
            {user.kycStatus === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
            {user.kycStatus === 'rejected' && <X className="h-3 w-3 mr-1" />}
            {user.kycStatus === 'pending' && <Clock className="h-3 w-3 mr-1" />}
            {(!user.kycStatus || user.kycStatus === 'not_submitted') && <AlertCircle className="h-3 w-3 mr-1" />}
            {user.kycStatus ? user.kycStatus.charAt(0).toUpperCase() + user.kycStatus.slice(1) : 'Not Submitted'}
          </Badge>
        </div>

        {/* Simplified card list with review action */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedDocuments).map(([docType, docs]) => {
            // Use the first document for metadata
            const primaryDoc = docs[0];
            // Determine if we have front, back, selfie
            const frontDoc = docs.find(d => d.frontImage);
            const hasFront = frontDoc && frontDoc.frontImage;
            const backDoc = docs.find(d => d.backImage);
            const hasBack = backDoc && backDoc.backImage;
            const selfieDoc = docs.find(d => d.selfie);
            const hasSelfie = selfieDoc && selfieDoc.selfie;
            
            return (
              <Card key={docType} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col h-full">
                    {/* Header with document type and status */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{getDocumentTypeName(docType)}</h4>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(primaryDoc.submittedAt || primaryDoc.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={`
                        ${primaryDoc.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${primaryDoc.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                        ${primaryDoc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                      `}>
                        {primaryDoc.status?.charAt(0).toUpperCase() + primaryDoc.status?.slice(1) || 'Pending'}
                      </Badge>
                    </div>
                    
                    {/* Document thumbnails */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {hasFront && (
                        <div 
                          className="aspect-square bg-secondary/10 rounded relative overflow-hidden cursor-pointer"
                          onClick={() => openImageViewer(frontDoc.frontImage)}
                        >
                          <img 
                            src={frontDoc.frontImage} 
                            alt="Front" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5">
                            Front
                          </div>
                        </div>
                      )}
                      
                      {hasBack && (
                        <div 
                          className="aspect-square bg-secondary/10 rounded relative overflow-hidden cursor-pointer"
                          onClick={() => openImageViewer(backDoc.backImage!)}
                        >
                          <img 
                            src={backDoc.backImage} 
                            alt="Back" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5">
                            Back
                          </div>
                        </div>
                      )}
                      
                      {hasSelfie && (
                        <div 
                          className="aspect-square bg-secondary/10 rounded relative overflow-hidden cursor-pointer"
                          onClick={() => openImageViewer(selfieDoc.selfie!)}
                        >
                          <img 
                            src={selfieDoc.selfie} 
                            alt="Selfie" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5">
                            Selfie
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Review button */}
                    <div className="mt-auto pt-2">
                      <Button 
                        className="w-full" 
                        size="sm" 
                        onClick={() => openDocumentReview(docType, docs)}
                      >
                        Review Documents
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Document Review Dialog */}
        <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>KYC Document Review</DialogTitle>
              <DialogDescription>
                Review and verify user's identity documents
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-grow pr-4 -mr-4 max-h-[70vh]">
              {selectedDocument && (
                <div className="space-y-6">
                  {/* Document metadata */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{getDocumentTypeName(selectedDocument.documentType || selectedDocument.type)}</h3>
                      <Badge className={`
                        ${selectedDocument.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                        ${selectedDocument.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
                        ${selectedDocument.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                      `}>
                        {selectedDocument.status?.charAt(0).toUpperCase() + selectedDocument.status?.slice(1) || 'Pending'}
                      </Badge>
                    </div>
                    
                    {selectedDocument.documentNumber && (
                      <div className="flex justify-between text-sm p-2 bg-secondary/20 rounded">
                        <span className="text-muted-foreground">Document Number:</span>
                        <span className="font-mono">{selectedDocument.documentNumber.substring(0, 4)}****{selectedDocument.documentNumber.substring(selectedDocument.documentNumber.length - 4)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Document images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedDocument.frontImage && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Front Side</h4>
                        <div className="relative bg-secondary/10 rounded-md overflow-hidden">
                          <img 
                            src={selectedDocument.frontImage}
                            alt="Front Side" 
                            className="w-full object-contain max-h-[250px]"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white rounded-full h-7 w-7"
                            onClick={() => openImageViewer(selectedDocument.frontImage)}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {selectedDocument.backImage && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Back Side</h4>
                        <div className="relative bg-secondary/10 rounded-md overflow-hidden">
                          <img 
                            src={selectedDocument.backImage}
                            alt="Back Side" 
                            className="w-full object-contain max-h-[250px]"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white rounded-full h-7 w-7"
                            onClick={() => openImageViewer(selectedDocument.backImage)}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {selectedDocument.selfie && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Selfie</h4>
                        <div className="relative bg-secondary/10 rounded-md overflow-hidden">
                          <img 
                            src={selectedDocument.selfie}
                            alt="Selfie" 
                            className="w-full object-contain max-h-[250px]"
                          />
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white rounded-full h-7 w-7"
                            onClick={() => openImageViewer(selectedDocument.selfie)}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
            
            <DialogFooter className="pt-4 border-t">
              {selectedDocument && selectedDocument.status === 'pending' && (
                <div className="flex justify-between w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDocumentDialog(false)}
                  >
                    Cancel
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        handleStatusUpdate('rejected', selectedDocument.id);
                        setShowDocumentDialog(false);
                      }}
                      disabled={loading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button 
                      variant="default" 
                      onClick={() => {
                        handleStatusUpdate('approved', selectedDocument.id);
                        setShowDocumentDialog(false);
                      }}
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedDocument && selectedDocument.status !== 'pending' && (
                <Button onClick={() => setShowDocumentDialog(false)}>Close</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Full-size image viewer dialog */}
        <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 border-0 bg-transparent shadow-none">
            <div className="relative w-full h-full flex items-center justify-center">
              {selectedImage && (
                <img 
                  src={selectedImage} 
                  alt="Document" 
                  className="max-w-full max-h-[85vh] object-contain bg-white p-1 rounded-lg"
                />
              )}
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full"
                onClick={() => setShowImageViewer(false)}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-6">KYC Verification Status</h2>
        
        {kycDocuments.length === 0 && (
          <div className="p-4 bg-secondary/20 border border-border rounded-lg text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Not Verified
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              You haven't submitted your documents for verification yet. Complete KYC to unlock all platform features.
            </p>
            <Button 
              onClick={() => setShowUpload(true)}
            >
              Start Verification
            </Button>
          </div>
        )}
        
        {user.kycStatus === "approved" && approvedDocument && (
          <div className="p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-green-500">
                  Verification Complete
                </h3>
                <p className="text-muted-foreground mt-1">
                  Your identity has been verified successfully. You now have access to all platform features.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {user.kycStatus === "pending" && pendingDocument && (
          <div className="p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
            <div className="flex items-start">
              <Clock className="h-6 w-6 text-yellow-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-yellow-500">
                  Verification in Progress
                </h3>
                <p className="text-muted-foreground mt-1">
                  Your documents are being reviewed. This process usually takes 24-48 hours. We'll notify you once verification is complete.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {user.kycStatus === "rejected" && rejectedDocument && (
          <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg">
            <div className="flex items-start">
              <X className="h-6 w-6 text-red-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-red-500">
                  Verification Failed
                </h3>
                <p className="text-muted-foreground mt-1">
                  Your documents have been reviewed and could not be verified. Please submit new documents.
                </p>
                <Button 
                  onClick={() => setShowUpload(true)}
                  className="mt-4"
                >
                  Resubmit Documents
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
