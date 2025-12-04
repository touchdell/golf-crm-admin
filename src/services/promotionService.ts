import { supabase } from '../lib/supabase';

export type DayGroup = 'ALL' | 'WEEKDAY' | 'WEEKEND';
export type PriceActionType = 'FIXED_PRICE' | 'DISCOUNT_THB' | 'DISCOUNT_PERCENT';
export type MemberSegment = 'THAI' | 'FOREIGN_WP' | 'FOREIGN_OTHER' | 'ALL';

export interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
  priority: number;
  stacking: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionBand {
  id: string;
  promotionId: string;
  dayGroup: DayGroup;
  dowMask: number; // Day of week mask (0-127, bitmask)
  timeFrom: string; // HH:mm
  timeTo: string; // HH:mm
  courseId: number | null;
  playerSegment: MemberSegment | null;
  minLeadDays: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  actionType: PriceActionType;
  actionValue: number;
  includesGreenFee: boolean;
  includesCaddy: boolean;
  includesCart: boolean;
  extraConditions: Record<string, any> | null;
  extraMeta: Record<string, any> | null;
  createdAt: string;
}

export interface CreatePromotionRequest {
  code: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  priority?: number;
  stacking?: string;
}

export interface UpdatePromotionRequest {
  code?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  priority?: number;
  stacking?: string;
}

export interface CreatePromotionBandRequest {
  promotionId: string;
  dayGroup: DayGroup;
  dowMask?: number;
  timeFrom: string;
  timeTo: string;
  courseId?: number | null;
  playerSegment?: MemberSegment | null;
  minLeadDays?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  actionType: PriceActionType;
  actionValue: number;
  includesGreenFee?: boolean;
  includesCaddy?: boolean;
  includesCart?: boolean;
  extraConditions?: Record<string, any> | null;
  extraMeta?: Record<string, any> | null;
}

export interface UpdatePromotionBandRequest {
  dayGroup?: DayGroup;
  dowMask?: number;
  timeFrom?: string;
  timeTo?: string;
  courseId?: number | null;
  playerSegment?: MemberSegment | null;
  minLeadDays?: number | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  actionType?: PriceActionType;
  actionValue?: number;
  includesGreenFee?: boolean;
  includesCaddy?: boolean;
  includesCart?: boolean;
  extraConditions?: Record<string, any> | null;
  extraMeta?: Record<string, any> | null;
}

// Database row interfaces
interface DbPromotionRow {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  priority: number;
  stacking: string;
  created_at: string;
  updated_at: string;
}

interface DbPromotionBandRow {
  id: string;
  promotion_id: string;
  day_group: string;
  dow_mask: number;
  time_from: string;
  time_to: string;
  course_id: number | null;
  player_segment: string | null;
  min_lead_days: number | null;
  max_lead_days: number | null;
  min_players: number | null;
  max_players: number | null;
  action_type: string;
  action_value: number;
  includes_green_fee: boolean;
  includes_caddy: boolean;
  includes_cart: boolean;
  extra_conditions: any;
  extra_meta: any;
  created_at: string;
}

// Helper functions to map database rows to interfaces
const mapDbRowToPromotion = (row: DbPromotionRow): Promotion => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description || undefined,
  startDate: row.start_date,
  endDate: row.end_date,
  isActive: row.is_active,
  priority: row.priority,
  stacking: row.stacking,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDbRowToPromotionBand = (row: DbPromotionBandRow): PromotionBand => ({
  id: row.id,
  promotionId: row.promotion_id,
  dayGroup: row.day_group as DayGroup,
  dowMask: row.dow_mask,
  timeFrom: row.time_from.substring(0, 5), // Extract HH:mm from HH:mm:ss
  timeTo: row.time_to.substring(0, 5),
  courseId: row.course_id,
  playerSegment: (row.player_segment as MemberSegment) || null,
  minLeadDays: row.min_lead_days,
  minPlayers: row.min_players,
  maxPlayers: row.max_players,
  actionType: row.action_type as PriceActionType,
  actionValue: Number(row.action_value),
  includesGreenFee: row.includes_green_fee,
  includesCaddy: row.includes_caddy,
  includesCart: row.includes_cart,
  extraConditions: row.extra_conditions,
  extraMeta: row.extra_meta,
  createdAt: row.created_at,
});

// Promotion CRUD operations
export const getPromotions = async (): Promise<Promotion[]> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapDbRowToPromotion);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    throw error;
  }
};

export const getPromotionById = async (id: string): Promise<Promotion> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Promotion not found');

    return mapDbRowToPromotion(data);
  } catch (error) {
    console.error('Error fetching promotion:', error);
    throw error;
  }
};

export const createPromotion = async (payload: CreatePromotionRequest): Promise<Promotion> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .insert({
        code: payload.code,
        name: payload.name,
        description: payload.description || null,
        start_date: payload.startDate,
        end_date: payload.endDate,
        is_active: payload.isActive !== undefined ? payload.isActive : true,
        priority: payload.priority || 100,
        stacking: payload.stacking || 'EXCLUSIVE',
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create promotion');

    return mapDbRowToPromotion(data);
  } catch (error) {
    console.error('Error creating promotion:', error);
    throw error;
  }
};

