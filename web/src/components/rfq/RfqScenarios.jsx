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
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
  Alert,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CloneIcon,
  Calculate as CalculateIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function RfqScenarios({ rfqId, hasFinancialAccess }) {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [scenarioDialog, setScenarioDialog] = useState({ open: false, scenario: null });
  const [compareDialog, setCompareDialog] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [calculations, setCalculations] = useState({});

const { data: scenarios, refetch } = useQuery(
  ['scenarios', rfqId],
  async () => {
    const response = await api.get(`/scenarios/rfq/${rfqId}`);
    // Extract items array from paginated response
    return response.data.items || response.data;
  }
  );

const { data: useCases } = useQuery(
  'useCases',
  async () => {
    try {
      const response = await api.get('/rates/use-cases');
      return response.data;
    } catch (error) {
      console.warn('Use cases endpoint not available, using defaults');
      return ['UC1', 'UC2', 'UC3']; // Fallback to default use cases
    }
  },
  {
    retry: false, // Don't retry if it fails
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  }
  );

  const createMutation = useMutation(
    (data) => api.post('/scenarios', data),
    {
      onSuccess: () => {
        enqueueSnackbar('Scenario created successfully', { variant: 'success' });
        setScenarioDialog({ open: false, scenario: null });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to create scenario', { variant: 'error' });
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => api.put(`/scenarios/${id}`, data),
    {
      onSuccess: () => {
        enqueueSnackbar('Scenario updated successfully', { variant: 'success' });
        setScenarioDialog({ open: false, scenario: null });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to update scenario', { variant: 'error' });
      },
    }
  );

  const deleteMutation = useMutation(
    (id) => api.delete(`/scenarios/${id}`),
    {
      onSuccess: () => {
        enqueueSnackbar('Scenario deleted successfully', { variant: 'success' });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to delete scenario', { variant: 'error' });
      },
    }
  );

  const cloneMutation = useMutation(
    ({ id, name }) => api.post(`/scenarios/${id}/clone`, { name }),
    {
      onSuccess: () => {
        enqueueSnackbar('Scenario cloned successfully', { variant: 'success' });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to clone scenario', { variant: 'error' });
      },
    }
  );

  const calculateScenario = async (scenarioId) => {
    try {
      const response = await api.get(`/scenarios/${scenarioId}/calculate`);
      setCalculations(prev => ({ ...prev, [scenarioId]: response.data }));
      enqueueSnackbar('Calculation completed', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to calculate scenario', { variant: 'error' });
    }
  };

  const compareScenarios = async () => {
    try {
      const response = await api.post('/scenarios/compare', { scenarioIds: selectedScenarios });
      setCalculations(prev => ({ ...prev, comparison: response.data }));
      setCompareDialog(false);
      setActiveTab(1); // Switch to comparison tab
      enqueueSnackbar('Comparison completed', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to compare scenarios', { variant: 'error' });
    }
  };

  const ScenarioCard = ({ scenario }) => {
    const calc = calculations[scenario.id];
    
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h6">{scenario.name}</Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip
                  label={scenario.type === 'TM' ? 'Time & Material' : 'Fixed Price'}
                  size="small"
                  color={scenario.type === 'TM' ? 'primary' : 'secondary'}
                />
                {scenario.useCase && (
                  <Chip label={scenario.useCase} size="small" variant="outlined" />
                )}
              </Box>
            </Box>
            <Box>
              <IconButton size="small" onClick={() => setScenarioDialog({ open: true, scenario })}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => cloneMutation.mutate({ id: scenario.id, name: `${scenario.name} (Copy)` })}>
                <CloneIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => deleteMutation.mutate(scenario.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {scenario.type === 'FIXED' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Ticket Sizes: S({scenario.spSmall}sp) M({scenario.spMedium}sp) L({scenario.spLarge}sp)
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Quotas: S({scenario.quotaSmall}%) M({scenario.quotaMedium}%) L({scenario.quotaLarge}%)
              </Typography>
            </Box>
          )}

          {hasFinancialAccess && calc && (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Total Revenue</Typography>
                  <Typography variant="h6">
                    €{parseFloat(calc.total?.revenue || calc.total?.totalRevenue || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Total Cost</Typography>
                  <Typography variant="h6">
                    €{parseFloat(calc.total?.finalCost || calc.total?.totalCost || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Margin</Typography>
                  <Typography variant="h6">
                    €{parseFloat(calc.total?.margin || 0).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Margin %</Typography>
                  <Typography variant="h6">
                    {parseFloat(calc.total?.marginPercent || 0).toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {scenario.additionalCosts?.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Additional Costs: {scenario.additionalCosts.length} items
              </Typography>
            </Box>
          )}
        </CardContent>
        <CardActions>
          <Button
            size="small"
            startIcon={<CalculateIcon />}
            onClick={() => calculateScenario(scenario.id)}
          >
            Calculate
          </Button>
          <Button
            size="small"
            onClick={() => {
              setSelectedScenarios(prev => 
                prev.includes(scenario.id) 
                  ? prev.filter(id => id !== scenario.id)
                  : [...prev, scenario.id]
              );
            }}
            variant={selectedScenarios.includes(scenario.id) ? 'contained' : 'text'}
          >
            {selectedScenarios.includes(scenario.id) ? 'Selected' : 'Select for Compare'}
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Scenarios</Typography>
        <Box display="flex" gap={1}>
          <Button
            startIcon={<CompareIcon />}
            onClick={() => setCompareDialog(true)}
            disabled={selectedScenarios.length < 2}
          >
            Compare ({selectedScenarios.length})
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setScenarioDialog({ open: true, scenario: null })}
          >
            Add Scenario
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Scenarios" />
          <Tab label="Comparison" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {scenarios?.map((scenario) => (
            <Grid item xs={12} md={6} key={scenario.id}>
              <ScenarioCard scenario={scenario} />
            </Grid>
          ))}
          {scenarios?.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="textSecondary">
                  No scenarios created yet. Click "Add Scenario" to get started.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          {calculations.comparison ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Scenario</TableCell>
                    <TableCell>Type</TableCell>
                    {hasFinancialAccess && (
                      <>
                        <TableCell align="right">Revenue</TableCell>
                        <TableCell align="right">Cost</TableCell>
                        <TableCell align="right">Margin</TableCell>
                        <TableCell align="right">Margin %</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {calculations.comparison.map((item) => (
                    <TableRow key={item.scenarioId}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      {hasFinancialAccess && (
                        <>
                          <TableCell align="right">
                            €{parseFloat(item.calculation.total?.revenue || item.calculation.total?.totalRevenue || 0).toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            €{parseFloat(item.calculation.total?.finalCost || item.calculation.total?.totalCost || 0).toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            €{parseFloat(item.calculation.total?.margin || 0).toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                            {parseFloat(item.calculation.total?.marginPercent || 0).toFixed(1)}%
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="textSecondary" align="center">
              Select scenarios and click "Compare" to see side-by-side comparison.
            </Typography>
          )}
        </Paper>
      )}

      {/* Scenario Dialog */}
      <Dialog 
        open={scenarioDialog.open} 
        onClose={() => setScenarioDialog({ open: false, scenario: null })} 
        maxWidth="md" 
        fullWidth
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
              rfqId,
              name: formData.get('name'),
              type: formData.get('type'),
              useCase: formData.get('useCase'),
              riskFactor: formData.get('riskFactor') ? parseFloat(formData.get('riskFactor')) : null,
              hwOverhead: formData.get('hwOverhead') ? parseFloat(formData.get('hwOverhead')) : null,
              spSmall: formData.get('spSmall') ? parseInt(formData.get('spSmall')) : null,
              spMedium: formData.get('spMedium') ? parseInt(formData.get('spMedium')) : null,
              spLarge: formData.get('spLarge') ? parseInt(formData.get('spLarge')) : null,
              quotaSmall: formData.get('quotaSmall') ? parseInt(formData.get('quotaSmall')) : null,
              quotaMedium: formData.get('quotaMedium') ? parseInt(formData.get('quotaMedium')) : null,
              quotaLarge: formData.get('quotaLarge') ? parseInt(formData.get('quotaLarge')) : null,
              spToHoursMultiplier: formData.get('spToHoursMultiplier') ? parseFloat(formData.get('spToHoursMultiplier')) : null,
            };
            
            if (scenarioDialog.scenario) {
              updateMutation.mutate({ id: scenarioDialog.scenario.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        >
          <DialogTitle>{scenarioDialog.scenario ? 'Edit Scenario' : 'Create Scenario'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="name"
                  label="Scenario Name"
                  margin="normal"
                  required
                  defaultValue={scenarioDialog.scenario?.name}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  select
                  name="type"
                  label="Type"
                  margin="normal"
                  required
                  defaultValue={scenarioDialog.scenario?.type || 'TM'}
                >
                  <MenuItem value="TM">Time & Material</MenuItem>
                  <MenuItem value="FIXED">Fixed Price</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  select
                  name="useCase"
                  label="Use Case"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.useCase || ''}
                >
                <MenuItem value="">None</MenuItem>
                  {useCases && useCases.length > 0 ? (
                    useCases.map(uc => (
                      <MenuItem key={uc} value={uc}>{uc}</MenuItem>
                    ))
                  ) : (
                    <>
                      <MenuItem value="UC1">UC1</MenuItem>
                      <MenuItem value="UC2">UC2</MenuItem>
                      <MenuItem value="UC3">UC3</MenuItem>
                    </>
                  )}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>Fixed Price Settings</Divider>
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  name="spSmall"
                  label="Small SP"
                  type="number"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.spSmall}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  name="spMedium"
                  label="Medium SP"
                  type="number"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.spMedium}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  name="spLarge"
                  label="Large SP"
                  type="number"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.spLarge}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  name="quotaSmall"
                  label="Small Quota %"
                  type="number"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.quotaSmall}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  name="quotaMedium"
                  label="Medium Quota %"
                  type="number"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.quotaMedium}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  name="quotaLarge"
                  label="Large Quota %"
                  type="number"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.quotaLarge}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  fullWidth
                  name="spToHoursMultiplier"
                  label="SP to Hours Multiplier"
                  type="number"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.spToHoursMultiplier || 6.5}
                  inputProps={{ step: 0.1 }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  name="riskFactor"
                  label="Risk Factor"
                  type="number"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.riskFactor || 1.1}
                  inputProps={{ step: 0.01, min: 1, max: 2 }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  name="hwOverhead"
                  label="HW Overhead (€)"
                  type="number"
                  margin="normal"
                  defaultValue={scenarioDialog.scenario?.hwOverhead}
                  inputProps={{ step: 100, min: 0 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setScenarioDialog({ open: false, scenario: null })}>Cancel</Button>
            <Button type="submit" variant="contained">
              {scenarioDialog.scenario ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={compareDialog} onClose={() => setCompareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Compare Scenarios</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Selected scenarios for comparison:
          </Typography>
          <Box sx={{ mt: 2 }}>
            {scenarios?.filter(s => selectedScenarios.includes(s.id)).map(scenario => (
              <Chip
                key={scenario.id}
                label={scenario.name}
                sx={{ m: 0.5 }}
                onDelete={() => setSelectedScenarios(prev => prev.filter(id => id !== scenario.id))}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={compareScenarios}
            disabled={selectedScenarios.length < 2}
          >
            Compare
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RfqScenarios;