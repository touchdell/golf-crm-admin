import { supabase } from '../lib/supabase';

export interface Member {
  id: number;
  memberCode: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  membershipType: string;
  membershipStatus: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface CreateMemberRequest {
  memberCode?: string; // Optional - will be auto-generated if not provided
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  membershipType: string;
  membershipStatus: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateMemberRequest {
  memberCode?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  membershipType?: string;
  membershipStatus?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface MemberListResponse {
  items: Member[];
  page: number;
  pageSize: number;
  total: number;
}

// Database row interface
interface DbMemberRow {
  id: number;
  member_code: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  membership_type_id?: number | null;
  membership_status: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

// Helper function to get membership type code from ID
const getMembershipTypeCode = async (id: number | null | undefined): Promise<string> => {
  if (!id) return '';
  try {
    const { data } = await supabase
      .from('membership_types')
      .select('code')
      .eq('id', id)
      .single();
    return data?.code || '';
  } catch {
    return '';
  }
};

// Helper function to get membership type ID from code
const getMembershipTypeId = async (code: string): Promise<number | null> => {
  if (!code) return null;
  try {
    const { data } = await supabase
      .from('membership_types')
      .select('id')
      .eq('code', code)
      .single();
    return data?.id || null;
  } catch {
    return null;
  }
};

// Helper function to map database row to Member interface
const mapDbRowToMember = async (row: DbMemberRow): Promise<Member> => {
  const membershipTypeCode = await getMembershipTypeCode(row.membership_type_id);
  
  return {
    id: row.id,
    memberCode: row.member_code,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone || undefined,
    email: row.email || undefined,
    address: row.address || undefined,
    membershipType: membershipTypeCode,
    membershipStatus: row.membership_status,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    notes: row.notes || undefined,
  };
};

// Helper function to map Member to database row
const mapMemberToDbRow = async (member: CreateMemberRequest | UpdateMemberRequest) => {
  const row: Record<string, unknown> = {};
  if ('memberCode' in member && member.memberCode !== undefined) {
    row.member_code = member.memberCode;
  }
  if ('firstName' in member && member.firstName !== undefined) {
    row.first_name = member.firstName;
  }
  if ('lastName' in member && member.lastName !== undefined) {
    row.last_name = member.lastName;
  }
  if ('phone' in member) row.phone = member.phone;
  if ('email' in member) row.email = member.email;
  if ('address' in member) row.address = member.address;
  if ('membershipType' in member && member.membershipType !== undefined) {
    // Convert code to ID
    const typeId = await getMembershipTypeId(member.membershipType);
    row.membership_type_id = typeId;
  }
  if ('membershipStatus' in member && member.membershipStatus !== undefined) {
    row.membership_status = member.membershipStatus;
  }
  if ('startDate' in member) row.start_date = member.startDate || null;
  if ('endDate' in member) row.end_date = member.endDate || null;
  if ('notes' in member) row.notes = member.notes;
  return row;
};

// Generate member code using Supabase function
const generateMemberCode = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.rpc('generate_member_code');
    if (error) throw error;
    return data || 'GC0001';
  } catch (error) {
    console.error('Error generating member code:', error);
    // Fallback: get max code from database
    try {
      const { data } = await supabase
        .from('members')
        .select('member_code')
        .order('id', { ascending: false })
        .limit(1)
        .single();

      if (data?.member_code) {
        const match = data.member_code.match(/\d+/);
        const nextId = match ? parseInt(match[0], 10) + 1 : 1;
        return `GC${String(nextId).padStart(4, '0')}`;
      }
    } catch {
      // If all else fails, return default
    }
    return 'GC0001';
  }
};

export const getMembers = async (
  page = 1,
  pageSize = 20,
  search?: string,
  status?: string,
): Promise<MemberListResponse> => {
  try {
    let query = supabase
      .from('members')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,member_code.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // Apply status filter
    if (status && status !== 'ALL') {
      query = query.eq('membership_status', status);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to).order('id', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    // Map all rows to Member interface (with async membership type lookup)
    const items = await Promise.all((data || []).map(mapDbRowToMember));

    return {
      items,
      page,
      pageSize,
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching members:', error);
    // Return empty result on error
    return {
      items: [],
      page,
      pageSize,
      total: 0,
    };
  }
};

export const getMemberById = async (id: number): Promise<Member | null> => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return await mapDbRowToMember(data);
  } catch (error) {
    console.error('Error fetching member:', error);
    return null;
  }
};

export const createMember = async (payload: CreateMemberRequest): Promise<Member> => {
  try {
    // Auto-generate member code if not provided
    const memberCode = payload.memberCode || await generateMemberCode();

    const dbRow = await mapMemberToDbRow({ ...payload, memberCode });
    
    const { data, error } = await supabase
      .from('members')
      .insert(dbRow)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create member');

    return mapDbRowToMember(data);
  } catch (error) {
    console.error('Error creating member:', error);
    throw error;
  }
};

export const updateMember = async (
  id: number,
  payload: UpdateMemberRequest,
): Promise<Member> => {
  try {
    const dbRow = await mapMemberToDbRow(payload);

    const { data, error } = await supabase
      .from('members')
      .update(dbRow)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Member not found');

    return mapDbRowToMember(data);
  } catch (error) {
    console.error('Error updating member:', error);
    throw error;
  }
};

export const updateMemberStatus = async (
  id: number,
  status: string,
): Promise<Member> => {
  return updateMember(id, { membershipStatus: status });
};
