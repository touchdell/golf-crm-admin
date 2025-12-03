import { useQuery } from '@tanstack/react-query';

import { getTeeTimes, type TeeTime } from '../services/teeTimeService';

export const useTeeTimes = (date: string, courseId?: number) => {
  return useQuery<TeeTime[]>({
    queryKey: ['tee-times', date, courseId],
    queryFn: () => getTeeTimes(date, courseId),
    enabled: !!date,
  });
};

