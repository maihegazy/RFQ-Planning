import React, { useState } from 'react';
import { useMutation } from 'react-query';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  MenuItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function RfqOverview({ rfq, onUpdate }) {
  const { enqueueSnackbar } = useSnackbar();
  const { isManagement } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [memberDialog, setMemberDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const updateMutation = useMutation(
    (data) => api.put(`/rfqs/${rfq.id}`, data),
    {
      onSuccess: () => {
        enqueueSnackbar('RFQ updated successfully', { variant: 'success' });
        setEditing(false);
        onUpdate();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to update RFQ', { variant: 'error' });
      },
    }
  );

  const addMemberMutation = useMutation(
    (data) => api.post(`/rfqs/${rfq.id}/members`, data),
    {
      onSuccess: () => {
        enqueueSnackbar('Member added successfully', { variant: 'success' });
        setMemberDialog(false);
        setSelectedUser(null);
        onUpdate();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to add member', { variant: 'error' });
      },
    }
  );

  const removeMemberMutation = useMutation(
    (userId) => api.delete(`/rfqs/${rfq.id}/members/${userId}`),
    {
      onSuccess: () => {
        enqueueSnackbar('Member removed successfully', { variant: 'success' });
        onUpdate();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to remove member', { variant: 'error' });
      },
    }
  );

  const handleEdit = () => {
    setEditData({
      name: rfq.name,
      customer: rfq.customer,
      description: rfq.description,
      status: rfq.status,
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({});
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">RFQ Details</Typography>
            {isManagement() && (
              <>
                {!editing ? (
                  <IconButton onClick={handleEdit}>
                    <EditIcon />
                  </IconButton>
                ) : (
                  <Box>
                    <IconButton onClick={handleSave} color="primary">
                      <SaveIcon />
                    </IconButton>
                    <IconButton onClick={handleCancel}>
                      <CancelIcon />
                    </IconButton>
                  </Box>
                )}
              </>
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              {editing ? (
                <TextField
                  fullWidth
                  label="RFQ Name"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              ) : (
                <>
                  <Typography variant="subtitle2" color="textSecondary">
                    RFQ Name
                  </Typography>
                  <Typography variant="body1">{rfq.name}</Typography>
                </>
              )}
            </Grid>

            <Grid item xs={12} sm={6}>
              {editing ? (
                <TextField
                  fullWidth
                  label="Customer"
                  value={editData.customer}
                  onChange={(e) => setEditData({ ...editData, customer: e.target.value })}
                />
              ) : (
                <>
                  <Typography variant="subtitle2" color="textSecondary">
                    Customer
                  </Typography>
                  <Typography variant="body1">{rfq.customer}</Typography>
                </>
              )}
            </Grid>

            <Grid item xs={12} sm={6}>
              {editing ? (
                <TextField
                  fullWidth
                  select
                  label="Status"
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                >
                  <MenuItem value="NEW">New</MenuItem>
                  <MenuItem value="IN_ANALYSIS">In Analysis</MenuItem>
                  <MenuItem value="IN_PLANNING">In Planning</MenuItem>
                  <MenuItem value="SUBMITTED">Submitted</MenuItem>
                  <MenuItem value="AWARDED">Awarded</MenuItem>
                  <MenuItem value="NOT_AWARDED">Not Awarded</MenuItem>
                </TextField>
              ) : (
                <>
                  <Typography variant="subtitle2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip
                    label={rfq.status}
                    color={
                      rfq.status === 'AWARDED' ? 'success' :
                      rfq.status === 'SUBMITTED' ? 'primary' :
                      'default'
                    }
                  />
                </>
              )}
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Timeline
              </Typography>
              <Typography variant="body1">
                {rfq.startMonth}/{rfq.startYear} - {rfq.endMonth}/{rfq.endYear}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Currency
              </Typography>
              <Typography variant="body1">{rfq.currency}</Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                Approval Policy
              </Typography>
              <Typography variant="body1">
                {rfq.policy === 'PARALLEL_TECH_BUDGET_OVERALL' 
                  ? 'Parallel Technical + Budget with Overall Approval'
                  : 'Simple'}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              {editing ? (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                />
              ) : (
                <>
                  <Typography variant="subtitle2" color="textSecondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {rfq.description || 'No description provided'}
                  </Typography>
                </>
              )}
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Statistics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="primary">
                {rfq._count?.features || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Features
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="primary">
                {rfq._count?.profilePlans || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Resource Profiles
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="primary">
                {rfq._count?.scenarios || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Scenarios
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h4" color="primary">
                {rfq._count?.comments || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Comments
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Team Members</Typography>
            {isManagement() && (
              <IconButton onClick={() => setMemberDialog(true)}>
                <PersonAddIcon />
              </IconButton>
            )}
          </Box>
          <List>
            {rfq.members?.map((member) => (
              <ListItem key={member.id}>
                <ListItemText
                  primary={member.user.name}
                  secondary={
                    <Box>
                      <Typography variant="body2">{member.user.email}</Typography>
                      <Box display="flex" gap={0.5} mt={0.5}>
                        <Chip label={member.user.role} size="small" />
                        {member.isOwner && <Chip label="Owner" size="small" color="primary" />}
                        {member.isTechReviewer && <Chip label="Tech Reviewer" size="small" color="info" />}
                      </Box>
                    </Box>
                  }
                />
                {isManagement() && !member.isOwner && (
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => removeMemberMutation.mutate(member.userId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Created By
          </Typography>
          <Typography variant="body1">{rfq.createdBy?.name}</Typography>
          <Typography variant="body2" color="textSecondary">
            {rfq.createdBy?.email}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Created: {new Date(rfq.createdAt).toLocaleDateString()}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Updated: {new Date(rfq.updatedAt).toLocaleDateString()}
          </Typography>
        </Paper>
      </Grid>

      {/* Add Member Dialog */}
      <Dialog open={memberDialog} onClose={() => setMemberDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Team Member</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Add a user to this RFQ team. They will be able to view and edit the RFQ.
          </Typography>
          {/* In a real implementation, you would fetch users list here */}
          <TextField
            fullWidth
            label="User Email"
            placeholder="Enter user email or ID"
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => addMemberMutation.mutate({ userId: selectedUser })}
            disabled={!selectedUser}
          >
            Add Member
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

export default RfqOverview;