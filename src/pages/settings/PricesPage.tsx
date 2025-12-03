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

  const handleOpenDialog = (item?: PriceItem) => {
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
    } else {
      setEditingItem(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        unitPrice: 0,
        currency: 'USD',
        category: 'GREEN_FEE',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        await updatePriceItem(editingItem.id, formData);
      } else {
        await createPriceItem(formData);
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
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              fullWidth
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
              rows={2}
              fullWidth
            />
            <TextField
              select
              label="Category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as PriceCategory })
              }
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
              value={formData.unitPrice}
              onChange={(e) =>
                setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })
              }
              required
              fullWidth
              inputProps={{ step: 0.01, min: 0 }}
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

