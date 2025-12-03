import { useQuery } from '@tanstack/react-query';
import { getMembershipTypes } from '../services/membershipTypeService';

export const useMembershipTypes = () => {
  return useQuery({
    queryKey: ['membershipTypes'],
    queryFn: getMembershipTypes,
  });
};

