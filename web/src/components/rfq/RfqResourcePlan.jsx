import React, { useState, useMemo } from 'react';
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
  Chip,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

function RfqResourcePlan({ rfqId }) {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [profileDialog, setProfileDialog] = useState({ open: false, profile: null });
  const [allocationDialog, setAllocationDialog] = useState({ open: false, profile: null });
  const [importDialog, setImportDialog] = useState(false);

  // Fix: Query features and extract items from paginated response
  const { data: featuresResponse } = useQuery(['features', rfqId], async () => {
    const response = await api.get(`/features/rfq/${rfqId}`);
    return response.data;
  });
  
  // Extract the items array, handling both paginated and non-paginated responses
  const features = useMemo(() => {
    if (!featuresResponse) return [];
    // Check if it's a paginated response
    if (featuresResponse.items && Array.isArray(featuresResponse.items)) {
      return featuresResponse.items;
    }
    // If it's already an array, use it directly
    if (Array.isArray(featuresResponse)) {
      return featuresResponse;
    }
    return [];
  }, [featuresResponse]);

  // Fix: Query profile plans using the correct endpoint
  const { data: profilePlansResponse, refetch } = useQuery(['profile-plans', rfqId], async () => {
    const response = await api.get(`/profile-plans/rfq/${rfqId}`);
    return response.data;
  });

  // Extract the items array for profile plans
  const profilePlans = useMemo(() => {
    if (!profilePlansResponse) return [];
    // Check if it's a paginated response
    if (profilePlansResponse.items && Array.isArray(profilePlansResponse.items)) {
      return profilePlansResponse.items;
    }
    // If it's already an array, use it directly
    if (Array.isArray(profilePlansResponse)) {
      return profilePlansResponse;
    }
    return [];
  }, [profilePlansResponse]);

  const createProfileMutation = useMutation(
    (data) => api.post('/profile-plans', data),
    {
      onSuccess: () => {
        enqueueSnackbar('Profile plan created successfully', { variant: 'success' });
        setProfileDialog({ open: false, profile: null });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to create profile plan', { variant: 'error' });
      },
    }
  );

  const updateAllocationsMutation = useMutation(
    ({ profileId, allocations }) => api.post(`/allocations/profile/${profileId}/bulk`, { allocations }),
    {
      onSuccess: () => {
        enqueueSnackbar('Allocations updated successfully', { variant: 'success' });
        setAllocationDialog({ open: false, profile: null });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to update allocations', { variant: 'error' });
      },
    }
  );

  const deleteProfileMutation = useMutation(
    (id) => api.delete(`/profile-plans/${id}`),
    {
      onSuccess: () => {
        enqueueSnackbar('Profile plan deleted successfully', { variant: 'success' });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to delete profile plan', { variant: 'error' });
      },
    }
  );

  const handleExport = async () => {
    try {
      const response = await api.get(`/exports/yearly-plan/${rfqId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'resource-plan.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      enqueueSnackbar('Failed to export resource plan', { variant: 'error' });
    }
  };

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/imports/resource-plan/${rfqId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (response.data.success) {
        enqueueSnackbar(`Imported ${response.data.imported} allocations successfully`, { variant: 'success' });
        refetch();
      } else {
        enqueueSnackbar('Import failed. Check the file format.', { variant: 'error' });
        console.error(response.data.errors);
      }
    } catch (error) {
      enqueueSnackbar('Failed to import file', { variant: 'error' });
    }
    
    setImportDialog(false);
  };

  // Group profile plans by feature
  const profilePlansByFeature = useMemo(() => {
    if (!profilePlans || profilePlans.length === 0) return {};
    return profilePlans.reduce((acc, profile) => {
      if (!acc[profile.featureId]) {
        acc[profile.featureId] = [];
      }
      acc[profile.featureId].push(profile);
      return acc;
    }, {});
  }, [profilePlans]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Resource Plan</Typography>
        <Box display="flex" gap={1}>
          <Button startIcon={<UploadIcon />} onClick={() => setImportDialog(true)}>
            Import
          </Button>
          <Button startIcon={<DownloadIcon />} onClick={handleExport}>
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setProfileDialog({ open: true, profile: null })}
            disabled={!features || features.length === 0}
          >
            Add Profile
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Table View" />
          <Tab label="Timeline View" />
          <Tab label="Summary" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Box>
          {!features || features.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="textSecondary">
                No features added yet. Add features first to create resource plans.
              </Typography>
            </Paper>
          ) : (
            features.map((feature) => (
              <Paper key={feature.id} sx={{ mb: 2, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {feature.name}
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Role</TableCell>
                        <TableCell>Level</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Jan</TableCell>
                        <TableCell>Feb</TableCell>
                        <TableCell>Mar</TableCell>
                        <TableCell>Apr</TableCell>
                        <TableCell>May</TableCell>
                        <TableCell>Jun</TableCell>
                        <TableCell>Jul</TableCell>
                        <TableCell>Aug</TableCell>
                        <TableCell>Sep</TableCell>
                        <TableCell>Oct</TableCell>
                        <TableCell>Nov</TableCell>
                        <TableCell>Dec</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profilePlansByFeature[feature.id]?.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell>{profile.role}</TableCell>
                          <TableCell>{profile.level}</TableCell>
                          <TableCell>
                            <Chip label={profile.location} size="small" />
                          </TableCell>
                          {[...Array(12)].map((_, month) => {
                            const allocation = profile.monthlyAllocations?.find(
                              a => a.month === month + 1
                            );
                            return (
                              <TableCell key={month}>
                                {allocation ? parseFloat(allocation.fte).toFixed(1) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => setAllocationDialog({ open: true, profile })}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => deleteProfileMutation.mutate(profile.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!profilePlansByFeature[feature.id] || profilePlansByFeature[feature.id].length === 0) && (
                        <TableRow>
                          <TableCell colSpan={17} align="center">
                            <Typography variant="body2" color="textSecondary">
                              No resource profiles for this feature
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ))
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography color="textSecondary">Timeline view coming soon...</Typography>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Resource Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="textSecondary">
                Total Profiles
              </Typography>
              <Typography variant="h4">{profilePlans?.length || 0}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="textSecondary">
                Total FTE (Average)
              </Typography>
              <Typography variant="h4">
                {profilePlans?.reduce((sum, p) => {
                  const avgFte = p.monthlyAllocations?.reduce((s, a) => s + parseFloat(a.fte || 0), 0) / 
                                (p.monthlyAllocations?.length || 1);
                  return sum + (avgFte || 0);
                }, 0).toFixed(1) || 0}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" color="textSecondary">
                Cost Centers
              </Typography>
              <Box display="flex" gap={1} mt={1}>
                <Chip label={`BCC: ${profilePlans?.filter(p => p.location === 'BCC').length || 0}`} />
                <Chip label={`HCC: ${profilePlans?.filter(p => p.location === 'HCC').length || 0}`} />
                <Chip label={`MCC: ${profilePlans?.filter(p => p.location === 'MCC').length || 0}`} />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Create Profile Dialog */}
      <Dialog open={profileDialog.open} onClose={() => setProfileDialog({ open: false, profile: null })} maxWidth="sm" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            createProfileMutation.mutate({
              rfqId,
              featureId: formData.get('featureId'),
              role: formData.get('role'),
              level: formData.get('level'),
              location: formData.get('location'),
              notes: formData.get('notes'),
            });
          }}
        >
          <DialogTitle>Add Resource Profile</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              select
              name="featureId"
              label="Feature"
              margin="normal"
              required
            >
              {features?.map(f => (
                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              name="role"
              label="Role"
              margin="normal"
              required
              placeholder="e.g., Developer, Tester, Project Leader"
            />
            <TextField
              fullWidth
              name="level"
              label="Level"
              margin="normal"
              required
              placeholder="e.g., Junior, Senior, Principal"
            />
            <TextField
              fullWidth
              select
              name="location"
              label="Location/Cost Center"
              margin="normal"
              required
            >
              <MenuItem value="BCC">BCC</MenuItem>
              <MenuItem value="HCC">HCC</MenuItem>
              <MenuItem value="MCC">MCC</MenuItem>
            </TextField>
            <TextField
              fullWidth
              name="notes"
              label="Notes"
              margin="normal"
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProfileDialog({ open: false, profile: null })}>Cancel</Button>
            <Button type="submit" variant="contained">Create</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Import Dialog - Rest of the component remains the same */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Resource Plan</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Upload an Excel file with resource allocations. Download the template for the correct format.
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            sx={{ mt: 2 }}
            onClick={async () => {
              const response = await api.get('/imports/templates/resource-plan', {
                responseType: 'blob',
              });
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'resource-plan-template.xlsx');
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}
          >
            Download Template
          </Button>
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

export default RfqResourcePlan;