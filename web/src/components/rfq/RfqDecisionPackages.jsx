import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Alert,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Send as SendIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Restore as RecallIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function RfqDecisionPackages({ rfqId }) {
  const { enqueueSnackbar } = useSnackbar();
  const { isManagement } = useAuth();
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [packageName, setPackageName] = useState('');

  const { data: packages, refetch: refetchPackages } = useQuery(
    ['decision-packages', rfqId],
    async () => {
      const response = await api.get(`/decision-packages/rfq/${rfqId}`);
      return response.data;
    }
  );

  const { data: scenarios } = useQuery(
    ['scenarios', rfqId],
    async () => {
      const response = await api.get(`/scenarios/rfq/${rfqId}`);
      return response.data;
    }
  );

  const createPackageMutation = useMutation(
    (data) => api.post('/decision-packages', data),
    {
      onSuccess: () => {
        enqueueSnackbar('Decision package created successfully', { variant: 'success' });
        setCreateDialog(false);
        setSelectedScenarios([]);
        setPackageName('');
        refetchPackages();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to create decision package', { variant: 'error' });
      },
    }
  );

  const submitPackageMutation = useMutation(
    (id) => api.post(`/decision-packages/${id}/submit`),
    {
      onSuccess: () => {
        enqueueSnackbar('Decision package submitted for approval', { variant: 'success' });
        refetchPackages();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to submit package', { variant: 'error' });
      },
    }
  );

  const recallPackageMutation = useMutation(
    (id) => api.post(`/decision-packages/${id}/recall`),
    {
      onSuccess: () => {
        enqueueSnackbar('Decision package recalled', { variant: 'success' });
        refetchPackages();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to recall package', { variant: 'error' });
      },
    }
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'SUBMITTED': return 'primary';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  const getApprovalSteps = (pkg) => {
    const steps = [];
    const techTasks = pkg.approvalTasks?.filter(t => t.type === 'TECH') || [];
    const budgetTasks = pkg.approvalTasks?.filter(t => t.type === 'BUDGET') || [];
    const overallTasks = pkg.approvalTasks?.filter(t => t.type === 'OVERALL') || [];

    if (techTasks.length > 0) {
      const allApproved = techTasks.every(t => t.status === 'APPROVED');
      const anyRejected = techTasks.some(t => t.status === 'REJECTED');
      steps.push({
        label: 'Technical Review',
        status: anyRejected ? 'REJECTED' : allApproved ? 'APPROVED' : 'PENDING',
        tasks: techTasks,
      });
    }

    if (budgetTasks.length > 0) {
      const allApproved = budgetTasks.every(t => t.status === 'APPROVED');
      const anyRejected = budgetTasks.some(t => t.status === 'REJECTED');
      steps.push({
        label: 'Budget Approval',
        status: anyRejected ? 'REJECTED' : allApproved ? 'APPROVED' : 'PENDING',
        tasks: budgetTasks,
      });
    }

    if (overallTasks.length > 0) {
      const allApproved = overallTasks.every(t => t.status === 'APPROVED');
      const anyRejected = overallTasks.some(t => t.status === 'REJECTED');
      steps.push({
        label: 'Overall Approval',
        status: anyRejected ? 'REJECTED' : allApproved ? 'APPROVED' : 'PENDING',
        tasks: overallTasks,
      });
    }

    return steps;
  };

  const PackageCard = ({ pkg }) => {
    const approvalSteps = getApprovalSteps(pkg);
    
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h6">
                {pkg.name} (v{pkg.version})
              </Typography>
              <Chip
                label={pkg.status}
                size="small"
                color={getStatusColor(pkg.status)}
                sx={{ mt: 1 }}
              />
            </Box>
            <Typography variant="body2" color="textSecondary">
              Created: {new Date(pkg.createdAt).toLocaleDateString()}
            </Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Scenarios ({pkg.scenarios?.length || 0}):
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {pkg.scenarios?.map(ps => (
                <Chip
                  key={ps.id}
                  label={ps.scenario.name}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>

          {approvalSteps.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Approval Progress:
              </Typography>
              <Timeline sx={{ p: 0, m: 0 }}>
                {approvalSteps.map((step, index) => (
                  <TimelineItem key={index} sx={{ minHeight: 40 }}>
                    <TimelineSeparator>
                      <TimelineDot
                        color={
                          step.status === 'APPROVED' ? 'success' :
                          step.status === 'REJECTED' ? 'error' :
                          'grey'
                        }
                      >
                        {step.status === 'APPROVED' && <ApproveIcon fontSize="small" />}
                        {step.status === 'REJECTED' && <RejectIcon fontSize="small" />}
                      </TimelineDot>
                      {index < approvalSteps.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="body2">{step.label}</Typography>
                      {step.tasks.map(task => (
                        <Typography key={task.id} variant="caption" color="textSecondary">
                          {task.assignedTo?.name || 'Unassigned'}: {task.status}
                        </Typography>
                      ))}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </Box>
          )}
        </CardContent>
        <CardActions>
          {pkg.status === 'DRAFT' && isManagement() && (
            <Button
              size="small"
              startIcon={<SendIcon />}
              onClick={() => submitPackageMutation.mutate(pkg.id)}
            >
              Submit for Approval
            </Button>
          )}
          {pkg.status === 'SUBMITTED' && isManagement() && (
            <Button
              size="small"
              startIcon={<RecallIcon />}
              onClick={() => recallPackageMutation.mutate(pkg.id)}
            >
              Recall
            </Button>
          )}
          <Button
            size="small"
            startIcon={<AssessmentIcon />}
            onClick={async () => {
              const response = await api.get(`/exports/executive-pdf/${rfqId}/${pkg.id}`, {
                responseType: 'blob',
              });
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `executive-summary-${pkg.name}.pdf`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}
          >
            Generate Executive PDF
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Decision Packages</Typography>
        {isManagement() && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialog(true)}
            disabled={!scenarios || scenarios.length === 0}
          >
            Create Package
          </Button>
        )}
      </Box>

      {!isManagement() && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Only management roles can create and submit decision packages.
        </Alert>
      )}

      {packages?.map(pkg => (
        <PackageCard key={pkg.id} pkg={pkg} />
      ))}

      {packages?.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No decision packages created yet.
          </Typography>
        </Paper>
      )}

      {/* Create Package Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Decision Package</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Package Name"
            margin="normal"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="e.g., Q1 2026 Proposal"
          />
          
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Select Scenarios to Include:
          </Typography>
          <List>
            {scenarios?.map(scenario => (
              <ListItem key={scenario.id} dense>
                <Checkbox
                  checked={selectedScenarios.includes(scenario.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedScenarios([...selectedScenarios, scenario.id]);
                    } else {
                      setSelectedScenarios(selectedScenarios.filter(id => id !== scenario.id));
                    }
                  }}
                />
                <ListItemText
                  primary={scenario.name}
                  secondary={`${scenario.type} ${scenario.useCase ? `- ${scenario.useCase}` : ''}`}
                />
              </ListItem>
            ))}
          </List>

          <Alert severity="info" sx={{ mt: 2 }}>
            You can submit the package for approval immediately or save it as a draft.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              createPackageMutation.mutate({
                rfqId,
                name: packageName,
                scenarioIds: selectedScenarios,
                submit: false,
              });
            }}
            disabled={!packageName || selectedScenarios.length === 0}
          >
            Save as Draft
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              createPackageMutation.mutate({
                rfqId,
                name: packageName,
                scenarioIds: selectedScenarios,
                submit: true,
              });
            }}
            disabled={!packageName || selectedScenarios.length === 0}
          >
            Create & Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RfqDecisionPackages;