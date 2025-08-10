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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  MenuItem,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import api from '../../services/api';

function RfqRates({ rfqId }) {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [costRateDialog, setCostRateDialog] = useState({ open: false, rate: null });
  const [sellRateDialog, setSellRateDialog] = useState({ open: false, rate: null });
  const [importDialog, setImportDialog] = useState(false);

  // Fetch cost rates
  const { data: costRates, refetch: refetchCostRates } = useQuery(
    'costRates',
    async () => {
      const response = await api.get('/rates/cost');
      return response.data;
    }
  );

  // Fetch sell rates
  const { data: sellRates, refetch: refetchSellRates } = useQuery(
    'sellRates',
    async () => {
      const response = await api.get('/rates/sell');
      return response.data;
    }
  );

  // Fetch use cases
  const { data: useCases } = useQuery(
    'useCases',
    async () => {
      const response = await api.get('/rates/use-cases');
      return response.data;
    }
  );

  const createCostRateMutation = useMutation(
    (data) => api.post('/rates/cost', data),
    {
      onSuccess: () => {
        enqueueSnackbar('Cost rate created successfully', { variant: 'success' });
        setCostRateDialog({ open: false, rate: null });
        refetchCostRates();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to create cost rate', { variant: 'error' });
      },
    }
  );

  const updateCostRateMutation = useMutation(
    ({ id, data }) => api.put(`/rates/cost/${id}`, data),
    {
      onSuccess: () => {
        enqueueSnackbar('Cost rate updated successfully', { variant: 'success' });
        setCostRateDialog({ open: false, rate: null });
        refetchCostRates();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to update cost rate', { variant: 'error' });
      },
    }
  );

  const deleteCostRateMutation = useMutation(
    (id) => api.delete(`/rates/cost/${id}`),
    {
      onSuccess: () => {
        enqueueSnackbar('Cost rate deleted successfully', { variant: 'success' });
        refetchCostRates();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to delete cost rate', { variant: 'error' });
      },
    }
  );

  const createSellRateMutation = useMutation(
    (data) => api.post('/rates/sell', data),
    {
      onSuccess: () => {
        enqueueSnackbar('Sell rate created successfully', { variant: 'success' });
        setSellRateDialog({ open: false, rate: null });
        refetchSellRates();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to create sell rate', { variant: 'error' });
      },
    }
  );

  const updateSellRateMutation = useMutation(
    ({ id, data }) => api.put(`/rates/sell/${id}`, data),
    {
      onSuccess: () => {
        enqueueSnackbar('Sell rate updated successfully', { variant: 'success' });
        setSellRateDialog({ open: false, rate: null });
        refetchSellRates();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to update sell rate', { variant: 'error' });
      },
    }
  );

  const deleteSellRateMutation = useMutation(
    (id) => api.delete(`/rates/sell/${id}`),
    {
      onSuccess: () => {
        enqueueSnackbar('Sell rate deleted successfully', { variant: 'success' });
        refetchSellRates();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to delete sell rate', { variant: 'error' });
      },
    }
  );

  const handleExportTemplate = async () => {
    try {
      const response = await api.get('/imports/templates/rates', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rates-template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      enqueueSnackbar('Failed to download template', { variant: 'error' });
    }
  };

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/imports/rates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data.success) {
        enqueueSnackbar(`Imported ${response.data.imported.cost} cost rates and ${response.data.imported.sell} sell rates`, { variant: 'success' });
        refetchCostRates();
        refetchSellRates();
      } else {
        enqueueSnackbar('Import failed. Check the file format.', { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('Failed to import file', { variant: 'error' });
    }
    
    setImportDialog(false);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Rates & Use Cases</Typography>
        <Box display="flex" gap={1}>
          <Button startIcon={<UploadIcon />} onClick={() => setImportDialog(true)}>
            Import
          </Button>
          <Button startIcon={<DownloadIcon />} onClick={handleExportTemplate}>
            Download Template
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Cost rates are per cost center. Selling rates vary by level, location, and use case.
      </Alert>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Cost Rates" />
          <Tab label="Selling Rates" />
          <Tab label="Use Cases" />
        </Tabs>
      </Paper>

      {/* Cost Rates Tab */}
      {activeTab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Cost Rates (€/hour)</Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setCostRateDialog({ open: true, rate: null })}
            >
              Add Cost Rate
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cost Center</TableCell>
                  <TableCell>Effective From</TableCell>
                  <TableCell>Effective To</TableCell>
                  <TableCell align="right">Cost (€/h)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costRates?.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>
                      <Chip label={rate.costCenter} />
                    </TableCell>
                    <TableCell>{new Date(rate.effectiveFrom).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(rate.effectiveTo).toLocaleDateString()}</TableCell>
                    <TableCell align="right">€{parseFloat(rate.costPerHour).toFixed(2)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setCostRateDialog({ open: true, rate })}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => deleteCostRateMutation.mutate(rate.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Selling Rates Tab */}
      {activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Selling Rates (€/hour)</Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setSellRateDialog({ open: true, rate: null })}
            >
              Add Sell Rate
            </Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Location</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Use Case</TableCell>
                  <TableCell>Effective From</TableCell>
                  <TableCell>Effective To</TableCell>
                  <TableCell align="right">Rate (€/h)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sellRates?.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>
                      <Chip label={rate.location} size="small" />
                    </TableCell>
                    <TableCell>{rate.level}</TableCell>
                    <TableCell>
                      <Chip label={rate.useCase} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{new Date(rate.effectiveFrom).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(rate.effectiveTo).toLocaleDateString()}</TableCell>
                    <TableCell align="right">€{parseFloat(rate.sellPerHour).toFixed(2)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setSellRateDialog({ open: true, rate })}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => deleteSellRateMutation.mutate(rate.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Use Cases Tab */}
      {activeTab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Use Cases
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Use cases allow different pricing strategies for the same resources.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {useCases?.map((uc) => (
              <Grid item xs={12} sm={6} md={4} key={uc}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6">{uc}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {uc === 'UC1' && 'Best Benefit - Premium pricing'}
                    {uc === 'UC2' && 'Compromise - Balanced pricing'}
                    {uc === 'UC3' && 'Best Price - Competitive pricing'}
                    {!['UC1', 'UC2', 'UC3'].includes(uc) && 'Custom use case'}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {sellRates?.filter(r => r.useCase === uc).length || 0} rates defined
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Cost Rate Dialog */}
      <Dialog open={costRateDialog.open} onClose={() => setCostRateDialog({ open: false, rate: null })} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
              costCenter: formData.get('costCenter'),
              effectiveFrom: formData.get('effectiveFrom'),
              effectiveTo: formData.get('effectiveTo'),
              costPerHour: parseFloat(formData.get('costPerHour')),
            };
            
            if (costRateDialog.rate) {
              updateCostRateMutation.mutate({ id: costRateDialog.rate.id, data });
            } else {
              createCostRateMutation.mutate(data);
            }
          }}
        >
          <DialogTitle>{costRateDialog.rate ? 'Edit Cost Rate' : 'Add Cost Rate'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  name="costCenter"
                  label="Cost Center"
                  margin="normal"
                  required
                  defaultValue={costRateDialog.rate?.costCenter || ''}
                >
                  <MenuItem value="BCC">BCC</MenuItem>
                  <MenuItem value="HCC">HCC</MenuItem>
                  <MenuItem value="MCC">MCC</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  name="effectiveFrom"
                  label="Effective From"
                  type="date"
                  margin="normal"
                  required
                  defaultValue={costRateDialog.rate?.effectiveFrom?.split('T')[0] || ''}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  name="effectiveTo"
                  label="Effective To"
                  type="date"
                  margin="normal"
                  required
                  defaultValue={costRateDialog.rate?.effectiveTo?.split('T')[0] || ''}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="costPerHour"
                  label="Cost per Hour (€)"
                  type="number"
                  margin="normal"
                  required
                  defaultValue={costRateDialog.rate?.costPerHour || ''}
                  inputProps={{ step: 0.01, min: 0 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCostRateDialog({ open: false, rate: null })}>Cancel</Button>
            <Button type="submit" variant="contained">
              {costRateDialog.rate ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Sell Rate Dialog */}
      <Dialog open={sellRateDialog.open} onClose={() => setSellRateDialog({ open: false, rate: null })} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
              location: formData.get('location'),
              level: formData.get('level'),
              useCase: formData.get('useCase'),
              effectiveFrom: formData.get('effectiveFrom'),
              effectiveTo: formData.get('effectiveTo'),
              sellPerHour: parseFloat(formData.get('sellPerHour')),
            };
            
            if (sellRateDialog.rate) {
              updateSellRateMutation.mutate({ id: sellRateDialog.rate.id, data });
            } else {
              createSellRateMutation.mutate(data);
            }
          }}
        >
          <DialogTitle>{sellRateDialog.rate ? 'Edit Sell Rate' : 'Add Sell Rate'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  select
                  name="location"
                  label="Location"
                  margin="normal"
                  required
                  defaultValue={sellRateDialog.rate?.location || ''}
                >
                  <MenuItem value="BCC">BCC</MenuItem>
                  <MenuItem value="HCC">HCC</MenuItem>
                  <MenuItem value="MCC">MCC</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  name="level"
                  label="Level"
                  margin="normal"
                  required
                  defaultValue={sellRateDialog.rate?.level || ''}
                  placeholder="e.g., Junior, Senior, Principal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="useCase"
                  label="Use Case"
                  margin="normal"
                  required
                  defaultValue={sellRateDialog.rate?.useCase || ''}
                  placeholder="e.g., UC1, UC2, UC3"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  name="effectiveFrom"
                  label="Effective From"
                  type="date"
                  margin="normal"
                  required
                  defaultValue={sellRateDialog.rate?.effectiveFrom?.split('T')[0] || ''}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  name="effectiveTo"
                  label="Effective To"
                  type="date"
                  margin="normal"
                  required
                  defaultValue={sellRateDialog.rate?.effectiveTo?.split('T')[0] || ''}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="sellPerHour"
                  label="Sell Rate per Hour (€)"
                  type="number"
                  margin="normal"
                  required
                  defaultValue={sellRateDialog.rate?.sellPerHour || ''}
                  inputProps={{ step: 0.01, min: 0 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSellRateDialog({ open: false, rate: null })}>Cancel</Button>
            <Button type="submit" variant="contained">
              {sellRateDialog.rate ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Rates</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Upload an Excel file with cost and sell rates. Download the template for the correct format.
          </Typography>
          <input
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            id="import-file"
            onChange={(e) => {
              if (e.target.files[0]) {
                handleImport(e.target.files[0]);
              }
            }}
          />
          <label htmlFor="import-file">
            <Button
              variant="contained"
              component="span"
              fullWidth
              sx={{ mt: 2 }}
              startIcon={<UploadIcon />}
            >
              Select File
            </Button>
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RfqRates;