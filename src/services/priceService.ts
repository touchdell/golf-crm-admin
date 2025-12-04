import { supabase } from '../lib/supabase';

export type PriceCategory = 'GREEN_FEE' | 'CART' | 'CADDY' | 'OTHER';

export interface PriceItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  unitPrice: number;
  currency: string;
  isActive: boolean;
  category: PriceCategory;
}

export interface CreatePriceItemRequest {
  code: string;
  name: string;
  description?: string;
  unitPrice: number;
  currency: string;
  category: PriceCategory;
}

export interface UpdatePriceItemRequest {
  code?: string;
  name?: string;
  description?: string;
  unitPrice?: number;
  currency?: string;
  category?: PriceCategory;
  isActive?: boolean;
}

// Database row interface
interface DbPriceItemRow {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  unit_price: number;
  currency: string;
  is_active: boolean;
  category: string;
}

// Helper function to map database row to PriceItem interface
const mapDbRowToPriceItem = (row: DbPriceItemRow): PriceItem => {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || undefined,
    unitPrice: Number(row.unit_price),
    currency: row.currency,
    isActive: row.is_active,
    category: row.category as PriceCategory,
  };
};

// Helper function to map PriceItem to database row
const mapPriceItemToDbRow = (item: CreatePriceItemRequest | UpdatePriceItemRequest) => {
  const row: Record<string, unknown> = {};
  if ('code' in item && item.code !== undefined) row.code = item.code;
  if ('name' in item && item.name !== undefined) row.name = item.name;
  if ('description' in item) row.description = item.description || null;
  if ('unitPrice' in item && item.unitPrice !== undefined) row.unit_price = item.unitPrice;
  if ('currency' in item && item.currency !== undefined) row.currency = item.currency;
  if ('category' in item && item.category !== undefined) row.category = item.category;
  if ('isActive' in item && item.isActive !== undefined) row.is_active = item.isActive;
  return row;
};

export const getPriceItems = async (): Promise<PriceItem[]> => {
  try {
    const { data, error } = await supabase
      .from('price_items')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapDbRowToPriceItem);
  } catch (error) {
    console.error('Error fetching price items:', error);
    return [];
  }
};

export const createPriceItem = async (
  data: CreatePriceItemRequest,
): Promise<PriceItem> => {
  try {
    const dbRow = mapPriceItemToDbRow({ ...data, isActive: true });

    const { data: created, error } = await supabase
      .from('price_items')
      .insert(dbRow)
      .select()
      .single();

    if (error) throw error;
    if (!created) throw new Error('Failed to create price item');

    return mapDbRowToPriceItem(created);
  } catch (error) {
    console.error('Error creating price item:', error);
    throw error;
  }
};

export const updatePriceItem = async (
  id: number,
  data: UpdatePriceItemRequest,
): Promise<PriceItem> => {
  try {
    const dbRow = mapPriceItemToDbRow(data);

    const { data: updated, error } = await supabase
      .from('price_items')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) throw new Error('Price item not found');

    return mapDbRowToPriceItem(updated);
  } catch (error) {
    console.error('Error updating price item:', error);
    throw error;
  }
};

export const togglePriceItemActive = async (
  id: number,
  isActive: boolean,
): Promise<PriceItem> => {
  return updatePriceItem(id, { isActive });
};

export const deletePriceItem = async (id: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('price_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting price item:', error);
    throw error;
  }
};

// ============================================
// Promotion Pricing Engine
// ============================================

export type MemberSegment = 'THAI' | 'FOREIGN_WP' | 'FOREIGN_OTHER' | 'ALL';

export interface BestPriceResult {
  finalPrice: number;
  basePrice: number;
  source: 'PROMOTION' | 'BASE';
  promotionCode?: string | null;
  promotionName?: string | null;
  includesGreenFee: boolean;
  includesCaddy: boolean;
  includesCart: boolean;
}

export interface GetBestPriceParams {
  teeDate: string; // YYYY-MM-DD format
  teeTime: string; // HH:mm format
  basePrice: number;
  memberSegment: MemberSegment;
  courseId: number;
  numPlayers: number;
}

/**
 * Maps membership type code to member segment for promotion pricing.
 * This is a simple mapping - you may need to adjust based on your actual membership types.
 */
export function mapMembershipTypeToSegment(membershipTypeCode: string | undefined | null): MemberSegment {
  if (!membershipTypeCode) {
    return 'ALL'; // Default to ALL if no membership type
  }

  const code = membershipTypeCode.toUpperCase();
  
  // Map common membership type codes to segments
  // Adjust these mappings based on your actual membership type codes
  if (code.includes('THAI') || code === 'TH') {
    return 'THAI';
  }
  if (code.includes('WORK_PERMIT') || code.includes('WP') || code.includes('FOREIGN_WP')) {
    return 'FOREIGN_WP';
  }
  if (code.includes('FOREIGN') || code.includes('INTL')) {
    return 'FOREIGN_OTHER';
  }
  
  // Default to ALL if no specific match
  return 'ALL';
}

/**
 * Gets the best price for a tee time booking considering all active promotions.
 * Calls the Supabase RPC function get_best_price() which automatically selects
 * the best matching promotion based on date, time, member segment, course, and player count.
 */
export async function getBestPrice(params: GetBestPriceParams): Promise<BestPriceResult> {
  try {
    // Ensure teeTime is in HH:mm:ss format for PostgreSQL
    const teeTimeFormatted = params.teeTime.length === 5 
      ? `${params.teeTime}:00` 
      : params.teeTime;

    // Call Supabase RPC function
    const { data, error } = await supabase.rpc('get_best_price', {
      p_tee_date: params.teeDate,
      p_tee_time: teeTimeFormatted,
      p_base_price: params.basePrice,
      p_member_segment: params.memberSegment,
      p_course_id: params.courseId,
      p_num_players: params.numPlayers,
    });

    if (error) {
      console.error('Error calling get_best_price RPC:', error);
      // Fallback to base pricing on error
      return {
        finalPrice: params.basePrice,
        basePrice: params.basePrice,
        source: 'BASE',
        includesGreenFee: true,
        includesCaddy: true,
        includesCart: true,
      };
    }

    // RPC returns an array, get first result
    const result = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!result) {
      // No result from RPC, fallback to base pricing
      return {
        finalPrice: params.basePrice,
        basePrice: params.basePrice,
        source: 'BASE',
        includesGreenFee: true,
        includesCaddy: true,
        includesCart: true,
      };
    }

    // Map database response to BestPriceResult
    return {
      finalPrice: Number(result.final_price || params.basePrice),
      basePrice: Number(result.base_price || params.basePrice),
      source: result.source === 'PROMOTION' ? 'PROMOTION' : 'BASE',
      promotionCode: result.promotion_code || null,
      promotionName: result.promotion_name || null,
      includesGreenFee: result.includes_green_fee !== false, // Default to true
      includesCaddy: result.includes_caddy !== false, // Default to true
      includesCart: result.includes_cart !== false, // Default to true
    };
  } catch (error) {
    console.error('Error in getBestPrice:', error);
    // Fallback to base pricing on any error
    return {
      finalPrice: params.basePrice,
      basePrice: params.basePrice,
      source: 'BASE',
      includesGreenFee: true,
      includesCaddy: true,
      includesCart: true,
    };
  }
}
