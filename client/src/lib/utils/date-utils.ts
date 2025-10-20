/**
 * Date utility functions for safe date handling
 */

/**
 * Safely convert a date to ISO string format for datetime-local inputs
 * @param date - Date value (string, Date object, or null/undefined)
 * @returns Formatted date string for datetime-local input (YYYY-MM-DDTHH:MM) or empty string if invalid
 */
export function toDateTimeLocalString(date: string | Date | null | undefined): string {
  if (!date) return "";
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date format:', date);
      return "";
    }
    return dateObj.toISOString().slice(0, 16);
  } catch (error) {
    console.warn('Error converting date to datetime-local format:', date, error);
    return "";
  }
}

/**
 * Safely convert a date to ISO string format
 * @param date - Date value (string, Date object, or null/undefined)
 * @returns ISO string or empty string if invalid
 */
export function toISOStringSafe(date: string | Date | null | undefined): string {
  if (!date) return "";
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date format:', date);
      return "";
    }
    return dateObj.toISOString();
  } catch (error) {
    console.warn('Error converting date to ISO string:', date, error);
    return "";
  }
}

/**
 * Check if a date value is valid
 * @param date - Date value to validate
 * @returns true if valid, false otherwise
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  
  try {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  } catch (error) {
    return false;
  }
}

/**
 * Format date for display
 * @param date - Date value to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string or 'Invalid Date' if invalid
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  if (!date) return 'Not set';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return dateObj.toLocaleDateString(undefined, options);
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Safely formats a date using date-fns format
 * @param date - Date in string, Date, or timestamp format
 * @param formatStr - Format string for date-fns
 * @returns Formatted date string or fallback text
 */
export function safeFormat(
  date: string | Date | number | undefined | null, 
  formatStr: string = 'MMM dd, yyyy', 
  fallback: string = 'Not available'
): string {
  if (!date) {
    return fallback;
  }

  try {
    // If it's already a Date object
    if (date instanceof Date) {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }).format(date);
    }
    
    // If it's a timestamp (number)
    if (typeof date === 'number') {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      }).format(new Date(date));
    }
    
    // If it's a string, try parsing it as a date
    if (typeof date === 'string') {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit'
        }).format(dateObj);
      }
    }
    
    // If all fails
    return fallback;
  } catch (error) {
    console.error("Error formatting date:", error, "Date was:", date);
    return fallback;
  }
}

/**
 * Safely parse a date value into a Date object
 * @param date - Date value (string, Date object, or null/undefined)
 * @param fallback - Fallback Date object if parsing fails (defaults to current date)
 * @returns Valid Date object
 */
export function parseDate(
  date: string | Date | null | undefined,
  fallback: Date = new Date()
): Date {
  if (!date) return fallback;
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date format, using fallback:', date);
      return fallback;
    }
    return dateObj;
  } catch (error) {
    console.warn('Error parsing date, using fallback:', date, error);
    return fallback;
  }
}
