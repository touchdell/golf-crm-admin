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
