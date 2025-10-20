import { initializeAppCheck, getToken, ReCaptchaV3Provider } from 'firebase/app-check';
import app from '../../config/firebase';


// App Check token service
export class AppCheckService {
  private static token: string | null = null;
  private static appCheck: any = null;
  private static initializationPromise: Promise<boolean> | null = null;
  
  // Initialize Firebase App Check
  static async initializeAppCheck(): Promise<boolean> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }
  
  private static async _doInitialize(): Promise<boolean> {
    try {
      const isDevelopment = import.meta.env.DEV;
      if (isDevelopment) {
        // Enable debug mode for App Check in development
        if (typeof window !== 'undefined') {
          (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }
        
        try {
          this.appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider('6LefJk8rAAAAAAfLUDqssYCZ4w-5ZQu37hiW8m3h'),
            isTokenAutoRefreshEnabled: true
          });
          console.log('App Check initialized with debug mode');
          return true;
        } catch (error) {
          console.warn('App Check initialization failed:', error);
          return false;
        }
      }

      // In production, use ReCAPTCHA v3 provider
      const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
      console.log('Loaded reCAPTCHA site key:', recaptchaSiteKey);
      if (recaptchaSiteKey && recaptchaSiteKey !== 'your-recaptcha-site-key') {
        try {
          this.appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
            isTokenAutoRefreshEnabled: true
          });
          console.log('App Check initialized with ReCAPTCHA');
          return true;
        } catch (recaptchaError) {
          console.warn('ReCAPTCHA App Check failed:', recaptchaError);
        }
      }
      console.warn('No App Check configuration found');
      return false;
    } catch (error) {
      console.error('Failed to initialize App Check:', error);
      return false;
    }
  }

  // Get the current App Check token
  static async getToken(): Promise<string | null> {
    try {
      // In development, get token from App Check if available
      if (import.meta.env.DEV && this.appCheck) {
        try {
          const result = await getToken(this.appCheck);
          return result.token;
        } catch (error) {
          console.warn('Failed to get App Check token in dev mode:', error);
          return null;
        }
      }

      // If we have a token from environment or debug, use it
      if (this.token) {
        return this.token;
      }

      // If App Check is initialized with ReCAPTCHA, get token from Firebase
      if (this.appCheck) {
        const result = await getToken(this.appCheck);
        return result.token;
      }

      return null;
    } catch (error) {
      console.error('Failed to get App Check token:', error);
      return null;
    }
  }

  // Set a custom token (for testing or manual configuration)
  static setToken(token: string): void {
    this.token = token;
  }

  // Check if App Check is properly configured
  static isConfigured(): boolean {
    // Always configured in development (debug mode)
    if (import.meta.env.DEV) {
      return true;
    }
    return !!(this.token || this.appCheck);
  }

  // Get headers with App Check token for API requests
  static async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    
    if (token) {
      return {
        'X-Firebase-AppCheck': token,
        'X-Firebase-AppCheck-Token': token
      };
    }

    return {};
  }
}

// Auto-initialize App Check when this module is imported
AppCheckService.initializeAppCheck();

export default AppCheckService;
