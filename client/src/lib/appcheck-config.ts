import { AppCheckService } from './firebase/appcheck';


// App Check configuration utility
export class AppCheckConfig {
  private static initialized = false;

  // Initialize App Check when the app starts



  // Get App Check status for debugging

  // Manually set a token (for testing)
  static setToken(token: string) {
    AppCheckService.setToken(token);
    console.log('App Check token set manually');
  }
}

export default AppCheckConfig;
