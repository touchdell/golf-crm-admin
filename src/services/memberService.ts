import { apiClient } from './apiClient';

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

// Generate dummy members data
const generateDummyMembers = (): Member[] => {
  const firstNames = [
    'John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Amanda',
    'James', 'Lisa', 'William', 'Jennifer', 'Richard', 'Michelle', 'Joseph', 'Ashley',
    'Thomas', 'Melissa', 'Charles', 'Nicole', 'Daniel', 'Stephanie', 'Matthew', 'Rachel',
    'Anthony', 'Lauren', 'Mark', 'Kimberly', 'Donald', 'Amy', 'Steven', 'Angela',
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
    'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark',
    'Lewis', 'Robinson', 'Walker', 'Young', 'King', 'Wright', 'Scott', 'Green',
  ];

  const membershipTypes = ['Full', 'Senior', 'Junior', 'Corporate', 'Family', 'Weekday'];
  const membershipStatuses = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING'];

  const members: Member[] = [];
  
  for (let i = 1; i <= 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const membershipType = membershipTypes[Math.floor(Math.random() * membershipTypes.length)];
    const membershipStatus = membershipStatuses[Math.floor(Math.random() * membershipStatuses.length)];
    
    const startDate = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    members.push({
      id: i,
      memberCode: `GC${String(i).padStart(4, '0')}`,
      firstName,
      lastName,
      phone: `+1 (555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      membershipType,
      membershipStatus,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  }

  return members;
};

const dummyMembers = generateDummyMembers();

// Generate unique member code (must be after dummyMembers initialization)
const generateMemberCode = (): string => {
  if (dummyMembers.length === 0) {
    return 'GC0001';
  }
  const maxId = Math.max(...dummyMembers.map(m => {
    const match = m.memberCode.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }), 0);
  const nextId = maxId + 1;
  return `GC${String(nextId).padStart(4, '0')}`;
};

export const getMembers = async (
  page = 1,
  pageSize = 20,
  search?: string,
  status?: string,
): Promise<MemberListResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    const res = await apiClient.get<MemberListResponse>('/members', {
      params: { page, pageSize, search },
    });
    // Ensure response has the expected structure
    if (res.data && Array.isArray(res.data.items)) {
      return res.data;
    }
    throw new Error('Invalid response structure');
  } catch {
    // Fallback to dummy data if API fails
    let filteredMembers = [...dummyMembers];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMembers = filteredMembers.filter(
        (m) =>
          m.firstName.toLowerCase().includes(searchLower) ||
          m.lastName.toLowerCase().includes(searchLower) ||
          m.memberCode.toLowerCase().includes(searchLower) ||
          m.email?.toLowerCase().includes(searchLower),
      );
    }

    // Apply status filter
    if (status && status !== 'ALL') {
      filteredMembers = filteredMembers.filter((m) => m.membershipStatus === status);
    }

    // Apply pagination
    const total = filteredMembers.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

    return {
      items: paginatedMembers,
      page,
      pageSize,
      total,
    };
  }
};

export const getMemberById = async (id: number): Promise<Member | null> => {
  // For development: always use dummy data
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.get<Member>(`/members/${id}`);
      return res.data;
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
    }
  }
  
  // Fallback to dummy data
  const member = dummyMembers.find((m) => m.id === id);
  return member || null;
};

export const createMember = async (payload: CreateMemberRequest): Promise<Member> => {
  const useDummyData = true; // Set to false when backend is ready
  
  // Auto-generate member code if not provided
  const memberCode = payload.memberCode || generateMemberCode();
  
  if (!useDummyData) {
    try {
      const res = await apiClient.post<Member>('/members', {
        ...payload,
        memberCode, // Include auto-generated code
      });
      return res.data;
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
      throw error;
    }
  }
  
  // Fallback to dummy data
  const newMember: Member = {
    id: Date.now(),
    memberCode,
    ...payload,
  };
  dummyMembers.push(newMember);
  return newMember;
};

export const updateMember = async (
  id: number,
  payload: UpdateMemberRequest,
): Promise<Member> => {
  const useDummyData = true; // Set to false when backend is ready
  
  if (!useDummyData) {
    try {
      const res = await apiClient.put<Member>(`/members/${id}`, payload);
      return res.data;
    } catch (error) {
      console.log('API call failed, using dummy data:', error);
      throw error;
    }
  }
  
  // Fallback to dummy data
  const memberIndex = dummyMembers.findIndex((m) => m.id === id);
  if (memberIndex === -1) {
    throw new Error('Member not found');
  }
  
  dummyMembers[memberIndex] = {
    ...dummyMembers[memberIndex],
    ...payload,
  };
  
  return dummyMembers[memberIndex];
};

export const updateMemberStatus = async (
  id: number,
  status: string,
): Promise<Member> => {
  return updateMember(id, { membershipStatus: status });
};