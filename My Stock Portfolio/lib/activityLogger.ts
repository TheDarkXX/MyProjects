import { supabase } from './supabaseClient';

// A unique session ID for grouping related actions within a single app load
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Logs a user or system action to the database for auditing and changelog purposes.
 * This reuses the 'restore_checkpoints' table as a general activity log.
 * @param action_type A clear identifier for the action (e.g., 'transaction_add', 'portfolio_rename').
 * @param metadata An object containing relevant details about the action.
 */
export const logActivity = async (action_type: string, metadata: any = {}): Promise<void> => {
  try {
    const logData = {
      action_type,
      metadata: {
        ...metadata,
        app_version: "1.1.0", // Manually versioned for this change
        session_id: sessionId,
      }
    };
    const { error } = await supabase.from('restore_checkpoints').insert([logData]);
    if (error) {
        console.warn("⚠️ Activity log save failed:", error);
    }
  } catch (error) {
    console.warn("⚠️ An unexpected error occurred while logging activity:", error);
  }
};
