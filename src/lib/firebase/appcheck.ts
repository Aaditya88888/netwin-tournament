import { initializeAppCheck, getToken, ReCaptchaV3Provider } from 'firebase/app-check';
import app from './firebase';

// App Check token service
export class AppCheckService {
  private static token: string | null = null;
  private static appCheck: any = null;

  // Initialize Firebase App Check
  static async initializeAppCheck() {
    try {
      // Get the App Check token from environment
      const envToken = import.meta.env.VITE_FB_APP_CHECK_TOKEN;
      
      if (envToken && envToken !== 'your-firebase-app-check-token-here') {
        this.token = envToken;
        console.log('App Check token loaded from environment');
        return true;
      }

      // If no environment token, try to initialize with ReCAPTCHA
      const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
      
      if (recaptchaSiteKey && recaptchaSiteKey !== 'your-recaptcha-site-key') {
        // Initialize App Check with ReCAPTCHA v3
        this.appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true
        });
        
        console.log('App Check initialized with ReCAPTCHA');
        return true;
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
      // If we have a token from environment, use it
      if (this.token) {
        return this.token;
      }

      // If App Check is initialized, get token from Firebase
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
