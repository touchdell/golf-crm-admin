import { apiClient } from './apiClient';

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

export const getMembershipTypes = async (): Promise<MembershipType[]> => {
  try {
    const res = await apiClient.get<MembershipType[]>('/settings/membership-types');
    // Ensure response is an array
    if (Array.isArray(res.data)) {
      return res.data;
    }
    throw new Error('Invalid response format');
  } catch {
    // Fallback to dummy data for development
    return [
      {
        id: 1,
        code: 'REGULAR',
        name: 'Regular',
        description: 'Standard membership',
        isActive: true,
      },
      {
        id: 2,
        code: 'VIP',
        name: 'VIP',
        description: 'VIP membership with premium benefits',
        isActive: true,
      },
      {
        id: 3,
        code: 'CORPORATE',
        name: 'Corporate',
        description: 'Corporate membership',
        isActive: true,
      },
      {
        id: 4,
        code: 'SENIOR',
        name: 'Senior',
        description: 'Senior membership',
        isActive: true,
      },
      {
        id: 5,
        code: 'JUNIOR',
        name: 'Junior',
        description: 'Junior membership',
        isActive: true,
      },
    ];
  }
};

export const createMembershipType = async (
  data: CreateMembershipTypeRequest,
): Promise<MembershipType> => {
  try {
    const res = await apiClient.post<MembershipType>('/settings/membership-types', data);
    return res.data;
  } catch (error) {
    // Fallback for development
    const newType: MembershipType = {
      id: Date.now(),
      ...data,
      isActive: true,
    };
    return newType;
  }
};

export const updateMembershipType = async (
  id: number,
  data: UpdateMembershipTypeRequest,
): Promise<MembershipType> => {
  try {
    const res = await apiClient.put<MembershipType>(`/settings/membership-types/${id}`, data);
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const deleteMembershipType = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/settings/membership-types/${id}`);
  } catch (error) {
    throw error;
  }
};

