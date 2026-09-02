import { supabase } from './supabaseClient';

// --- TIMEZONE UTILITIES ---

/**
 * Formats an ISO 8601 string or a Date object into a user-friendly string 
 * using the user's local timezone.
 * 
 * @param isoStringOrDate - The date to format, as an ISO string (assumed to be UTC) or a Date object.
 * @param options - Optional Intl.DateTimeFormatOptions to customize the output.
 * @returns A formatted date-time string (e.g., "01 Oct 2025, 17:53") or an empty string if input is invalid.
 */
export const formatToUserTimezone = (
    isoStringOrDate: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string => {
    if (!isoStringOrDate) return '';
    try {
        const dateObj = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
        
        const defaultOptions: Intl.DateTimeFormatOptions = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        };

        // Using en-GB locale provides the DD MMM YYYY format.
        // By omitting the timeZone option, Intl.DateTimeFormat defaults to the user's local timezone.
        return new Intl.DateTimeFormat('en-GB', { ...defaultOptions, ...options }).format(dateObj);
    } catch {
        return 'Invalid Date';
    }
};

/**
 * Converts a date from a datetime-local input into a UTC ISO string
 * suitable for storing in a Supabase 'timestamptz' column.
 * 
 * @param localDateTimeString - The date string from an <input type="datetime-local">.
 * @returns A full ISO 8601 string in UTC.
 */
export const localInputToUTCISO = (localDateTimeString: string): string => {
    if (!localDateTimeString) return new Date().toISOString();
    // The input lacks timezone info, so new Date() will parse it in the browser's local timezone.
    // .toISOString() then correctly converts it to the UTC equivalent.
    return new Date(localDateTimeString).toISOString();
};


// --- LOGGING ---

/**
 * Logs a conversation with the AI to the Supabase database.
 * @param prompt The user's prompt sent to the AI.
 * @param response The AI's response.
 */
export const logAiConversation = async (prompt: string, response: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('ai_conversations')
      .insert([
        { prompt, response },
      ]);

    if (error) {
      console.error('Error logging AI conversation to Supabase:', error.message);
    }
  } catch (err) {
    if (err instanceof Error) {
        console.error('An unexpected error occurred while logging AI conversation:', err.message);
    } else {
        console.error('An unexpected, non-Error object was thrown while logging AI conversation:', err);
    }
  }
};