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
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import {
  getMembershipTypes,
  createMembershipType,
  updateMembershipType,
  deleteMembershipType,
  type MembershipType,
  type CreateMembershipTypeRequest,
} from '../../services/membershipTypeService';
import { supabase } from '../../lib/supabase';

const MembershipTypesPage: React.FC = () => {
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MembershipType | null>(null);
  const [formData, setFormData] = useState<CreateMembershipTypeRequest>({
    code: '',
    name: '',
    description: '',
  });

  useEffect(() => {
    loadMembershipTypes();
  }, []);

  const loadMembershipTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const types = await getMembershipTypes();
      setMembershipTypes(types);
    } catch (err) {
      setError('Failed to load membership types');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Generate code with running number (MT0001, MT0002, etc.)
  const generateCode = async (): Promise<string> => {
    try {
      // Try to use Supabase RPC function if available
      const { data, error } = await supabase.rpc('generate_membership_type_code');
      
      if (!error && data) {
        return data;
      }
    } catch (error) {
      console.warn('RPC function not available, using fallback:', error);
    }
    
    // Fallback: Query existing codes and find next number
    try {
      const { data: existingCodes } = await supabase
        .from('membership_types')
        .select('code')
        .like('code', 'MT%')
        .order('code', { ascending: false });
      
      if (existingCodes && existingCodes.length > 0) {
        // Extract numbers from existing codes (e.g., MT0001 -> 1)
        const numbers = existingCodes
          .map((item) => {
            const match = item.code.match(/^MT(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num) => num > 0);
        
        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNumber = maxNumber + 1;
        return `MT${String(nextNumber).padStart(4, '0')}`;
      }
    } catch (error) {
      console.error('Error generating code:', error);
    }
    
    // Default if no existing codes or error
    return 'MT0001';
  };

  const handleOpenDialog = async (type?: MembershipType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        code: type.code,
        name: type.name,
        description: type.description || '',
      });
    } else {
      setEditingType(null);
      // Auto-generate code immediately when opening dialog for new item
      const generatedCode = await generateCode();
      setFormData({
        code: generatedCode,
        name: '',
        description: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingType(null);
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      
      // Ensure code is generated if empty (shouldn't happen, but safety check)
      let finalCode = formData.code;
      if (!finalCode || !finalCode.trim()) {
        finalCode = await generateCode();
      }
      
      // Validate required fields
      if (!finalCode || !finalCode.trim()) {
        setError('Code is required');
        return;
      }
      if (!formData.name || !formData.name.trim()) {
        setError('Name is required');
        return;
      }
      
      // Prepare data with trimmed values
      const submitData: CreateMembershipTypeRequest = {
        code: finalCode.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      };
      
      if (editingType) {
        await updateMembershipType(editingType.id, submitData);
      } else {
        await createMembershipType(submitData);
      }
      await loadMembershipTypes();
      handleCloseDialog();
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to save membership type';
      setError(errorMessage);
      console.error('Error saving membership type:', err);
    }
  };

  const handleToggleActive = async (type: MembershipType) => {
    try {
      setError(null);
      await updateMembershipType(type.id, { isActive: !type.isActive });
      await loadMembershipTypes();
    } catch (err) {
      setError('Failed to update membership type status');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this membership type?')) {
      return;
    }
    try {
      await deleteMembershipType(id);
      await loadMembershipTypes();
    } catch (err) {
      setError('Failed to delete membership type');
      console.error(err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Membership Types</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Membership Type
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {membershipTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No membership types found
                    </TableCell>
                  </TableRow>
                ) : (
                  membershipTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>{type.code}</TableCell>
                      <TableCell>{type.name}</TableCell>
                      <TableCell>{type.description || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={type.isActive ? 'Active' : 'Inactive'}
                          color={type.isActive ? 'success' : 'default'}
                          size="small"
                        />
                        <Switch
                          checked={type.isActive}
                          onChange={() => handleToggleActive(type)}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(type)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(type.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingType ? 'Edit Membership Type' : 'Add Membership Type'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Code"
              value={formData.code}
              required
              fullWidth
              disabled={true}
              helperText={
                editingType
                  ? 'Membership type code (cannot be changed)'
                  : 'Code is auto-generated with sequential number to prevent collisions (e.g., MT0001, MT0002)'
              }
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.code || !formData.name}
          >
            {editingType ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MembershipTypesPage;

