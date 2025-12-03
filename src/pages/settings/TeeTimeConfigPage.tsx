import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import {
  getTeeTimeConfig,
  updateTeeTimeConfig,
  type TeeTimeConfig,
} from '../../services/teeTimeConfigService';

const TeeTimeConfigPage: React.FC = () => {
  const [config, setConfig] = useState<TeeTimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<TeeTimeConfig>({
    startTime: '06:00',
    endTime: '18:00',
    intervalMinutes: 10,
    maxPlayersPerSlot: 4,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTeeTimeConfig();
      setConfig(data);
      setFormData(data);
    } catch (err) {
      setError('Failed to load tee time configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await updateTeeTimeConfig(formData);
      setSuccess(true);
      await loadConfig();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save tee time configuration');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const validateTime = (time: string): boolean => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    if (validateTime(value) || value === '') {
      setFormData({ ...formData, [field]: value });
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Tee Time Rules Configuration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          Configuration saved successfully!
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              Global Tee Time Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure the default rules for tee time generation and booking.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Time"
                  value={formData.startTime}
                  onChange={(e) => handleTimeChange('startTime', e.target.value)}
                  placeholder="HH:mm"
                  helperText="Format: HH:mm (e.g., 06:00)"
                  fullWidth
                  required
                  inputProps={{ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Time"
                  value={formData.endTime}
                  onChange={(e) => handleTimeChange('endTime', e.target.value)}
                  placeholder="HH:mm"
                  helperText="Format: HH:mm (e.g., 18:00)"
                  fullWidth
                  required
                  inputProps={{ pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Interval (minutes)"
                  type="number"
                  value={formData.intervalMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      intervalMinutes: parseInt(e.target.value) || 10,
                    })
                  }
                  helperText="Time interval between tee time slots"
                  fullWidth
                  required
                  inputProps={{ min: 5, max: 60, step: 5 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Max Players Per Slot"
                  type="number"
                  value={formData.maxPlayersPerSlot}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxPlayersPerSlot: parseInt(e.target.value) || 4,
                    })
                  }
                  helperText="Maximum number of players allowed per tee time"
                  fullWidth
                  required
                  inputProps={{ min: 1, max: 8 }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSubmit}
                disabled={saving || !validateTime(formData.startTime) || !validateTime(formData.endTime)}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TeeTimeConfigPage;

