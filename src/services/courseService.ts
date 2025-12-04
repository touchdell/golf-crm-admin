import { supabase } from '../lib/supabase';

export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  parTotal?: number;
  yardageTotal?: number;
  holeCount: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseHole {
  id: number;
  courseId: number;
  holeNumber: number;
  par: number;
  yardage?: number;
  handicap?: number;
  description?: string;
  highlight?: string;
  createdAt: string;
}

export interface CreateCourseRequest {
  code: string;
  name: string;
  description?: string;
  parTotal?: number;
  yardageTotal?: number;
  holeCount?: number;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateCourseRequest {
  code?: string;
  name?: string;
  description?: string;
  parTotal?: number;
  yardageTotal?: number;
  holeCount?: number;
  isActive?: boolean;
  displayOrder?: number;
}

export interface CreateCourseHoleRequest {
  courseId: number;
  holeNumber: number;
  par: number;
  yardage?: number;
  handicap?: number;
  description?: string;
  highlight?: string;
}

export interface UpdateCourseHoleRequest {
  holeNumber?: number;
  par?: number;
  yardage?: number;
  handicap?: number;
  description?: string;
  highlight?: string;
}

// Database row interfaces
interface DbCourseRow {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  par_total?: number | null;
  yardage_total?: number | null;
  hole_count: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface DbCourseHoleRow {
  id: number;
  course_id: number;
  hole_number: number;
  par: number;
  yardage?: number | null;
  handicap?: number | null;
  description?: string | null;
  highlight?: string | null;
  created_at: string;
}

// Helper functions to map database rows to interfaces
const mapDbRowToCourse = (row: DbCourseRow): Course => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description || undefined,
  parTotal: row.par_total || undefined,
  yardageTotal: row.yardage_total || undefined,
  holeCount: row.hole_count,
  isActive: row.is_active,
  displayOrder: row.display_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDbRowToCourseHole = (row: DbCourseHoleRow): CourseHole => ({
  id: row.id,
  courseId: row.course_id,
  holeNumber: row.hole_number,
  par: row.par,
  yardage: row.yardage || undefined,
  handicap: row.handicap || undefined,
  description: row.description || undefined,
  highlight: row.highlight || undefined,
  createdAt: row.created_at,
});

// Course CRUD operations
export const getCourses = async (): Promise<Course[]> => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapDbRowToCourse);
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
};

export const getActiveCourses = async (): Promise<Course[]> => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapDbRowToCourse);
  } catch (error) {
    console.error('Error fetching active courses:', error);
    throw error;
  }
};

export const getCourseById = async (id: number): Promise<Course> => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Course not found');

    return mapDbRowToCourse(data);
  } catch (error) {
    console.error('Error fetching course:', error);
    throw error;
  }
};

export const createCourse = async (payload: CreateCourseRequest): Promise<Course> => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .insert({
        code: payload.code,
        name: payload.name,
        description: payload.description || null,
        par_total: payload.parTotal || null,
        yardage_total: payload.yardageTotal || null,
        hole_count: payload.holeCount || 18,
        is_active: payload.isActive !== undefined ? payload.isActive : true,
        display_order: payload.displayOrder || 0,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create course');

    return mapDbRowToCourse(data);
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

export const updateCourse = async (id: number, payload: UpdateCourseRequest): Promise<Course> => {
  try {
    const updateData: any = {};
    if (payload.code !== undefined) updateData.code = payload.code;
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description || null;
    if (payload.parTotal !== undefined) updateData.par_total = payload.parTotal || null;
    if (payload.yardageTotal !== undefined) updateData.yardage_total = payload.yardageTotal || null;
    if (payload.holeCount !== undefined) updateData.hole_count = payload.holeCount;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;
    if (payload.displayOrder !== undefined) updateData.display_order = payload.displayOrder;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update course');

    return mapDbRowToCourse(data);
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

export const deleteCourse = async (id: number): Promise<void> => {
  try {
    const { error } = await supabase.from('courses').delete().eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

// Course Hole CRUD operations
export const getCourseHoles = async (courseId: number): Promise<CourseHole[]> => {
  try {
    const { data, error } = await supabase
      .from('course_holes')
      .select('*')
      .eq('course_id', courseId)
      .order('hole_number', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapDbRowToCourseHole);
  } catch (error) {
    console.error('Error fetching course holes:', error);
    throw error;
  }
};

export const getCourseHoleById = async (id: number): Promise<CourseHole> => {
  try {
    const { data, error } = await supabase
      .from('course_holes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Course hole not found');

    return mapDbRowToCourseHole(data);
  } catch (error) {
    console.error('Error fetching course hole:', error);
    throw error;
  }
};

export const createCourseHole = async (payload: CreateCourseHoleRequest): Promise<CourseHole> => {
  try {
    const { data, error } = await supabase
      .from('course_holes')
      .insert({
        course_id: payload.courseId,
        hole_number: payload.holeNumber,
        par: payload.par,
        yardage: payload.yardage || null,
        handicap: payload.handicap || null,
        description: payload.description || null,
        highlight: payload.highlight || null,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create course hole');

    // Recalculate course totals
    await recalculateCourseTotals(payload.courseId);

    return mapDbRowToCourseHole(data);
  } catch (error) {
    console.error('Error creating course hole:', error);
    throw error;
  }
};

export const updateCourseHole = async (
  id: number,
  payload: UpdateCourseHoleRequest,
): Promise<CourseHole> => {
  try {
    const updateData: any = {};
    if (payload.holeNumber !== undefined) updateData.hole_number = payload.holeNumber;
    if (payload.par !== undefined) updateData.par = payload.par;
    if (payload.yardage !== undefined) updateData.yardage = payload.yardage || null;
    if (payload.handicap !== undefined) updateData.handicap = payload.handicap || null;
    if (payload.description !== undefined) updateData.description = payload.description || null;
    if (payload.highlight !== undefined) updateData.highlight = payload.highlight || null;

    const { data: holeData, error: holeError } = await supabase
      .from('course_holes')
      .select('course_id')
      .eq('id', id)
      .single();

    if (holeError) throw holeError;

    const { data, error } = await supabase
      .from('course_holes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update course hole');

    // Recalculate course totals
    if (holeData) {
      await recalculateCourseTotals(holeData.course_id);
    }

    return mapDbRowToCourseHole(data);
  } catch (error) {
    console.error('Error updating course hole:', error);
    throw error;
  }
};

export const deleteCourseHole = async (id: number): Promise<void> => {
  try {
    // Get course_id before deleting
    const { data: holeData, error: fetchError } = await supabase
      .from('course_holes')
      .select('course_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase.from('course_holes').delete().eq('id', id);

    if (error) throw error;

    // Recalculate course totals
    if (holeData) {
      await recalculateCourseTotals(holeData.course_id);
    }
  } catch (error) {
    console.error('Error deleting course hole:', error);
    throw error;
  }
};

// Helper function to recalculate course totals from holes
const recalculateCourseTotals = async (courseId: number): Promise<void> => {
  try {
    const { data: holes, error: holesError } = await supabase
      .from('course_holes')
      .select('par, yardage')
      .eq('course_id', courseId);

    if (holesError) throw holesError;

    const parTotal = holes?.reduce((sum, hole) => sum + (hole.par || 0), 0) || null;
    const yardageTotal = holes?.reduce((sum, hole) => sum + (hole.yardage || 0), 0) || null;

    await supabase
      .from('courses')
      .update({
        par_total: parTotal,
        yardage_total: yardageTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', courseId);
  } catch (error) {
    console.error('Error recalculating course totals:', error);
    // Don't throw - this is a background operation
  }
};

