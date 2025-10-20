import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL } from "@/config/api";
import AppCheckService from "@/lib/firebase/appcheck";


async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage;
    try {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        errorMessage = data.message || data.error || res.statusText;
      } catch {
        errorMessage = text || res.statusText;
      }
    } catch {
      errorMessage = res.statusText;
    }
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // FIX FOR KYC VERIFICATION ISSUE
  // Detect and fix calls to the old, non-existent endpoint
  if (url.match(/\/admin\/kyc\/.*\/verify/) && method === 'POST') {
    console.log('⚠️ DETECTED DEPRECATED KYC VERIFY ENDPOINT - REDIRECTING TO NEW ENDPOINT');
    const userId = url.split('/')[3]; // Extract the user ID from the URL
    url = `/users/${userId}/kyc`;
    method = 'PATCH';
    console.log('✅ REDIRECTED TO:', url);
    
    // Make sure we have the right data format
    if (data && typeof data === 'object') {
      // @ts-ignore
      const action = data.action || 'approve';
      data = {
        kycStatus: action === 'approve' ? 'APPROVED' : 'REJECTED',
        // @ts-ignore
        docId: data.docId || undefined,
        // @ts-ignore
        rejectionReason: data.reason || undefined,
        // @ts-ignore
        notes: data.notes || undefined
      };
    }
  }

  // Skip API calls in production if no API_BASE_URL
  if (!API_BASE_URL) {
    console.log('No API URL configured, skipping request');
    // Return mock response for production
    return new Response(JSON.stringify({ message: 'No API configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = localStorage.getItem('adminToken');
  console.log('API Request Details:', {
    method,
    url,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'None'
  });
  
  // Handle URLs that start with http
  const fullUrl = url.startsWith('http') 
    ? url 
    : `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
  console.log('Full API URL:', fullUrl);
  
  // Get App Check headers
  const appCheckHeaders = await AppCheckService.getHeaders();
  console.log('App Check headers obtained:', appCheckHeaders);

  // Build headers with App Check and auth token
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...appCheckHeaders, // Include App Check headers
  };

  console.log('Request headers:', headers);

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache'
    });

    console.log('API Response:', {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries())
    });

    // Handle token expiration
    if (res.status === 401 && token) {
      console.log('Token expired, clearing authentication data');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
      throw new Error('Session expired. Please login again.');
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Log error for debugging
    console.error('API Request Error:', {
      url: fullUrl,
      method,
      error
    });
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    try {
      const res = await apiRequest('GET', url);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
      
      return await res.json();
    } catch (error: any) {
      // Enhance error with status code if present
      if (error.status) {
        error.message = `${error.status}: ${error.message}`;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 401/403 errors
        if (error?.status === 401 || error?.status === 403) return false;
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});
