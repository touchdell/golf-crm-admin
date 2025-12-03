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
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import {
  getPriceItems,
  createPriceItem,
  updatePriceItem,
  togglePriceItemActive,
  deletePriceItem,
  type PriceItem,
  type PriceCategory,
  type CreatePriceItemRequest,
} from '../../services/priceService';
import { supabase } from '../../lib/supabase';

const PRICE_CATEGORIES: PriceCategory[] = ['GREEN_FEE', 'CART', 'CADDY', 'OTHER'];

const PricesPage: React.FC = () => {
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const [formData, setFormData] = useState<CreatePriceItemRequest>({
    code: '',
    name: '',
    description: '',
    unitPrice: 0,
    currency: 'USD',
    category: 'GREEN_FEE',
  });
  const [unitPriceInput, setUnitPriceInput] = useState<string>('');

  useEffect(() => {
    loadPriceItems();
  }, []);

  const loadPriceItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await getPriceItems();
      setPriceItems(Array.isArray(items) ? items : []);
    } catch (err) {
      setError('Failed to load price items');
      console.error(err);
      setPriceItems([]); // Ensure it's always an array
    } finally {
      setLoading(false);
    }
  };

  // Generate code with running number based on category
  const generateCode = async (category: PriceCategory): Promise<string> => {
    const categoryPrefix: Record<PriceCategory, string> = {
      GREEN_FEE: 'GF',
      CART: 'CT',
      CADDY: 'CD',
      OTHER: 'OT',
    };
    
    const prefix = categoryPrefix[category] || 'OT';
    
    try {
      // Try to use Supabase RPC function if available
      const { data, error } = await supabase.rpc('generate_price_item_code', {
        category_prefix: prefix,
      });
      
      if (!error && data) {
        return data;
      }
    } catch (error) {
      console.warn('RPC function not available, using fallback:', error);
    }
    
    // Fallback: Query existing codes and find next number
    try {
      const { data: existingCodes } = await supabase
        .from('price_items')
        .select('code')
        .like('code', `${prefix}%`)
        .order('code', { ascending: false });
      
      if (existingCodes && existingCodes.length > 0) {
        // Extract numbers from existing codes (e.g., GF0001 -> 1)
        const numbers = existingCodes
          .map((item) => {
            const match = item.code.match(new RegExp(`^${prefix}(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num) => num > 0);
        
        const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNumber = maxNumber + 1;
        return `${prefix}${String(nextNumber).padStart(4, '0')}`;
      }
    } catch (error) {
      console.error('Error generating code:', error);
    }
    
    // Default: return first number
    return `${prefix}0001`;
  };

  const handleOpenDialog = async (item?: PriceItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code,
        name: item.name,
        description: item.description || '',
        unitPrice: item.unitPrice,
        currency: item.currency,
        category: item.category,
      });
      setUnitPriceInput(item.unitPrice.toString());
    } else {
      setEditingItem(null);
      // Auto-generate code immediately when opening dialog for new item
      const initialCategory: PriceCategory = 'GREEN_FEE';
      const generatedCode = await generateCode(initialCategory);
      setFormData({
        code: generatedCode,
        name: '',
        description: '',
        unitPrice: 0,
        currency: 'USD',
        category: initialCategory,
      });
      setUnitPriceInput('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async () => {
    try {
      // Code should already be generated, but ensure it exists
      const finalFormData = { ...formData };
      if (!finalFormData.code) {
        finalFormData.code = await generateCode(finalFormData.category);
      }
      
      // Ensure unit price is valid
      const priceValue = parseFloat(unitPriceInput);
      if (!isNaN(priceValue) && priceValue >= 0) {
        finalFormData.unitPrice = priceValue;
      }
      
      if (editingItem) {
        await updatePriceItem(editingItem.id, finalFormData);
      } else {
        await createPriceItem(finalFormData);
      }
      await loadPriceItems();
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save price item');
      console.error(err);
    }
  };

  const handleToggleActive = async (item: PriceItem) => {
    try {
      await togglePriceItemActive(item.id, !item.isActive);
      await loadPriceItems();
    } catch (err) {
      setError('Failed to update price item');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this price item?')) {
      return;
    }
    try {
      await deletePriceItem(id);
      await loadPriceItems();
    } catch (err) {
      setError('Failed to delete price item');
      console.error(err);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Price Catalog</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Price Item
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
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!Array.isArray(priceItems) || priceItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No price items found
                    </TableCell>
                  </TableRow>
                ) : (
                  priceItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.unitPrice, item.currency)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.isActive}
                          onChange={() => handleToggleActive(item)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(item)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(item.id)}
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
          {editingItem ? 'Edit Price Item' : 'Add Price Item'}
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
                editingItem
                  ? 'Price item code (cannot be changed)'
                  : 'Code is auto-generated with sequential number to prevent collisions (e.g., GF0001, GF0002)'
              }
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData((prev) => ({ ...prev, name: newName }));
              }}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              select
              label="Category"
              value={formData.category}
              onChange={async (e) => {
                const newCategory = e.target.value as PriceCategory;
                setFormData((prev) => ({ ...prev, category: newCategory }));
                // Regenerate code when category changes (for new items only)
                if (!editingItem) {
                  const generatedCode = await generateCode(newCategory);
                  setFormData((prev) => ({ ...prev, category: newCategory, code: generatedCode }));
                }
              }}
              required
              fullWidth
            >
              {PRICE_CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Unit Price"
              type="number"
              value={unitPriceInput}
              onChange={(e) => {
                const inputValue = e.target.value;
                setUnitPriceInput(inputValue);
                // Update formData only if valid number
                const numValue = parseFloat(inputValue);
                if (!isNaN(numValue) && numValue >= 0) {
                  setFormData({ ...formData, unitPrice: numValue });
                } else if (inputValue === '' || inputValue === '.') {
                  // Allow empty or just decimal point while typing
                  setFormData({ ...formData, unitPrice: 0 });
                }
              }}
              onBlur={() => {
                // Ensure valid value on blur
                const numValue = parseFloat(unitPriceInput);
                if (isNaN(numValue) || numValue < 0) {
                  setUnitPriceInput('0');
                  setFormData({ ...formData, unitPrice: 0 });
                } else {
                  setUnitPriceInput(numValue.toString());
                }
              }}
              required
              fullWidth
              inputProps={{ step: 0.01, min: 0 }}
              placeholder="0.00"
            />
            <TextField
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              required
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.code || !formData.name || formData.unitPrice <= 0}
          >
            {editingItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PricesPage;

