import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery } from 'react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Box,
  Autocomplete,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

function CreateRfqDialog({ open, onClose, onSuccess }) {
  const { enqueueSnackbar } = useSnackbar();
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      customer: '',
      description: '',
      startYear: new Date().getFullYear(),
      endYear: new Date().getFullYear() + 2,
      startMonth: 1,
      endMonth: 12,
      policy: 'PARALLEL_TECH_BUDGET_OVERALL',
      team: [],
    },
  });

  const { data: users } = useQuery('users', async () => {
    const response = await api.get('/users');
    return response.data;
  });

  const createMutation = useMutation(
    (data) => api.post('/rfqs', data),
    {
      onSuccess: () => {
        enqueueSnackbar('RFQ created successfully', { variant: 'success' });
        reset();
        onSuccess();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to create RFQ', { variant: 'error' });
      },
    }
  );

  const onSubmit = (data) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New RFQ</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'RFQ name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="RFQ Name"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="customer"
                control={control}
                rules={{ required: 'Customer is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Customer"
                    fullWidth
                    error={!!errors.customer}
                    helperText={errors.customer?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="startYear"
                control={control}
                rules={{ required: 'Start year is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Start Year"
                    type="number"
                    fullWidth
                    error={!!errors.startYear}
                    helperText={errors.startYear?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="endYear"
                control={control}
                rules={{ required: 'End year is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="End Year"
                    type="number"
                    fullWidth
                    error={!!errors.endYear}
                    helperText={errors.endYear?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="startMonth"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Start Month</InputLabel>
                    <Select {...field} label="Start Month">
                      {[...Array(12)].map((_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Controller
                name="endMonth"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>End Month</InputLabel>
                    <Select {...field} label="End Month">
                      {[...Array(12)].map((_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="policy"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Approval Policy</InputLabel>
                    <Select {...field} label="Approval Policy">
                      <MenuItem value="PARALLEL_TECH_BUDGET_OVERALL">
                        Parallel Tech + Budget with Overall
                      </MenuItem>
                      <MenuItem value="SIMPLE">Simple</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="team"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    multiple
                    options={users || []}
                    getOptionLabel={(option) => option.name}
                    onChange={(_, value) => field.onChange(value.map(v => v.id))}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Team Members"
                        placeholder="Select team members"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option.name}
                          {...getTagProps({ index })}
                          size="small"
                        />
                      ))
                    }
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={createMutation.isLoading}>
            Create RFQ
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default CreateRfqDialog;