export const updatePromotion = async (
  id: string,
  payload: UpdatePromotionRequest,
): Promise<Promotion> => {
  try {
    const updateData: any = {};
    if (payload.code !== undefined) updateData.code = payload.code;
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description || null;
    if (payload.startDate !== undefined) updateData.start_date = payload.startDate;
    if (payload.endDate !== undefined) updateData.end_date = payload.endDate;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;
    if (payload.priority !== undefined) updateData.priority = payload.priority;
    if (payload.stacking !== undefined) updateData.stacking = payload.stacking;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('promotions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update promotion');

    return mapDbRowToPromotion(data);
  } catch (error) {
    console.error('Error updating promotion:', error);
    throw error;
  }
};

export const deletePromotion = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('promotions').delete().eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting promotion:', error);
    throw error;
  }
};

// Promotion Band CRUD operations
export const getPromotionBands = async (promotionId: string): Promise<PromotionBand[]> => {
  try {
    const { data, error } = await supabase
      .from('promotion_bands')
      .select('*')
      .eq('promotion_id', promotionId)
      .order('day_group', { ascending: true })
      .order('time_from', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapDbRowToPromotionBand);
  } catch (error) {
    console.error('Error fetching promotion bands:', error);
    throw error;
  }
};

export const getPromotionBandById = async (id: string): Promise<PromotionBand> => {
  try {
    const { data, error } = await supabase
      .from('promotion_bands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Promotion band not found');

    return mapDbRowToPromotionBand(data);
  } catch (error) {
    console.error('Error fetching promotion band:', error);
    throw error;
  }
};

export const createPromotionBand = async (
  payload: CreatePromotionBandRequest,
): Promise<PromotionBand> => {
  try {
    // Convert time to HH:mm:ss format
    const timeFrom = payload.timeFrom.length === 5 ? `${payload.timeFrom}:00` : payload.timeFrom;
    const timeTo = payload.timeTo.length === 5 ? `${payload.timeTo}:00` : payload.timeTo;

    const { data, error } = await supabase
      .from('promotion_bands')
      .insert({
        promotion_id: payload.promotionId,
        day_group: payload.dayGroup,
        dow_mask: payload.dowMask !== undefined ? payload.dowMask : 127, // Default: all days
        time_from: timeFrom,
        time_to: timeTo,
        course_id: payload.courseId || null,
        player_segment: payload.playerSegment || null,
        min_lead_days: payload.minLeadDays || null,
        min_players: payload.minPlayers || null,
        max_players: payload.maxPlayers || null,
        action_type: payload.actionType,
        action_value: payload.actionValue,
        includes_green_fee: payload.includesGreenFee !== undefined ? payload.includesGreenFee : true,
        includes_caddy: payload.includesCaddy !== undefined ? payload.includesCaddy : true,
        includes_cart: payload.includesCart !== undefined ? payload.includesCart : true,
        extra_conditions: payload.extraConditions || null,
        extra_meta: payload.extraMeta || null,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create promotion band');

    return mapDbRowToPromotionBand(data);
  } catch (error) {
    console.error('Error creating promotion band:', error);
    throw error;
  }
};

export const updatePromotionBand = async (
  id: string,
  payload: UpdatePromotionBandRequest,
): Promise<PromotionBand> => {
  try {
    const updateData: any = {};
    if (payload.dayGroup !== undefined) updateData.day_group = payload.dayGroup;
    if (payload.dowMask !== undefined) updateData.dow_mask = payload.dowMask;
    if (payload.timeFrom !== undefined) {
      updateData.time_from = payload.timeFrom.length === 5 ? `${payload.timeFrom}:00` : payload.timeFrom;
    }
    if (payload.timeTo !== undefined) {
      updateData.time_to = payload.timeTo.length === 5 ? `${payload.timeTo}:00` : payload.timeTo;
    }
    if (payload.courseId !== undefined) updateData.course_id = payload.courseId;
    if (payload.playerSegment !== undefined) updateData.player_segment = payload.playerSegment;
    if (payload.minLeadDays !== undefined) updateData.min_lead_days = payload.minLeadDays;
    if (payload.minPlayers !== undefined) updateData.min_players = payload.minPlayers;
    if (payload.maxPlayers !== undefined) updateData.max_players = payload.maxPlayers;
    if (payload.actionType !== undefined) updateData.action_type = payload.actionType;
    if (payload.actionValue !== undefined) updateData.action_value = payload.actionValue;
    if (payload.includesGreenFee !== undefined) updateData.includes_green_fee = payload.includesGreenFee;
    if (payload.includesCaddy !== undefined) updateData.includes_caddy = payload.includesCaddy;
    if (payload.includesCart !== undefined) updateData.includes_cart = payload.includesCart;
    if (payload.extraConditions !== undefined) updateData.extra_conditions = payload.extraConditions;
    if (payload.extraMeta !== undefined) updateData.extra_meta = payload.extraMeta;

    const { data, error } = await supabase
      .from('promotion_bands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update promotion band');

    return mapDbRowToPromotionBand(data);
  } catch (error) {
    console.error('Error updating promotion band:', error);
    throw error;
  }
};

export const deletePromotionBand = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('promotion_bands').delete().eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting promotion band:', error);
    throw error;
  }
};

