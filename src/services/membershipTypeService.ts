import { supabase } from '../lib/supabase';

export interface MembershipType {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface CreateMembershipTypeRequest {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateMembershipTypeRequest {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

// Database row interface
interface DbMembershipTypeRow {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

// Helper function to map database row to MembershipType interface
const mapDbRowToMembershipType = (row: DbMembershipTypeRow): MembershipType => {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || undefined,
    isActive: row.is_active,
  };
};

// Helper function to map MembershipType to database row
const mapMembershipTypeToDbRow = (item: CreateMembershipTypeRequest | UpdateMembershipTypeRequest) => {
  const row: Record<string, unknown> = {};
  if ('code' in item && item.code !== undefined && item.code.trim() !== '') {
    row.code = item.code.trim();
  }
  if ('name' in item && item.name !== undefined && item.name.trim() !== '') {
    row.name = item.name.trim();
  }
  if ('description' in item) {
    row.description = item.description && item.description.trim() !== '' ? item.description.trim() : null;
  }
  if ('isActive' in item && item.isActive !== undefined) {
    row.is_active = item.isActive;
  }
  return row;
};

export const getMembershipTypes = async (): Promise<MembershipType[]> => {
  try {
    const { data, error } = await supabase
      .from('membership_types')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapDbRowToMembershipType);
  } catch (error) {
    console.error('Error fetching membership types:', error);
    return [];
  }
};

export const createMembershipType = async (
  data: CreateMembershipTypeRequest,
): Promise<MembershipType> => {
  try {
    const dbRow = mapMembershipTypeToDbRow({ ...data, isActive: true });

    const { data: created, error } = await supabase
      .from('membership_types')
      .insert(dbRow)
      .select()
      .single();

    if (error) throw error;
    if (!created) throw new Error('Failed to create membership type');

    return mapDbRowToMembershipType(created);
  } catch (error) {
    console.error('Error creating membership type:', error);
    throw error;
  }
};

export const updateMembershipType = async (
  id: number,
  data: UpdateMembershipTypeRequest,
): Promise<MembershipType> => {
  try {
    const dbRow = mapMembershipTypeToDbRow(data);

    const { data: updated, error } = await supabase
      .from('membership_types')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) throw new Error('Membership type not found');

    return mapDbRowToMembershipType(updated);
  } catch (error) {
    console.error('Error updating membership type:', error);
    throw error;
  }
};

export const toggleMembershipTypeActive = async (
  id: number,
  isActive: boolean,
): Promise<MembershipType> => {
  return updateMembershipType(id, { isActive });
};

export const deleteMembershipType = async (id: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('membership_types')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting membership type:', error);
    throw error;
  }
};

