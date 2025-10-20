import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from './index';

// Firebase Storage URL utility

/**
 * Convert Firebase Storage path to downloadable URL
 * @param storagePath - Firebase Storage path (gs://bucket/path or just path)
 * @returns Promise<string> - Downloadable URL
 */
export async function getStorageDownloadURL(storagePath: string): Promise<string> {
  try {
    console.log('Getting download URL for path:', storagePath);
    
    // Remove gs:// prefix if present and extract the actual path
    let cleanPath = storagePath;
    if (storagePath.startsWith('gs://')) {
      cleanPath = storagePath.replace(/^gs:\/\/[^\/]+\//, '');
    }
    
    // If the path doesn't start with kyc/, add it (for legacy compatibility)
    if (!cleanPath.startsWith('kyc/') && !cleanPath.includes('/')) {
      cleanPath = `kyc/${cleanPath}`;
    }
    
    console.log('Clean storage path:', cleanPath);
    
    // Create storage reference
    const storageRef = ref(storage, cleanPath);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('Generated download URL:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error getting download URL for storage path:', storagePath, error);
    
    // Try alternative path formats
    try {
      // Try with kyc/ prefix if not already present
      let altPath = storagePath.replace(/^gs:\/\/[^\/]+\//, '');
      if (!altPath.startsWith('kyc/')) {
        altPath = `kyc/${altPath}`;
      }
      
      console.log('Trying alternative path:', altPath);
      const altStorageRef = ref(storage, altPath);
      const altDownloadURL = await getDownloadURL(altStorageRef);
      
      console.log('Alternative path succeeded:', altDownloadURL);
      return altDownloadURL;
    } catch (altError) {
      console.error('Alternative path also failed:', altError);
      throw error; // Throw original error
    }
  }
}

/**
 * Convert multiple storage paths to download URLs
 * @param paths - Object with storage paths
 * @returns Promise<object> - Object with download URLs
 */
export async function getMultipleStorageDownloadURLs<T extends Record<string, string | null | undefined>>(
  paths: T
): Promise<{ [K in keyof T]: string | null }> {
  const result = {} as { [K in keyof T]: string | null };
  
  for (const [key, path] of Object.entries(paths)) {
    if (path && typeof path === 'string' && path.trim() !== '') {
      try {
        result[key as keyof T] = await getStorageDownloadURL(path);
      } catch (error) {
        console.error(`Failed to get download URL for ${String(key)}:`, path, error);
        result[key as keyof T] = null;
      }
    } else {
      result[key as keyof T] = null;
    }
  }
  
  return result;
}

/**
 * Batch convert KYC documents storage paths to download URLs
 * This function handles both the old (idProof, addressProof) and new (frontImageUrl, backImageUrl) naming formats
 * @param kycDocuments - KYC documents with storage paths
 * @returns Promise<object> - KYC documents with download URLs
 */
export async function getKYCDocumentURLs(kycDocuments: {
  idProof?: string;
  addressProof?: string;
  selfie?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  selfieUrl?: string;
} | null | undefined): Promise<{
  idProof: string | null;
  addressProof: string | null;
  selfie: string | null;
} | null> {
  if (!kycDocuments) {
    console.log('No KYC documents provided');
    return null;
  }
  
  console.log('Processing KYC documents:', kycDocuments);
  
  // Map both naming formats to a consistent structure
  const documentMap = {
    idProof: kycDocuments.idProof || kycDocuments.frontImageUrl,
    addressProof: kycDocuments.addressProof || kycDocuments.backImageUrl,
    selfie: kycDocuments.selfie || kycDocuments.selfieUrl
  };
  
  // Check if URLs are already in https:// format and don't need conversion
  const hasHttpsUrls = Object.values(documentMap).some(url => 
    url && typeof url === 'string' && url.startsWith('https://')
  );
  
  // If we have https:// URLs, just return them directly
  if (hasHttpsUrls) {
    console.log('Using direct HTTPS URLs:', documentMap);
    return {
      idProof: documentMap.idProof || null,
      addressProof: documentMap.addressProof || null,
      selfie: documentMap.selfie || null
    };
  }
  
  // Otherwise, convert from Firebase Storage paths
  try {
    const urls = await getMultipleStorageDownloadURLs({
      idProof: documentMap.idProof,
      addressProof: documentMap.addressProof,
      selfie: documentMap.selfie
    });
    
    console.log('Generated KYC document URLs:', urls);
    return urls;
  } catch (error) {
    console.error('Error converting KYC document paths to URLs:', error);
    return {
      idProof: null,
      addressProof: null,
      selfie: null
    };
  }
}

/**
 * List all files in the KYC storage directory
 * @param userId - Optional user ID to filter documents
 * @returns Promise<string[]> - Array of file paths
 */
export async function listKYCDocuments(userId?: string): Promise<string[]> {
  try {
    // Note: Firebase Storage client SDK doesn't support listing files
    // This would need to be implemented on the server side
    // For now, we'll return an empty array and rely on document paths stored in Firestore
    console.warn('File listing is not supported in client-side Firebase Storage');
    return [];
  } catch (error) {
    console.error('Error listing KYC documents:', error);
    return [];
  }
}
