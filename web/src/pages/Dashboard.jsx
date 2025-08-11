// web/src/pages/Dashboard.jsx - Perfectly aligned dashboard
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Grid,
  Card,
  Typography,
  Button,
  Chip,
  Stack,
  IconButton,
  Skeleton,
  Paper,
} from '@mui/material';
import {
  AddRounded,
  ArrowForwardRounded,
  TrendingUpRounded,
  AccessTimeRounded,
  CheckCircleRounded,
  FolderRounded,
  ArrowUpwardRounded,
  ArrowDownwardRounded,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Styled Components with precise alignment
const PageHeader = styled(Box)({
  marginBottom: 32,
});

const StatsCard = styled(Card)({
  padding: 24,
  border: '1px solid #E5E7EB',
  boxShadow: 'none',
  borderRadius: 12,
  transition: 'all 0.15s ease',
  backgroundColor: '#FFFFFF',
  cursor: 'pointer',
  '&:hover': {
    borderColor: '#CBD5E1',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
});

const MetricLabel = styled(Typography)({
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 8,
});

const MetricValue = styled(Typography)({
  fontSize: '2rem',
  fontWeight: 700,
  lineHeight: 1,
  color: '#222222',
});

const SectionHeader = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
});

const SectionTitle = styled(Typography)({
  fontSize: '1.125rem',
  fontWeight: 600,
  color: '#222222',
});

const RfqCard = styled(Paper)({
  padding: 20,
  border: '1px solid #E5E7EB',
  boxShadow: 'none',
  borderRadius: 8,
  transition: 'all 0.15s ease',
  cursor: 'pointer',
  backgroundColor: '#FFFFFF',
  '&:hover': {
    borderColor: '#CBD5E1',
    backgroundColor: '#FAFAFA',
  },
});

const EmptyState = styled(Box)({
  padding: 48,
  textAlign: 'center',
  backgroundColor: '#F9FAFB',
  borderRadius: 12,
  border: '1px dashed #E5E7EB',
});

const StatusChip = styled(Chip)(({ status }) => {
  const colors = {
    'NEW': { bg: '#F3F4F6', color: '#4B5563' },
    'IN_ANALYSIS': { bg: '#FEF3C7', color: '#D97706' },
    'IN_PLANNING': { bg: '#DBEAFE', color: '#2563EB' },
    'SUBMITTED': { bg: '#E0F2F1', color: '#00A8A8' },
    'AWARDED': { bg: '#D1FAE5', color: '#059669' },
    'NOT_AWARDED': { bg: '#FEE2E2', color: '#DC2626' },
  };
  
  const style = colors[status] || colors['NEW'];
  
  return {
    backgroundColor: style.bg,
    color: style.color,
    border: 'none',
    fontWeight: 600,
    fontSize: '0.75rem',
    height: 24,
  };
});

