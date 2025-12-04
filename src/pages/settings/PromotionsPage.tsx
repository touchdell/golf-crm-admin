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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore } from '@mui/icons-material';
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getPromotionBands,
  createPromotionBand,
  updatePromotionBand,
  deletePromotionBand,
  type Promotion,
  type PromotionBand,
  type CreatePromotionRequest,
  type CreatePromotionBandRequest,
  type DayGroup,
  type PriceActionType,
  type MemberSegment,
} from '../../services/promotionService';

const DAY_GROUPS: DayGroup[] = ['ALL', 'WEEKDAY', 'WEEKEND'];
const PRICE_ACTION_TYPES: PriceActionType[] = ['FIXED_PRICE', 'DISCOUNT_THB', 'DISCOUNT_PERCENT'];
const MEMBER_SEGMENTS: (MemberSegment | '')[] = ['', 'THAI', 'FOREIGN_WP', 'FOREIGN_OTHER', 'ALL'];

const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [bandDialogOpen, setBandDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [editingBand, setEditingBand] = useState<PromotionBand | null>(null);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [promotionBands, setPromotionBands] = useState<Map<string, PromotionBand[]>>(new Map());
  const [expandedPromotions, setExpandedPromotions] = useState<Set<string>>(new Set());

  const [promotionFormData, setPromotionFormData] = useState<CreatePromotionRequest>({
    code: '',
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true,
    priority: 100,
    stacking: 'EXCLUSIVE',
  });

  const [bandFormData, setBandFormData] = useState<CreatePromotionBandRequest>({
    promotionId: '',
    dayGroup: 'ALL',
    dowMask: 127,
    timeFrom: '06:00',
    timeTo: '23:59',
    courseId: null,
    playerSegment: null,
    minLeadDays: null,
    minPlayers: null,
    maxPlayers: null,
    actionType: 'FIXED_PRICE',
    actionValue: 0,
    includesGreenFee: true,
    includesCaddy: true,
    includesCart: true,
    extraConditions: null,
    extraMeta: null,
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPromotions();
      setPromotions(data);
    } catch (err) {
      setError('Failed to load promotions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPromotionBands = async (promotionId: string) => {
    try {
      const bands = await getPromotionBands(promotionId);
      setPromotionBands((prev) => {
        const newMap = new Map(prev);
        newMap.set(promotionId, bands);
        return newMap;
      });
    } catch (err) {
      console.error('Error loading promotion bands:', err);
    }
  };

  const handlePromotionAccordionChange = (promotionId: string) => {
    setExpandedPromotions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(promotionId)) {
        newSet.delete(promotionId);
      } else {
        newSet.add(promotionId);
        loadPromotionBands(promotionId);
      }
      return newSet;
    });
  };

  const handleOpenPromotionDialog = (promotion?: Promotion) => {
    if (promotion) {
      setEditingPromotion(promotion);
      setPromotionFormData({
        code: promotion.code,
        name: promotion.name,
        description: promotion.description || '',
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        isActive: promotion.isActive,
        priority: promotion.priority,
        stacking: promotion.stacking,
      });
    } else {
      setEditingPromotion(null);
      setPromotionFormData({
        code: '',
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        isActive: true,
        priority: 100,
        stacking: 'EXCLUSIVE',
      });
    }
    setPromotionDialogOpen(true);
  };

  const handleClosePromotionDialog = () => {
    setPromotionDialogOpen(false);
    setEditingPromotion(null);
  };

  const handleOpenBandDialog = (promotionId: string, band?: PromotionBand) => {
    setSelectedPromotionId(promotionId);
    if (band) {
      setEditingBand(band);
      setBandFormData({
        promotionId: band.promotionId,
        dayGroup: band.dayGroup,
        dowMask: band.dowMask,
        timeFrom: band.timeFrom,
        timeTo: band.timeTo,
        courseId: band.courseId,
        playerSegment: band.playerSegment,
        minLeadDays: band.minLeadDays,
        minPlayers: band.minPlayers,
        maxPlayers: band.maxPlayers,
        actionType: band.actionType,
        actionValue: band.actionValue,
        includesGreenFee: band.includesGreenFee,
        includesCaddy: band.includesCaddy,
        includesCart: band.includesCart,
        extraConditions: band.extraConditions,
        extraMeta: band.extraMeta,
      });
    } else {
      setEditingBand(null);
      setBandFormData({
        promotionId,
        dayGroup: 'ALL',
        dowMask: 127,
        timeFrom: '06:00',
        timeTo: '23:59',
        courseId: null,
        playerSegment: null,
        minLeadDays: null,
        minPlayers: null,
        maxPlayers: null,
        actionType: 'FIXED_PRICE',
        actionValue: 0,
        includesGreenFee: true,
        includesCaddy: true,
        includesCart: true,
        extraConditions: null,
        extraMeta: null,
      });
    }
    setBandDialogOpen(true);
  };

  const handleCloseBandDialog = () => {
    setBandDialogOpen(false);
    setEditingBand(null);
    setSelectedPromotionId(null);
  };

  const handleSubmitPromotion = async () => {
    try {
      if (editingPromotion) {
        await updatePromotion(editingPromotion.id, promotionFormData);
      } else {
        await createPromotion(promotionFormData);
      }
      await loadPromotions();
      handleClosePromotionDialog();
    } catch (err: any) {
      setError(err?.message || 'Failed to save promotion');
      console.error(err);
    }
  };

  const handleSubmitBand = async () => {
    try {
      if (editingBand) {
        await updatePromotionBand(editingBand.id, bandFormData);
      } else {
        await createPromotionBand(bandFormData);
      }
      if (selectedPromotionId) {
        await loadPromotionBands(selectedPromotionId);
      }
      handleCloseBandDialog();
    } catch (err: any) {
      setError(err?.message || 'Failed to save promotion band');
      console.error(err);
    }
  };


  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this promotion? All associated bands will also be deleted.')) {
      return;
    }
    try {
      await deletePromotion(id);
      await loadPromotions();
    } catch (err) {
      setError('Failed to delete promotion');
      console.error(err);
    }
  };

  const handleDeleteBand = async (bandId: string, promotionId: string) => {
    if (!window.confirm('Are you sure you want to delete this promotion band?')) {
      return;
    }
    try {
      await deletePromotionBand(bandId);
      await loadPromotionBands(promotionId);
    } catch (err) {
      setError('Failed to delete promotion band');
      console.error(err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getActionTypeLabel = (actionType: PriceActionType, actionValue: number) => {
    switch (actionType) {
      case 'FIXED_PRICE':
        return `Fixed: ${actionValue.toFixed(2)} THB`;
      case 'DISCOUNT_THB':
        return `Discount: ${actionValue.toFixed(2)} THB`;
      case 'DISCOUNT_PERCENT':
        return `Discount: ${actionValue.toFixed(0)}%`;
      default:
        return actionType;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Promotions Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenPromotionDialog()}
        >
          Add Promotion
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
          {promotions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No promotions found</Typography>
            </Paper>
          ) : (
            promotions.map((promotion) => (
              <Accordion
                key={promotion.id}
                expanded={expandedPromotions.has(promotion.id)}
                onChange={() => handlePromotionAccordionChange(promotion.id)}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{promotion.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {promotion.code} • {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)} • Priority: {promotion.priority}
                      </Typography>
                    </Box>
                    <Chip
                      label={promotion.isActive ? 'Active' : 'Inactive'}
                      color={promotion.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPromotionDialog(promotion);
                      }}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePromotion(promotion.id);
                      }}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle1">Promotion Bands</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => handleOpenBandDialog(promotion.id)}
                      >
                        Add Band
                      </Button>
                    </Box>
                    {promotionBands.get(promotion.id)?.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                        No bands configured. Add a band to define pricing rules.
                      </Typography>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Day Group</TableCell>
                              <TableCell>Time Range</TableCell>
                              <TableCell>Player Segment</TableCell>
                              <TableCell>Players</TableCell>
                              <TableCell>Action</TableCell>
                              <TableCell>Includes</TableCell>
                              <TableCell align="center">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {promotionBands.get(promotion.id)?.map((band) => (
                              <TableRow key={band.id}>
                                <TableCell>
                                  <Chip label={band.dayGroup} size="small" />
                                </TableCell>
                                <TableCell>
                                  {band.timeFrom} - {band.timeTo}
                                </TableCell>
                                <TableCell>
                                  {band.playerSegment || 'ALL'}
                                </TableCell>
                                <TableCell>
                                  {band.minPlayers && band.maxPlayers
                                    ? `${band.minPlayers}-${band.maxPlayers}`
                                    : band.minPlayers
                                    ? `≥${band.minPlayers}`
                                    : band.maxPlayers
                                    ? `≤${band.maxPlayers}`
                                    : 'Any'}
                                </TableCell>
                                <TableCell>
                                  {getActionTypeLabel(band.actionType, band.actionValue)}
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {band.includesGreenFee && <Chip label="GF" size="small" />}
                                    {band.includesCaddy && <Chip label="Caddy" size="small" />}
                                    {band.includesCart && <Chip label="Cart" size="small" />}
                                  </Box>
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenBandDialog(promotion.id, band)}
                                    color="primary"
                                  >
                                    <Edit />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteBand(band.id, promotion.id)}
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

      {/* Promotion Dialog */}
      <Dialog open={promotionDialogOpen} onClose={handleClosePromotionDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPromotion ? 'Edit Promotion' : 'Add Promotion'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Code"
              value={promotionFormData.code}
              onChange={(e) => setPromotionFormData({ ...promotionFormData, code: e.target.value.toUpperCase() })}
              required
              fullWidth
              helperText="Unique promotion code (e.g., YEAR_END_2024)"
            />
            <TextField
              label="Name"
              value={promotionFormData.name}
              onChange={(e) => setPromotionFormData({ ...promotionFormData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={promotionFormData.description}
              onChange={(e) => setPromotionFormData({ ...promotionFormData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={promotionFormData.startDate}
                onChange={(e) => setPromotionFormData({ ...promotionFormData, startDate: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="End Date"
                type="date"
                value={promotionFormData.endDate}
                onChange={(e) => setPromotionFormData({ ...promotionFormData, endDate: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Priority"
                type="number"
                value={promotionFormData.priority}
                onChange={(e) => setPromotionFormData({ ...promotionFormData, priority: parseInt(e.target.value) || 100 })}
                fullWidth
                helperText="Lower number = higher priority"
              />
              <TextField
                label="Stacking"
                select
                value={promotionFormData.stacking}
                onChange={(e) => setPromotionFormData({ ...promotionFormData, stacking: e.target.value })}
                fullWidth
              >
                <MenuItem value="EXCLUSIVE">Exclusive</MenuItem>
                <MenuItem value="STACKABLE">Stackable</MenuItem>
              </TextField>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={promotionFormData.isActive}
                  onChange={(e) => setPromotionFormData({ ...promotionFormData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePromotionDialog}>Cancel</Button>
          <Button onClick={handleSubmitPromotion} variant="contained">
            {editingPromotion ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Promotion Band Dialog */}
      <Dialog open={bandDialogOpen} onClose={handleCloseBandDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBand ? 'Edit Promotion Band' : 'Add Promotion Band'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Day Group"
              select
              value={bandFormData.dayGroup}
              onChange={(e) => setBandFormData({ ...bandFormData, dayGroup: e.target.value as DayGroup })}
              required
              fullWidth
            >
              {DAY_GROUPS.map((dg) => (
                <MenuItem key={dg} value={dg}>
                  {dg}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Time From"
                type="time"
                value={bandFormData.timeFrom}
                onChange={(e) => setBandFormData({ ...bandFormData, timeFrom: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Time To"
                type="time"
                value={bandFormData.timeTo}
                onChange={(e) => setBandFormData({ ...bandFormData, timeTo: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <TextField
              label="Player Segment"
              select
              value={bandFormData.playerSegment || ''}
              onChange={(e) => setBandFormData({ ...bandFormData, playerSegment: (e.target.value || null) as MemberSegment | null })}
              fullWidth
            >
              {MEMBER_SEGMENTS.map((seg) => (
                <MenuItem key={seg || 'null'} value={seg || ''}>
                  {seg || 'All Segments'}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Min Players"
                type="number"
                value={bandFormData.minPlayers || ''}
                onChange={(e) => setBandFormData({ ...bandFormData, minPlayers: e.target.value ? parseInt(e.target.value) : null })}
                fullWidth
              />
              <TextField
                label="Max Players"
                type="number"
                value={bandFormData.maxPlayers || ''}
                onChange={(e) => setBandFormData({ ...bandFormData, maxPlayers: e.target.value ? parseInt(e.target.value) : null })}
                fullWidth
              />
              <TextField
                label="Min Lead Days"
                type="number"
                value={bandFormData.minLeadDays || ''}
                onChange={(e) => setBandFormData({ ...bandFormData, minLeadDays: e.target.value ? parseInt(e.target.value) : null })}
                fullWidth
              />
            </Box>
            <TextField
              label="Action Type"
              select
              value={bandFormData.actionType}
              onChange={(e) => setBandFormData({ ...bandFormData, actionType: e.target.value as PriceActionType })}
              required
              fullWidth
            >
              {PRICE_ACTION_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Action Value"
              type="number"
              value={bandFormData.actionValue}
              onChange={(e) => setBandFormData({ ...bandFormData, actionValue: parseFloat(e.target.value) || 0 })}
              required
              fullWidth
              helperText={
                bandFormData.actionType === 'FIXED_PRICE'
                  ? 'Fixed price in THB'
                  : bandFormData.actionType === 'DISCOUNT_THB'
                  ? 'Discount amount in THB'
                  : 'Discount percentage (0-100)'
              }
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Includes:
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bandFormData.includesGreenFee}
                    onChange={(e) => setBandFormData({ ...bandFormData, includesGreenFee: e.target.checked })}
                  />
                }
                label="Green Fee"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bandFormData.includesCaddy}
                    onChange={(e) => setBandFormData({ ...bandFormData, includesCaddy: e.target.checked })}
                  />
                }
                label="Caddy"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bandFormData.includesCart}
                    onChange={(e) => setBandFormData({ ...bandFormData, includesCart: e.target.checked })}
                  />
                }
                label="Cart"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBandDialog}>Cancel</Button>
          <Button onClick={handleSubmitBand} variant="contained">
            {editingBand ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromotionsPage;

