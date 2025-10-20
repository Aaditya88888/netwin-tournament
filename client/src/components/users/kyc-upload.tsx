import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { uploadFile } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";

import {Form,
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
import {
  ArrowLeft,
  ShieldCheck,
  UploadCloud,
  HelpCircle,
  Image,
  Camera,
  Loader2,
} from "lucide-react";

// Form schema
const kycSchema = z.object({
  documentType: z.string({
    required_error: "Please select document type",
  }),
  documentNumber: z.string().min(5, {
    message: "Document number must be at least 5 characters",
  }),
  frontImage: z.string({
    required_error: "Front image is required",
  }),
  // Back image is optional for all document types
  backImage: z.string().optional(),
  selfie: z.string({
    required_error: "Selfie is required",
  }),
});

type KycFormValues = z.infer<typeof kycSchema>;

interface KycUploadProps {
  userId: string;
  onComplete?: () => void;
  onBack?: () => void;
}

const documentTypes = [
  { value: "id-proof", label: "National ID" },
  { value: "address-proof", label: "Address Proof" },
  { value: "pan-card", label: "PAN Card" },
  { value: "passport", label: "Passport" },
  { value: "driving-license", label: "Driving License" }
];

export default function KycUpload({ userId, onComplete, onBack }: KycUploadProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);
  const selfieFileRef = useRef<HTMLInputElement>(null);
  
  // Form
  const form = useForm<KycFormValues>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      documentType: "",
      documentNumber: "",
      frontImage: "",
      backImage: "",
      selfie: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: KycFormValues) => {
    setIsSubmitting(true);
    try {
      // Step 1: Upload images to Firebase Storage
      const frontImagePath = `kyc/${userId}/${values.documentType}/front-${Date.now()}`;
      const selfiePath = `kyc/${userId}/${values.documentType}/selfie-${Date.now()}`;
      
      // Upload front image
      const frontImageUrl = await uploadFileFromBase64(values.frontImage, frontImagePath);
      
      // Upload selfie
      const selfieUrl = await uploadFileFromBase64(values.selfie, selfiePath);
      
      // Upload back image if provided
      let backImageUrl = null;
      if (values.backImage) {
        const backImagePath = `kyc/${userId}/${values.documentType}/back-${Date.now()}`;
        backImageUrl = await uploadFileFromBase64(values.backImage, backImagePath);
      }
      
      // Step 2: Create KYC document in Firestore through API
      const response = await apiRequest('POST', `/users/${userId}/kyc`, {
        userId,
        type: values.documentType,
        documentType: values.documentType, // Ensure documentType is set to be consistent
        documentNumber: values.documentNumber,
        frontImageUrl,
        backImageUrl,
        selfieUrl,
        status: 'pending'
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit KYC documents');
      }
      
      // Step 3: Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['users', userId] });
      
      toast({
        title: "KYC submitted successfully",
        description: "Your documents have been submitted for verification.",
      });
      
      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('KYC submission error:', error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Failed to submit KYC documents. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Upload file from base64 data
  const uploadFileFromBase64 = async (base64Data: string, path: string) => {
    try {
      // Convert base64 to blob
      const byteString = atob(base64Data.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: 'image/jpeg' });
      const file = new File([blob], `image-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Upload to Firebase Storage
      return await uploadFile(path, file);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload document image');
    }
  };
  
  // Handle image upload with base64 conversion for form submission
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "frontImage" | "backImage" | "selfie") => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload an image file.",
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image size should be less than 5MB.",
      });
      return;
    }
    
    setUploading(fieldName);
    try {
      // Convert to base64 for form submission
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Set the base64 data URL in the form
          form.setValue(fieldName, reader.result);
          
          toast({
            title: "Image uploaded",
            description: "Document image uploaded successfully.",
          });
          setUploading(null);
        }
      };
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: "Failed to read image file. Please try again.",
        });
        setUploading(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
      });
      setUploading(null);
    }
  };
  
  // Trigger file input click
  const triggerFileUpload = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
  };
  
  // Go back
  const goBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Go back to previous page
      window.history.back();
    }
  };
  
  // Back photo is now available for all document types
  const needsBackImage = !!form.watch("documentType");

  return (
    <Card className="bg-card border-border">
      <div className="p-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={goBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h2 className="text-xl font-semibold mb-2">Document Verification</h2>
        <p className="text-muted-foreground mb-6">
          Upload your identity documents for verification. This is required for withdrawals and high-stakes tournaments.
        </p>
        
        <Alert className="mb-6 bg-primary/10 border-primary/30">
          <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
          <div>
            <AlertTitle className="text-primary">Secure Verification</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Your documents are encrypted and used only for verification purposes. We never share your data with third parties. For all document types, you can now optionally upload both front and back photos.
            </AlertDescription>
          </div>
        </Alert>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documentTypes.map((doc) => (
                            <SelectItem key={doc.value} value={doc.value}>
                              {doc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter document number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-6">
              <h3 className="text-base font-medium">Document Images</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="frontImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Front Side</FormLabel>
                      <FormControl>
                        <div>
                          <input
                            type="file"
                            ref={frontFileRef}
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, "frontImage")}
                          />
                          
                          {field.value ? (
                            <div className="relative">
                              <img
                                src={field.value}
                                alt="Front side"
                                className="w-full h-40 object-cover rounded-lg border border-border"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="absolute bottom-2 right-2"
                                onClick={() => triggerFileUpload(frontFileRef)}
                              >
                                <Image className="h-4 w-4 mr-1" />
                                Change
                              </Button>
                            </div>
                          ) : (
                            <div
                              className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                              onClick={() => triggerFileUpload(frontFileRef)}
                            >
                              {uploading === "frontImage" ? (
                                <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                              ) : (
                                <>
                                  <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                                  <p className="text-sm text-muted-foreground">
                                    Click to upload front side
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    PNG, JPG or JPEG (max 5MB)
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {needsBackImage && (
                  <FormField
                    control={form.control}
                    name="backImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Back Side (Optional)</FormLabel>
                        <FormControl>
                          <div>
                            <input
                              type="file"
                              ref={backFileRef}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, "backImage")}
                            />
                            
                            {field.value ? (
                              <div className="relative">
                                <img
                                  src={field.value}
                                  alt="Back side"
                                  className="w-full h-40 object-cover rounded-lg border border-border"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="absolute bottom-2 right-2"
                                  onClick={() => triggerFileUpload(backFileRef)}
                                >
                                  <Image className="h-4 w-4 mr-1" />
                                  Change
                                </Button>
                              </div>
                            ) : (
                              <div
                                className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                                onClick={() => triggerFileUpload(backFileRef)}
                              >
                                <div className="text-center text-xs text-muted-foreground mb-2">
                                  Optional for all document types
                                </div>
                                {uploading === "backImage" ? (
                                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                                ) : (
                                  <>
                                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                      Click to upload back side
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      PNG, JPG or JPEG (max 5MB)
                                    </p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              
              <FormField
                control={form.control}
                name="selfie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selfie with Document</FormLabel>
                    <FormControl>
                      <div>
                        <input
                          type="file"
                          ref={selfieFileRef}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, "selfie")}
                        />
                        
                        {field.value ? (
                          <div className="relative">
                            <img
                              src={field.value}
                              alt="Selfie with document"
                              className="w-full h-60 object-cover rounded-lg border border-border"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="absolute bottom-2 right-2"
                              onClick={() => triggerFileUpload(selfieFileRef)}
                            >
                              <Camera className="h-4 w-4 mr-1" />
                              Change
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex flex-col items-center justify-center h-60 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                            onClick={() => triggerFileUpload(selfieFileRef)}
                          >
                            {uploading === "selfie" ? (
                              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                            ) : (
                              <>
                                <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  Take a selfie holding your document
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  PNG, JPG or JPEG (max 5MB)
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Requirements</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                    <li>All document details must be clearly visible</li>
                    <li>Take the selfie with your face and document clearly visible</li>
                    <li>Ensure good lighting when taking photos</li>
                    <li>Documents must be valid and not expired</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Card>
  );
}
