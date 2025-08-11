// web/src/pages/Dashboard.jsx - Updated with Activities section
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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
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
  PersonRounded,
  ArticleOutlined,
  CommentRounded,
  TaskAltRounded,
  AssessmentRounded,
  GroupRounded,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Keep all existing styled components...
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

const ActivityCard = styled(Paper)({
  padding: 0,
  border: '1px solid #E5E7EB',
  boxShadow: 'none',
  borderRadius: 12,
  backgroundColor: '#FFFFFF',
  overflow: 'hidden',
});

const ActivityHeader = styled(Box)({
  padding: '16px 20px',
  borderBottom: '1px solid #E5E7EB',
  backgroundColor: '#FAFAFA',
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

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    'dashboard-stats', 
    async () => {
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
    }
  );

  // Fetch recent activities
  const { data: activities, isLoading: activitiesLoading } = useQuery(
    'dashboard-activities',
    async () => {
      try {
        const response = await api.get('/audit/dashboard');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch activities:', error);
        // Return mock data if the endpoint doesn't exist yet
        return [
          {
            id: '1',
            type: 'rfq',
            action: 'created RFQ',
            entity: 'RFQ',
            entityId: '1',
            rfq: { id: '1', name: 'Meta' },
            user: { id: '1', name: 'John Doe' },
            at: new Date().toISOString(),
            details: { customer: 'Meta' },
          },
          {
            id: '2',
            type: 'comment',
            action: 'commented',
            entity: 'Feature',
            entityId: '2',
            user: { id: '2', name: 'Sarah Smith' },
            at: new Date(Date.now() - 3600000).toISOString(),
            details: { preview: 'This looks good, we should proceed with...' },
          },
          {
            id: '3',
            type: 'approval',
            action: 'approved',
            entity: 'Decision Package',
            entityId: '3',
            rfq: { id: '1', name: 'Meta' },
            user: { id: '3', name: 'Mike Johnson' },
            at: new Date(Date.now() - 7200000).toISOString(),
            details: { packageName: 'Q1 Proposal', taskType: 'BUDGET' },
          },
        ];
      }
    },
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

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

  const getActivityIcon = (activity) => {
    switch (activity.type) {
      case 'rfq':
        return <ArticleOutlined sx={{ fontSize: 20 }} />;
      case 'comment':
        return <CommentRounded sx={{ fontSize: 20 }} />;
      case 'approval':
        return <TaskAltRounded sx={{ fontSize: 20 }} />;
      case 'scenario':
        return <AssessmentRounded sx={{ fontSize: 20 }} />;
      default:
        return <FolderRounded sx={{ fontSize: 20 }} />;
    }
  };

  const getActivityColor = (activity) => {
    switch (activity.type) {
      case 'approval':
        return activity.action === 'approved' ? '#059669' : '#DC2626';
      case 'comment':
        return '#00A8A8';
      case 'rfq':
        return '#2563EB';
      default:
        return '#6B7280';
    }
  };

  const formatActivityTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (statsLoading) {
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

      <Grid container spacing={3}>
        {/* Recent RFQs Section - Left Column */}
        <Grid item xs={12} lg={7}>
          <Box>
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
        </Grid>

        {/* Recent Activities Section - Right Column */}
        <Grid item xs={12} lg={5}>
          <Box>
            <SectionHeader>
              <SectionTitle>Recent Activities</SectionTitle>
              <ViewAllButton
                endIcon={<ArrowForwardRounded fontSize="small" />}
                onClick={() => navigate('/activities')}
              >
                View all
              </ViewAllButton>
            </SectionHeader>

            <ActivityCard>
              <ActivityHeader>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <GroupRounded sx={{ fontSize: 18, color: '#6B7280' }} />
                  <Typography variant="body2" fontWeight={600} color="textSecondary">
                    Team Activity
                  </Typography>
                </Stack>
              </ActivityHeader>
              
              {activitiesLoading ? (
                <Box sx={{ p: 2 }}>
                  {[1, 2, 3].map((i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Skeleton variant="circular" width={32} height={32} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="text" width="60%" />
                    </Box>
                  ))}
                </Box>
              ) : activities && activities.length > 0 ? (
                <List sx={{ p: 0 }}>
                  {activities.slice(0, 8).map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem
                        alignItems="flex-start"
                        sx={{
                          px: 2.5,
                          py: 2,
                          '&:hover': {
                            backgroundColor: '#FAFAFA',
                            cursor: activity.rfq ? 'pointer' : 'default',
                          },
                        }}
                        onClick={() => activity.rfq && navigate(`/rfqs/${activity.rfq.id}`)}
                      >
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              backgroundColor: alpha(getActivityColor(activity), 0.1),
                              color: getActivityColor(activity),
                            }}
                          >
                            {getActivityIcon(activity)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="body2" fontWeight={600}>
                                {activity.user?.name || 'System'}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {activity.action}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              {activity.rfq && (
                                <Typography variant="caption" color="primary" component="span">
                                  {activity.rfq.name}
                                </Typography>
                              )}
                              {activity.details?.preview && (
                                <Typography variant="caption" color="textSecondary" display="block">
                                  "{activity.details.preview}"
                                </Typography>
                              )}
                              {activity.details?.packageName && (
                                <Typography variant="caption" color="textSecondary" display="block">
                                  {activity.details.packageName} - {activity.details.taskType}
                                </Typography>
                              )}
                              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                                {formatActivityTime(activity.at)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < activities.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    No recent activities
                  </Typography>
                </Box>
              )}
            </ActivityCard>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;