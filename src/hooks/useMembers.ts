import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMembers, getMemberById, createMember, updateMember, updateMemberStatus, type MemberListResponse, type CreateMemberRequest, type UpdateMemberRequest } from '../services/memberService';

export const useMembers = (page: number, pageSize: number, search: string, status?: string) => {
  return useQuery<MemberListResponse>({
    queryKey: ['members', page, pageSize, search, status],
    queryFn: () => getMembers(page, pageSize, search || undefined, status),
    retry: false,
    throwOnError: false,
  });
};

export const useMember = (id: number | null) => {
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => getMemberById(id!),
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useCreateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMemberRequest) => createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMemberRequest }) => updateMember(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', variables.id] });
    },
  });
};

export const useUpdateMemberStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateMemberStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', variables.id] });
    },
  });
};