const ViewAllButton = styled(Button)({
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.875rem',
  color: '#00A8A8',
  '&:hover': {
    backgroundColor: 'transparent',
    textDecoration: 'underline',
  },
});

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
        r.members?.some(m => m.userId === user.id && m.isOwner)
      ),
      recentRfqs: rfqs.data.slice(0, 5),
      pendingApprovals: approvals.data.filter(a => a.status === 'PENDING'),
      totalRfqs: rfqs.data.length,
      rfqsByStatus: rfqs.data.reduce((acc, rfq) => {
        acc[rfq.status] = (acc[rfq.status] || 0) + 1;
        return acc;
      }, {}),
    };
  });

  const metrics = [
    {
      label: 'My RFQs',
      value: stats?.myRfqs.length || 0,
      icon: <FolderRounded sx={{ fontSize: 20 }} />,
      iconBg: '#F3F4F6',
      iconColor: '#6B7280',
      trend: null,
    },
    {
      label: 'Pending Approvals',
      value: stats?.pendingApprovals.length || 0,
      icon: <AccessTimeRounded sx={{ fontSize: 20 }} />,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      trend: null,
      action: '/approvals',
    },
    {
      label: 'In Planning',
      value: stats?.rfqsByStatus?.IN_PLANNING || 0,
      icon: <TrendingUpRounded sx={{ fontSize: 20 }} />,
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Awarded',
      value: stats?.rfqsByStatus?.AWARDED || 0,
      icon: <CheckCircleRounded sx={{ fontSize: 20 }} />,
      iconBg: '#D1FAE5',
      iconColor: '#059669',
      trend: '+5%',
      trendUp: true,
    },
  ];

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={200} height={24} sx={{ mb: 4 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} lg={3} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2, mt: 4 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <PageHeader>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
              Welcome back, {user?.name?.split(' ')[0]}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Here's what's happening with your RFQs today
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => navigate('/rfqs/new')}
            sx={{
              backgroundColor: '#222222',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#000000',
              },
            }}
          >
            New RFQ
          </Button>
        </Stack>
      </PageHeader>

      {/* Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metrics.map((metric) => (
          <Grid item xs={12} sm={6} lg={3} key={metric.label}>
            <StatsCard onClick={() => metric.action && navigate(metric.action)}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <MetricLabel>{metric.label}</MetricLabel>
                  <MetricValue>{metric.value}</MetricValue>
                  {metric.trend && (
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5 }}>
                      {metric.trendUp ? (
                        <ArrowUpwardRounded sx={{ fontSize: 16, color: '#059669' }} />
                      ) : (
                        <ArrowDownwardRounded sx={{ fontSize: 16, color: '#DC2626' }} />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          color: metric.trendUp ? '#059669' : '#DC2626',
                          fontWeight: 600,
                        }}
                      >
                        {metric.trend}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        vs last month
                      </Typography>
                    </Stack>
                  )}
                  {metric.action && metric.value > 0 && (
                    <ViewAllButton
                      size="small"
                      endIcon={<ArrowForwardRounded fontSize="small" />}
                      sx={{ mt: 1.5, ml: -1 }}
                    >
                      View all
                    </ViewAllButton>
                  )}
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    backgroundColor: metric.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: metric.iconColor,
                  }}
                >
                  {metric.icon}
                </Box>
              </Stack>
            </StatsCard>
          </Grid>
        ))}
      </Grid>

      {/* Recent RFQs Section */}
      <Box sx={{ mb: 4 }}>
        <SectionHeader>
          <SectionTitle>Recent RFQs</SectionTitle>
          <ViewAllButton
            endIcon={<ArrowForwardRounded fontSize="small" />}
            onClick={() => navigate('/rfqs')}
          >
            View all
          </ViewAllButton>
        </SectionHeader>

        {stats?.recentRfqs?.length > 0 ? (
          <Stack spacing={2}>
            {stats.recentRfqs.map((rfq) => (
              <RfqCard key={rfq.id} onClick={() => navigate(`/rfqs/${rfq.id}`)}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {rfq.name}
                      </Typography>
                      <StatusChip
                        label={rfq.status.replace(/_/g, ' ')}
                        size="small"
                        status={rfq.status}
                      />
                    </Stack>
                    <Stack direction="row" spacing={3}>
                      <Typography variant="caption" color="textSecondary">
                        {rfq.customer}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        •
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {rfq.startYear} - {rfq.endYear}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        •
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {rfq._count?.features || 0} features
                      </Typography>
                    </Stack>
                  </Box>
                  <IconButton size="small" sx={{ color: '#9CA3AF' }}>
                    <ArrowForwardRounded />
                  </IconButton>
                </Stack>
              </RfqCard>
            ))}
          </Stack>
        ) : (
          <EmptyState>
            <FolderRounded sx={{ fontSize: 48, color: '#E5E7EB', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No RFQs yet
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Create your first RFQ to get started with the system
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => navigate('/rfqs/new')}
              sx={{
                backgroundColor: '#00A8A8',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#008585',
                },
              }}
            >
              Create your first RFQ
            </Button>
          </EmptyState>
        )}
      </Box>

      {/* Pending Approvals Section */}
      {stats?.pendingApprovals?.length > 0 && (
        <Box>
          <SectionHeader>
            <SectionTitle>Awaiting Your Approval</SectionTitle>
            <ViewAllButton
              endIcon={<ArrowForwardRounded fontSize="small" />}
              onClick={() => navigate('/approvals')}
            >
              View all
            </ViewAllButton>
          </SectionHeader>

          <Stack spacing={2}>
            {stats.pendingApprovals.slice(0, 3).map((task) => (
              <RfqCard
                key={task.id}
                sx={{
                  borderColor: '#00A8A8',
                  backgroundColor: alpha('#00A8A8', 0.02),
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      {task.decisionPackage?.rfq?.name}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Typography variant="caption" color="textSecondary">
                        {task.type} Approval
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        •
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {task.decisionPackage?.name}
                      </Typography>
                    </Stack>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/approvals');
                    }}
                    sx={{
                      borderColor: '#00A8A8',
                      color: '#00A8A8',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#008585',
                        backgroundColor: alpha('#00A8A8', 0.04),
                      },
                    }}
                  >
                    Review
                  </Button>
                </Stack>
              </RfqCard>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

export default Dashboard;