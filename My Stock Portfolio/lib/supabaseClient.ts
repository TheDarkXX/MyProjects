import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials as per user request.
export const supabaseUrl = 'https://xthvsdjsughsrjpksjzu.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aHZzZGpzdWdoc3JqcGtzanp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTQ2NzMsImV4cCI6MjA3NDM5MDY3M30.W3Tn4nlrpTW9nJqPNsPO8s97GjZri_x0YFnBqtymZ4I';

// Initialize the Supabase client with the provided credentials.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);