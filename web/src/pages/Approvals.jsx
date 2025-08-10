import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Assignment as AssignIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Approvals() {
  const { enqueueSnackbar } = useSnackbar();
  const { isManagement } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [decisionDialog, setDecisionDialog] = useState({ open: false, task: null, type: null });
  const [comment, setComment] = useState('');

  const { data: myTasks, refetch: refetchMyTasks } = useQuery(
    'my-approval-tasks',
    async () => {
      const response = await api.get('/approvals/my-tasks');
      return response.data;
    }
  );

  const { data: availableTasks, refetch: refetchAvailable } = useQuery(
    'available-approval-tasks',
    async () => {
      const response = await api.get('/approvals/available');
      return response.data;
    },
    { enabled: isManagement() }
  );

  const claimMutation = useMutation(
    (taskId) => api.post(`/approvals/${taskId}/claim`),
    {
      onSuccess: () => {
        enqueueSnackbar('Task claimed successfully', { variant: 'success' });
        refetchMyTasks();
        refetchAvailable();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to claim task', { variant: 'error' });
      },
    }
  );

  const decisionMutation = useMutation(
    ({ taskId, decision, comment }) => 
      api.post(`/approvals/${taskId}/${decision}`, { decision: decision.toUpperCase(), comment }),
    {
      onSuccess: () => {
        enqueueSnackbar('Decision recorded successfully', { variant: 'success' });
        setDecisionDialog({ open: false, task: null, type: null });
        setComment('');
        refetchMyTasks();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to record decision', { variant: 'error' });
      },
    }
  );

  const handleDecision = () => {
    if (!comment.trim()) {
      enqueueSnackbar('Please provide a comment', { variant: 'error' });
      return;
    }

    decisionMutation.mutate({
      taskId: decisionDialog.task.id,
      decision: decisionDialog.type,
      comment,
    });
  };

  const TaskCard = ({ task, showClaim = false }) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">
              {task.decisionPackage.rfq.name}
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              {task.decisionPackage.name} (v{task.decisionPackage.version})
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <Chip
                label={task.type}
                size="small"
                color={
                  task.type === 'TECH' ? 'info' :
                  task.type === 'BUDGET' ? 'warning' :
                  'primary'
                }
              />
              <Chip
                label={task.status}
                size="small"
                color={
                  task.status === 'APPROVED' ? 'success' :
                  task.status === 'REJECTED' ? 'error' :
                  'default'
                }
              />
            </Box>
          </Box>
          {task.dueDate && (
            <Typography variant="body2" color="textSecondary">
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      </CardContent>
      <CardActions>
        {showClaim ? (
          <Button
            startIcon={<AssignIcon />}
            onClick={() => claimMutation.mutate(task.id)}
            disabled={claimMutation.isLoading}
          >
            Claim Task
          </Button>
        ) : task.status === 'PENDING' ? (
          <>
            <Button
              startIcon={<ApproveIcon />}
              color="success"
              onClick={() => setDecisionDialog({ open: true, task, type: 'approve' })}
            >
              Approve
            </Button>
            <Button
              startIcon={<RejectIcon />}
              color="error"
              onClick={() => setDecisionDialog({ open: true, task, type: 'reject' })}
            >
              Reject
            </Button>
          </>
        ) : (
          <Box sx={{ p: 1 }}>
            <Typography variant="body2">
              Decided by: {task.decidedBy?.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {new Date(task.decidedAt).toLocaleString()}
            </Typography>
            {task.decisionComment && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Comment: {task.decisionComment}
              </Typography>
            )}
          </Box>
        )}
      </CardActions>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Approvals
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label={`My Tasks (${myTasks?.filter(t => t.status === 'PENDING').length || 0})`} />
          {isManagement() && (
            <Tab label={`Available (${availableTasks?.length || 0})`} />
          )}
          <Tab label="Completed" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <>
            {myTasks?.filter(t => t.status === 'PENDING').length === 0 ? (
              <Alert severity="info">No pending approval tasks</Alert>
            ) : (
              myTasks
                ?.filter(t => t.status === 'PENDING')
                .map(task => <TaskCard key={task.id} task={task} />)
            )}
          </>
        )}

        {activeTab === 1 && isManagement() && (
          <>
            {availableTasks?.length === 0 ? (
              <Alert severity="info">No available tasks to claim</Alert>
            ) : (
              availableTasks?.map(task => (
                <TaskCard key={task.id} task={task} showClaim />
              ))
            )}
          </>
        )}

        {activeTab === 2 && (
          <>
            {myTasks?.filter(t => t.status !== 'PENDING').length === 0 ? (
              <Alert severity="info">No completed tasks</Alert>
            ) : (
              myTasks
                ?.filter(t => t.status !== 'PENDING')
                .map(task => <TaskCard key={task.id} task={task} />)
            )}
          </>
        )}
      </Box>

      <Dialog
        open={decisionDialog.open}
        onClose={() => setDecisionDialog({ open: false, task: null, type: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {decisionDialog.type === 'approve' ? 'Approve' : 'Reject'} Task
        </DialogTitle>
        <DialogContent>
          {decisionDialog.task && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                {decisionDialog.task.decisionPackage.rfq.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {decisionDialog.task.type} Approval
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comment (Required)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Please provide a reason for your decision..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecisionDialog({ open: false, task: null, type: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={decisionDialog.type === 'approve' ? 'success' : 'error'}
            onClick={handleDecision}
            disabled={!comment.trim() || decisionMutation.isLoading}
          >
            Confirm {decisionDialog.type === 'approve' ? 'Approval' : 'Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Approvals;