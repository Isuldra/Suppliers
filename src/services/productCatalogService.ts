/**
 * Product Catalog Service
 * Handles syncing product data with Supabase and local caching
 */

import { getSupabaseClient, ProductCatalogItem } from "./supabaseClient";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const log = require("electron-log/main");

export class ProductCatalogService {
  private static instance: ProductCatalogService;
  private cache: Map<string, string> = new Map(); // itemNo -> itemName
  private lastSync: number = 0;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): ProductCatalogService {
    if (!ProductCatalogService.instance) {
      ProductCatalogService.instance = new ProductCatalogService();
    }
    return ProductCatalogService.instance;
  }

  /**
   * Sync product catalog from Supabase
   */
  public async syncFromCloud(): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> {
    try {
      const supabase = getSupabaseClient();

      if (!supabase) {
        log.warn(
          "Supabase client not available. Product catalog sync skipped."
        );
        return { success: false, count: 0, error: "Supabase not configured" };
      }

      log.info("Syncing product catalog from Supabase...");

      const { data, error } = await supabase
        .from("product_catalog")
        .select("item_no, item_name");

      if (error) {
        log.error("Error syncing from Supabase:", error);
        return { success: false, count: 0, error: error.message };
      }

      // Update cache
      this.cache.clear();
      if (data) {
        data.forEach((item: ProductCatalogItem) => {
          this.cache.set(item.item_no, item.item_name);
        });
      }

      this.lastSync = Date.now();
      log.info(`Product catalog synced: ${this.cache.size} products`);

      return { success: true, count: this.cache.size };
    } catch (error) {
      log.error("Exception during sync:", error);
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Upload product catalog to Supabase
   */
  public async uploadToCloud(
    products: ProductCatalogItem[]
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      const supabase = getSupabaseClient();

      if (!supabase) {
        log.warn(
          "Supabase client not available. Product catalog upload skipped."
        );
        return { success: false, count: 0, error: "Supabase not configured" };
      }

      log.info(`Uploading ${products.length} products to Supabase...`);

      // Delete existing products first (full replace)
      const { error: deleteError } = await supabase
        .from("product_catalog")
        .delete()
        .neq("id", 0); // Delete all rows

      if (deleteError) {
        log.error("Error deleting old products:", deleteError);
        return { success: false, count: 0, error: deleteError.message };
      }

      // Insert new products in batches of 1000
      const batchSize = 1000;
      let totalInserted = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        const { error: insertError } = await supabase
          .from("product_catalog")
          .insert(batch);

        if (insertError) {
          log.error(
            `Error inserting batch ${i}-${i + batch.length}:`,
            insertError
          );
          return {
            success: false,
            count: totalInserted,
            error: insertError.message,
          };
        }

        totalInserted += batch.length;
        log.info(`Uploaded ${totalInserted}/${products.length} products...`);
      }

      // Sync to update local cache
      await this.syncFromCloud();

      log.info(`Product catalog upload complete: ${totalInserted} products`);
      return { success: true, count: totalInserted };
    } catch (error) {
      log.error("Exception during upload:", error);
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get product name by item number
   */
  public getProductName(itemNo: string): string | null {
    return this.cache.get(itemNo) || null;
  }

  /**
   * Check if sync is needed
   */
  public needsSync(): boolean {
    return Date.now() - this.lastSync > this.SYNC_INTERVAL;
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { count: number; lastSync: Date | null } {
    return {
      count: this.cache.size,
      lastSync: this.lastSync > 0 ? new Date(this.lastSync) : null,
    };
  }
}

export const productCatalogService = ProductCatalogService.getInstance();
