import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const ROLES = [
  'ADMIN',
  'DELIVERY_MANAGER',
  'GENERAL_MANAGER',
  'ENGINEERING_MANAGER',
  'PROJECT_LEADER',
  'TEAM_LEADER',
  'TECHNICAL_LEADER',
  'TECHNICAL_REVIEWER',
];

function Users() {
  const { enqueueSnackbar } = useSnackbar();
  const [inviteDialog, setInviteDialog] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, user: null });
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    role: 'PROJECT_LEADER',
  });

  const { data: users, refetch } = useQuery('users', async () => {
    const response = await api.get('/users');
    return response.data;
  });

  const inviteMutation = useMutation(
    (data) => api.post('/auth/invite', data),
    {
      onSuccess: () => {
        enqueueSnackbar('Invitation sent successfully', { variant: 'success' });
        setInviteDialog(false);
        setInviteData({ email: '', name: '', role: 'PROJECT_LEADER' });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to send invitation', { variant: 'error' });
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => api.put(`/users/${id}`, data),
    {
      onSuccess: () => {
        enqueueSnackbar('User updated successfully', { variant: 'success' });
        setEditDialog({ open: false, user: null });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to update user', { variant: 'error' });
      },
    }
  );

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    {
      field: 'role',
      headerName: 'Role',
      width: 180,
      renderCell: (params) => (
        <Chip label={params.value} size="small" />
      ),
    },
    {
      field: 'active',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
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
            onClick={() => setEditDialog({ open: true, user: params.row })}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => setInviteDialog(true)}
        >
          Invite User
        </Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={users || []}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
        />
      </Paper>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite New User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            value={inviteData.email}
            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
          />
          <TextField
            fullWidth
            label="Name"
            margin="normal"
            value={inviteData.name}
            onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
          />
          <TextField
            fullWidth
            select
            label="Role"
            margin="normal"
            value={inviteData.role}
            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
          >
            {ROLES.map(role => (
              <MenuItem key={role} value={role}>
                {role.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => inviteMutation.mutate(inviteData)}
            disabled={!inviteData.email || !inviteData.name || inviteMutation.isLoading}
          >
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editDialog.user && (
            <>
              <TextField
                fullWidth
                label="Name"
                margin="normal"
                value={editDialog.user.name}
                onChange={(e) =>
                  setEditDialog({
                    ...editDialog,
                    user: { ...editDialog.user, name: e.target.value },
                  })
                }
              />
              <TextField
                fullWidth
                select
                label="Role"
                margin="normal"
                value={editDialog.user.role}
                onChange={(e) =>
                  setEditDialog({
                    ...editDialog,
                    user: { ...editDialog.user, role: e.target.value },
                  })
                }
              >
                {ROLES.map(role => (
                  <MenuItem key={role} value={role}>
                    {role.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={editDialog.user.active}
                    onChange={(e) =>
                      setEditDialog({
                        ...editDialog,
                        user: { ...editDialog.user, active: e.target.checked },
                      })
                    }
                  />
                }
                label="Active"
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, user: null })}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() =>
              updateMutation.mutate({
                id: editDialog.user.id,
                data: {
                  name: editDialog.user.name,
                  role: editDialog.user.role,
                  active: editDialog.user.active,
                },
              })
            }
            disabled={updateMutation.isLoading}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Users;