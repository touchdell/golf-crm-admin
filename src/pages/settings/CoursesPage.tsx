import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore } from '@mui/icons-material';
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseHoles,
  createCourseHole,
  updateCourseHole,
  deleteCourseHole,
  type Course,
  type CourseHole,
  type CreateCourseRequest,
  type CreateCourseHoleRequest,
} from '../../services/courseService';

const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [holeDialogOpen, setHoleDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingHole, setEditingHole] = useState<CourseHole | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseHoles, setCourseHoles] = useState<Map<number, CourseHole[]>>(new Map());
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set());

  const [courseFormData, setCourseFormData] = useState<CreateCourseRequest>({
    code: '',
    name: '',
    description: '',
    parTotal: undefined,
    yardageTotal: undefined,
    holeCount: 18,
    isActive: true,
    displayOrder: 0,
  });

  const [holeFormData, setHoleFormData] = useState<CreateCourseHoleRequest>({
    courseId: 0,
    holeNumber: 1,
    par: 4,
    yardage: undefined,
    handicap: undefined,
    description: '',
    highlight: '',
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      setError('Failed to load courses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseHoles = async (courseId: number) => {
    try {
      const holes = await getCourseHoles(courseId);
      setCourseHoles((prev) => {
        const newMap = new Map(prev);
        newMap.set(courseId, holes);
        return newMap;
      });
    } catch (err) {
      console.error('Error loading course holes:', err);
    }
  };

  const handleCourseAccordionChange = (courseId: number) => {
    setExpandedCourses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
        loadCourseHoles(courseId);
      }
      return newSet;
    });
  };

  const handleOpenCourseDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setCourseFormData({
        code: course.code,
        name: course.name,
        description: course.description || '',
        parTotal: course.parTotal,
        yardageTotal: course.yardageTotal,
        holeCount: course.holeCount,
        isActive: course.isActive,
        displayOrder: course.displayOrder,
      });
    } else {
      setEditingCourse(null);
      setCourseFormData({
        code: '',
        name: '',
        description: '',
        parTotal: undefined,
        yardageTotal: undefined,
        holeCount: 18,
        isActive: true,
        displayOrder: 0,
      });
    }
    setCourseDialogOpen(true);
  };

  const handleCloseCourseDialog = () => {
    setCourseDialogOpen(false);
    setEditingCourse(null);
  };

  const handleOpenHoleDialog = (courseId: number, hole?: CourseHole) => {
    setSelectedCourseId(courseId);
    if (hole) {
      setEditingHole(hole);
      setHoleFormData({
        courseId: hole.courseId,
        holeNumber: hole.holeNumber,
        par: hole.par,
        yardage: hole.yardage,
        handicap: hole.handicap,
        description: hole.description || '',
        highlight: hole.highlight || '',
      });
    } else {
      setEditingHole(null);
      const existingHoles = courseHoles.get(courseId) || [];
      const nextHoleNumber = existingHoles.length > 0 
        ? Math.max(...existingHoles.map(h => h.holeNumber)) + 1
        : 1;
      setHoleFormData({
        courseId,
        holeNumber: nextHoleNumber,
        par: 4,
        yardage: undefined,
        handicap: undefined,
        description: '',
        highlight: '',
      });
    }
    setHoleDialogOpen(true);
  };

  const handleCloseHoleDialog = () => {
    setHoleDialogOpen(false);
    setEditingHole(null);
    setSelectedCourseId(null);
  };

  const handleSubmitCourse = async () => {
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, courseFormData);
      } else {
        await createCourse(courseFormData);
      }
      await loadCourses();
      handleCloseCourseDialog();
    } catch (err: any) {
      setError(err?.message || 'Failed to save course');
      console.error(err);
    }
  };

  const handleSubmitHole = async () => {
    try {
      if (editingHole) {
        await updateCourseHole(editingHole.id, holeFormData);
      } else {
        await createCourseHole(holeFormData);
      }
      if (selectedCourseId) {
        await loadCourseHoles(selectedCourseId);
        await loadCourses(); // Refresh to update totals
      }
      handleCloseHoleDialog();
    } catch (err: any) {
      setError(err?.message || 'Failed to save course hole');
      console.error(err);
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this course? All associated holes will also be deleted.')) {
      return;
    }
    try {
      await deleteCourse(id);
      await loadCourses();
    } catch (err) {
      setError('Failed to delete course');
      console.error(err);
    }
  };

  const handleDeleteHole = async (holeId: number, courseId: number) => {
    if (!window.confirm('Are you sure you want to delete this hole?')) {
      return;
    }
    try {
      await deleteCourseHole(holeId);
      await loadCourseHoles(courseId);
      await loadCourses(); // Refresh to update totals
    } catch (err) {
      setError('Failed to delete course hole');
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Golf Courses Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenCourseDialog()}
        >
          Add Course
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {courses.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No courses found</Typography>
            </Paper>
          ) : (
            courses.map((course) => (
              <Accordion
                key={course.id}
                expanded={expandedCourses.has(course.id)}
                onChange={() => handleCourseAccordionChange(course.id)}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{course.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.code} • {course.holeCount} holes
                        {course.parTotal && ` • Par ${course.parTotal}`}
                        {course.yardageTotal && ` • ${course.yardageTotal} yards`}
                      </Typography>
                    </Box>
                    <Chip
                      label={course.isActive ? 'Active' : 'Inactive'}
                      color={course.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCourseDialog(course);
                      }}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(course.id);
                      }}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    {course.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {course.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle1">Course Holes</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => handleOpenHoleDialog(course.id)}
                      >
                        Add Hole
                      </Button>
                    </Box>
                    {courseHoles.get(course.id)?.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                        No holes configured. Add holes to define the course layout.
                      </Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Hole</TableCell>
                              <TableCell>Par</TableCell>
                              <TableCell>Yardage</TableCell>
                              <TableCell>Handicap</TableCell>
                              <TableCell>Highlight</TableCell>
                              <TableCell align="center">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {courseHoles.get(course.id)?.map((hole) => (
                              <TableRow key={hole.id}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    #{hole.holeNumber}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip label={`Par ${hole.par}`} size="small" color="primary" />
                                </TableCell>
                                <TableCell>{hole.yardage ? `${hole.yardage} yds` : '-'}</TableCell>
                                <TableCell>{hole.handicap || '-'}</TableCell>
                                <TableCell>
                                  {hole.highlight ? (
                                    <Typography variant="caption" color="text.secondary">
                                      {hole.highlight.substring(0, 50)}
                                      {hole.highlight.length > 50 ? '...' : ''}
                                    </Typography>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenHoleDialog(course.id, hole)}
                                    color="primary"
                                  >
                                    <Edit />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteHole(hole.id, course.id)}
                                    color="error"
                                  >
                                    <Delete />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>
      )}

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onClose={handleCloseCourseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCourse ? 'Edit Course' : 'Add Course'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Code"
              value={courseFormData.code}
              onChange={(e) => setCourseFormData({ ...courseFormData, code: e.target.value.toUpperCase() })}
              required
              fullWidth
              helperText="Unique course code (e.g., COURSE_A)"
            />
            <TextField
              label="Name"
              value={courseFormData.name}
              onChange={(e) => setCourseFormData({ ...courseFormData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={courseFormData.description}
              onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Hole Count"
                type="number"
                value={courseFormData.holeCount}
                onChange={(e) => setCourseFormData({ ...courseFormData, holeCount: parseInt(e.target.value) || 18 })}
                fullWidth
              />
              <TextField
                label="Display Order"
                type="number"
                value={courseFormData.displayOrder}
                onChange={(e) => setCourseFormData({ ...courseFormData, displayOrder: parseInt(e.target.value) || 0 })}
                fullWidth
                helperText="Lower number appears first"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Par Total"
                type="number"
                value={courseFormData.parTotal || ''}
                onChange={(e) => setCourseFormData({ ...courseFormData, parTotal: e.target.value ? parseInt(e.target.value) : undefined })}
                fullWidth
                helperText="Auto-calculated from holes"
              />
              <TextField
                label="Yardage Total"
                type="number"
                value={courseFormData.yardageTotal || ''}
                onChange={(e) => setCourseFormData({ ...courseFormData, yardageTotal: e.target.value ? parseInt(e.target.value) : undefined })}
                fullWidth
                helperText="Auto-calculated from holes"
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={courseFormData.isActive}
                  onChange={(e) => setCourseFormData({ ...courseFormData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCourseDialog}>Cancel</Button>
          <Button onClick={handleSubmitCourse} variant="contained">
            {editingCourse ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Course Hole Dialog */}
      <Dialog open={holeDialogOpen} onClose={handleCloseHoleDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingHole ? 'Edit Course Hole' : 'Add Course Hole'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Hole Number"
                type="number"
                value={holeFormData.holeNumber}
                onChange={(e) => setHoleFormData({ ...holeFormData, holeNumber: parseInt(e.target.value) || 1 })}
                required
                fullWidth
              />
              <TextField
                label="Par"
                type="number"
                value={holeFormData.par}
                onChange={(e) => setHoleFormData({ ...holeFormData, par: parseInt(e.target.value) || 4 })}
                required
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Yardage"
                type="number"
                value={holeFormData.yardage || ''}
                onChange={(e) => setHoleFormData({ ...holeFormData, yardage: e.target.value ? parseInt(e.target.value) : undefined })}
                fullWidth
              />
              <TextField
                label="Handicap"
                type="number"
                value={holeFormData.handicap || ''}
                onChange={(e) => setHoleFormData({ ...holeFormData, handicap: e.target.value ? parseInt(e.target.value) : undefined })}
                fullWidth
              />
            </Box>
            <TextField
              label="Description"
              value={holeFormData.description}
              onChange={(e) => setHoleFormData({ ...holeFormData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Highlight"
              value={holeFormData.highlight}
              onChange={(e) => setHoleFormData({ ...holeFormData, highlight: e.target.value })}
              multiline
              rows={2}
              fullWidth
              helperText="Special features or challenges (e.g., 'Hole 7: Par 4, 336-yard challenge with blind shot')"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHoleDialog}>Cancel</Button>
          <Button onClick={handleSubmitHole} variant="contained">
            {editingHole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CoursesPage;

