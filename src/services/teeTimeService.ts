import { apiClient } from './apiClient';

export interface TeeTime {
  id: number;
  courseId: number;
  date: string;        // 'YYYY-MM-DD'
  startTime: string;   // 'HH:mm'
  endTime: string;     // 'HH:mm'
  maxPlayers: number;
  status: 'OPEN' | 'FULL' | 'BLOCKED';
  bookedPlayersCount: number;
  bookingId?: number | null;
  bookingStatus?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED' | null;
  members?: {
    memberId: number;
    name: string;
  }[];
}

// Generate dummy tee times for a given date
const generateDummyTeeTimes = (date: string): TeeTime[] => {
  const times = [
    { start: '06:00', end: '06:15' },
    { start: '06:15', end: '06:30' },
    { start: '06:30', end: '06:45' },
    { start: '06:45', end: '07:00' },
    { start: '07:00', end: '07:15' },
    { start: '07:15', end: '07:30' },
    { start: '07:30', end: '07:45' },
    { start: '07:45', end: '08:00' },
    { start: '08:00', end: '08:15' },
    { start: '08:15', end: '08:30' },
    { start: '08:30', end: '08:45' },
    { start: '08:45', end: '09:00' },
    { start: '09:00', end: '09:15' },
    { start: '09:15', end: '09:30' },
    { start: '09:30', end: '09:45' },
    { start: '09:45', end: '10:00' },
    { start: '10:00', end: '10:15' },
    { start: '10:15', end: '10:30' },
  ];

  const statuses: TeeTime['status'][] = ['OPEN', 'FULL', 'BLOCKED'];
  const bookingStatuses: TeeTime['bookingStatus'][] = ['CONFIRMED', 'PENDING', null];
  const memberNames = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Emily Wilson'];

  return times.map((time, index) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const maxPlayers = 4;
    const bookedPlayersCount = status === 'FULL' ? maxPlayers : status === 'BLOCKED' ? 0 : Math.floor(Math.random() * (maxPlayers + 1));
    const bookingStatus = status === 'BLOCKED' ? null : bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)];
    
    const members =
      bookedPlayersCount > 0 && status !== 'BLOCKED'
        ? Array.from({ length: bookedPlayersCount }, (_, i) => ({
            memberId: index * 10 + i + 1,
            name: memberNames[i % memberNames.length],
          }))
        : undefined;

    return {
      id: index + 1,
      courseId: 1,
      date,
      startTime: time.start,
      endTime: time.end,
      maxPlayers,
      status,
      bookedPlayersCount,
      bookingId: bookingStatus ? index + 100 : null,
      bookingStatus,
      members,
    };
  });
};

export const getTeeTimes = async (date: string, courseId?: number): Promise<TeeTime[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    const res = await apiClient.get<TeeTime[]>('/tee-times', {
      params: { date, courseId },
    });
    // Ensure response is an array
    if (Array.isArray(res.data)) {
      return res.data;
    }
    throw new Error('Invalid response structure');
  } catch {
    // Fallback to dummy data if API fails
    return generateDummyTeeTimes(date);
  }
};

