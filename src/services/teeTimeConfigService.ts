import { apiClient } from './apiClient';

export interface TeeTimeConfig {
  startTime: string; // Format: "HH:mm" (e.g., "06:00")
  endTime: string; // Format: "HH:mm" (e.g., "18:00")
  intervalMinutes: number; // e.g., 10
  maxPlayersPerSlot: number; // e.g., 4
}

export const getTeeTimeConfig = async (): Promise<TeeTimeConfig> => {
  try {
    const res = await apiClient.get<TeeTimeConfig>('/settings/tee-times/config');
    return res.data;
  } catch {
    // Fallback to default values for development
    return {
      startTime: '06:00',
      endTime: '18:00',
      intervalMinutes: 10,
      maxPlayersPerSlot: 4,
    };
  }
};

export const updateTeeTimeConfig = async (
  data: TeeTimeConfig,
): Promise<TeeTimeConfig> => {
  try {
    const res = await apiClient.put<TeeTimeConfig>('/settings/tee-times/config', data);
    return res.data;
  } catch (error) {
    throw error;
  }
};

