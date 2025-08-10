import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Button,
  Paper,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import api from '../services/api';
import CreateRfqDialog from '../components/CreateRfqDialog';

function RfqList() {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    customer: '',
  });

  const { data: rfqs, isLoading, refetch } = useQuery(
    ['rfqs', filters],
    async () => {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v)
      );
      const response = await api.get(`/rfqs?${params}`);
      return response.data;
    }
  );

  const columns = [
    {
      field: 'name',
      headerName: 'RFQ Name',
      flex: 1,
      renderCell: (params) => (
        <Typography
          sx={{
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
          onClick={() => navigate(`/rfqs/${params.row.id}`)}
        >
          {params.value}
        </Typography>
      ),
    },
    { field: 'customer', headerName: 'Customer', flex: 1 },
    {
      field: 'period',
      headerName: 'Period',
      width: 120,
      valueGetter: (params) => `${params.row.startYear}-${params.row.endYear}`,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === 'AWARDED' ? 'success' :
            params.value === 'SUBMITTED' ? 'primary' :
            params.value === 'IN_PLANNING' ? 'info' :
            'default'
          }
        />
      ),
    },
    {
      field: '_count',
      headerName: 'Features',
      width: 100,
      valueGetter: (params) => params.row._count?.features || 0,
    },
    {
      field: 'createdBy',
      headerName: 'Created By',
      width: 150,
      valueGetter: (params) => params.row.createdBy?.name,
    },
    {
      field: 'updatedAt',
      headerName: 'Last Updated',
      width: 150,
      valueGetter: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => navigate(`/rfqs/${params.row.id}`)}
          >
            View
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">RFQs</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New RFQ
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search RFQs..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="NEW">New</MenuItem>
              <MenuItem value="IN_ANALYSIS">In Analysis</MenuItem>
              <MenuItem value="IN_PLANNING">In Planning</MenuItem>
              <MenuItem value="SUBMITTED">Submitted</MenuItem>
              <MenuItem value="AWARDED">Awarded</MenuItem>
              <MenuItem value="NOT_AWARDED">Not Awarded</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder="Customer"
            value={filters.customer}
            onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
            sx={{ minWidth: 200 }}
          />
          <Button
            variant="outlined"
            onClick={() => setFilters({ search: '', status: '', customer: '' })}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rfqs || []}
          columns={columns}
          loading={isLoading}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{
            '& .MuiDataGrid-row:hover': {
              backgroundColor: '#f5f5f5',
            },
          }}
        />
      </Paper>

      <CreateRfqDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => {
          setCreateDialogOpen(false);
          refetch();
        }}
      />
    </Box>
  );
}

export default RfqList;