import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery('dashboard-stats', async () => {
    const [rfqs, approvals] = await Promise.all([
      api.get('/rfqs'),
      api.get('/approvals/my-tasks'),
    ]);
    
    return {
      myRfqs: rfqs.data.filter(r => 
        r.members.some(m => m.userId === user.id && m.isOwner)
      ),
      recentRfqs: rfqs.data.slice(0, 5),
      pendingApprovals: approvals.data.filter(a => a.status === 'PENDING'),
      rfqsByStatus: rfqs.data.reduce((acc, rfq) => {
        acc[rfq.status] = (acc[rfq.status] || 0) + 1;
        return acc;
      }, {}),
    };
  });

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Dashboard</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/rfqs/new')}
        >
          New RFQ
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    My RFQs
                  </Typography>
                  <Typography variant="h3">
                    {stats?.myRfqs.length || 0}
                  </Typography>
                </Box>
                <AssessmentIcon color="primary" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Approvals
                  </Typography>
                  <Typography variant="h3">
                    {stats?.pendingApprovals.length || 0}
                  </Typography>
                </Box>
                <ScheduleIcon color="warning" fontSize="large" />
              </Box>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/approvals')}>
                View All
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    In Planning
                  </Typography>
                  <Typography variant="h3">
                    {stats?.rfqsByStatus.IN_PLANNING || 0}
                  </Typography>
                </Box>
                <AssessmentIcon color="info" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Awarded
                  </Typography>
                  <Typography variant="h3">
                    {stats?.rfqsByStatus.AWARDED || 0}
                  </Typography>
                </Box>
                <CheckIcon color="success" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent RFQs */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent RFQs
            </Typography>
            {stats?.recentRfqs.map((rfq) => (
              <Box
                key={rfq.id}
                sx={{
                  p: 2,
                  mb: 1,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
                onClick={() => navigate(`/rfqs/${rfq.id}`)}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1">{rfq.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {rfq.customer} • {rfq.startYear}-{rfq.endYear}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Chip
                      label={rfq.status}
                      size="small"
                      color={
                        rfq.status === 'AWARDED' ? 'success' :
                        rfq.status === 'SUBMITTED' ? 'primary' :
                        'default'
                      }
                    />
                    <Typography variant="body2" color="textSecondary">
                      {rfq._count.features} features
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
            {(!stats?.recentRfqs || stats.recentRfqs.length === 0) && (
              <Typography color="textSecondary" align="center" py={2}>
                No RFQs yet
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Pending Approvals */}
        {stats?.pendingApprovals.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Awaiting Your Approval
              </Typography>
              {stats.pendingApprovals.slice(0, 3).map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    backgroundColor: '#fff3e0',
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">
                        {task.decisionPackage.rfq.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {task.type} Approval • {task.decisionPackage.name}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/approvals/${task.id}`)}
                    >
                      Review
                    </Button>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default Dashboard;