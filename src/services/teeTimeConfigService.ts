import { supabase } from '../lib/supabase';

export interface TeeTimeConfig {
  startTime: string; // Format: "HH:mm" (e.g., "06:00")
  endTime: string; // Format: "HH:mm" (e.g., "18:00")
  intervalMinutes: number; // e.g., 10
  maxPlayersPerSlot: number; // e.g., 4
}

// Database row interface
interface DbTeeTimeConfigRow {
  id: number;
  start_time: string; // Format: "HH:mm:ss" from TIME type
  end_time: string; // Format: "HH:mm:ss" from TIME type
  interval_minutes: number;
  max_players: number;
}

// Helper function to convert TIME format (HH:mm:ss) to HH:mm
const timeToHHmm = (time: string): string => {
  return time.substring(0, 5); // Extract HH:mm from HH:mm:ss
};

// Helper function to convert HH:mm to TIME format (HH:mm:ss)
const hhmmToTime = (time: string): string => {
  return time.length === 5 ? `${time}:00` : time;
};

// Helper function to map database row to TeeTimeConfig interface
const mapDbRowToTeeTimeConfig = (row: DbTeeTimeConfigRow): TeeTimeConfig => {
  return {
    startTime: timeToHHmm(row.start_time),
    endTime: timeToHHmm(row.end_time),
    intervalMinutes: Number(row.interval_minutes) || 15, // Ensure it's a number, default to 15
    maxPlayersPerSlot: Number(row.max_players) || 4, // Ensure it's a number, default to 4
  };
};

export const getTeeTimeConfig = async (): Promise<TeeTimeConfig> => {
  try {
    const { data, error } = await supabase
      .from('tee_time_config')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;

    if (data) {
      return mapDbRowToTeeTimeConfig(data);
    }

    // If no config exists, return defaults
    return {
      startTime: '06:00',
      endTime: '18:00',
      intervalMinutes: 10,
      maxPlayersPerSlot: 4,
    };
  } catch (error) {
    console.error('Error fetching tee time config:', error);
    // Fallback to default values
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
    // First, check if config exists
    const { data: existing } = await supabase
      .from('tee_time_config')
      .select('id')
      .limit(1)
      .single();

    const updateData = {
      start_time: hhmmToTime(data.startTime),
      end_time: hhmmToTime(data.endTime),
      interval_minutes: data.intervalMinutes,
      max_players: data.maxPlayersPerSlot,
    };

    let result;
    if (existing) {
      // Update existing config
      const { data: updated, error } = await supabase
        .from('tee_time_config')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = updated;
    } else {
      // Insert new config if none exists
      const { data: inserted, error } = await supabase
        .from('tee_time_config')
        .insert(updateData)
        .select()
        .single();

      if (error) throw error;
      result = inserted;
    }

    return mapDbRowToTeeTimeConfig(result);
  } catch (error) {
    console.error('Error updating tee time config:', error);
    throw error;
  }
};

