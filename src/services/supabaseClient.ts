/**
 * Supabase client configuration
 * Used for syncing product catalog from cloud
 */

// Type definitions for product catalog
export interface ProductCatalogItem {
  id?: number;
  item_no: string;
  item_name: string;
  created_at?: string;
  updated_at?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseInstance: any = null;
let initError: Error | null = null;

// Lazy initialization to avoid issues during bundle
export function getSupabaseClient() {
  if (initError) {
    return null;
  }

  if (supabaseInstance) {
    return supabaseInstance;
  }

  try {
    // Access environment variables safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        "Supabase credentials not found. Product catalog sync will be disabled."
      );
      initError = new Error("Supabase credentials not configured");
      return null;
    }

    // Dynamic import to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@supabase/supabase-js");
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error);
    initError = error as Error;
    return null;
  }
}

export const supabase = null; // Deprecated, use getSupabaseClient() instead
