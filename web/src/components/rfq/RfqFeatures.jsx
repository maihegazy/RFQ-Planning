import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

function RfqFeatures({ rfqId }) {
  const { enqueueSnackbar } = useSnackbar();
  const [dialog, setDialog] = useState({ open: false, feature: null });

  const { data: features, refetch } = useQuery(
    ['features', rfqId],
    async () => {
      const response = await api.get(`/features/rfq/${rfqId}`);
      return response.data;
    }
  );

  const createMutation = useMutation(
    (data) => api.post('/features', data),
    {
      onSuccess: () => {
        enqueueSnackbar('Feature created successfully', { variant: 'success' });
        setDialog({ open: false, feature: null });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to create feature', { variant: 'error' });
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => api.put(`/features/${id}`, data),
    {
      onSuccess: () => {
        enqueueSnackbar('Feature updated successfully', { variant: 'success' });
        setDialog({ open: false, feature: null });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to update feature', { variant: 'error' });
      },
    }
  );

  const deleteMutation = useMutation(
    (id) => api.delete(`/features/${id}`),
    {
      onSuccess: () => {
        enqueueSnackbar('Feature deleted successfully', { variant: 'success' });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to delete feature', { variant: 'error' });
      },
    }
  );

  const handleSubmit = (data) => {
    if (dialog.feature) {
      updateMutation.mutate({ id: dialog.feature.id, data });
    } else {
      createMutation.mutate({ ...data, rfqId });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Features</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialog({ open: true, feature: null })}
        >
          Add Feature
        </Button>
      </Box>

      <Grid container spacing={3}>
        {features?.map((feature) => (
          <Grid item xs={12} md={6} lg={4} key={feature.id}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box flex={1}>
                  <Typography variant="h6">{feature.name}</Typography>
                  {feature.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {feature.description}
                    </Typography>
                  )}
                  {(feature.targetMonth || feature.targetYear) && (
                    <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="textSecondary">
                        Target: {feature.targetMonth}/{feature.targetYear}
                      </Typography>
                    </Box>
                  )}
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      label={`${feature._count.profilePlans} Profiles`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${feature._count.comments} Comments`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => setDialog({ open: true, feature })}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => deleteMutation.mutate(feature.id)}
                    disabled={feature._count.profilePlans > 0}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {features?.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No features added yet. Click "Add Feature" to get started.
          </Typography>
        </Paper>
      )}

      {/* Feature Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, feature: null })} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            handleSubmit({
              name: formData.get('name'),
              description: formData.get('description'),
              targetMonth: formData.get('targetMonth') ? parseInt(formData.get('targetMonth')) : null,
              targetYear: formData.get('targetYear') ? parseInt(formData.get('targetYear')) : null,
            });
          }}
        >
          <DialogTitle>{dialog.feature ? 'Edit Feature' : 'Add Feature'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              name="name"
              label="Feature Name"
              margin="normal"
              required
              defaultValue={dialog.feature?.name}
            />
            <TextField
              fullWidth
              name="description"
              label="Description"
              margin="normal"
              multiline
              rows={3}
              defaultValue={dialog.feature?.description}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  name="targetMonth"
                  label="Target Month"
                  type="number"
                  margin="normal"
                  InputProps={{ inputProps: { min: 1, max: 12 } }}
                  defaultValue={dialog.feature?.targetMonth}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  name="targetYear"
                  label="Target Year"
                  type="number"
                  margin="normal"
                  InputProps={{ inputProps: { min: 2025, max: 2050 } }}
                  defaultValue={dialog.feature?.targetYear}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog({ open: false, feature: null })}>Cancel</Button>
            <Button type="submit" variant="contained">
              {dialog.feature ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

export default RfqFeatures;