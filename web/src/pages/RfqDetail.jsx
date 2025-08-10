import React, { useState } from 'react';
import { useParams, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Chip,
  Button,
  LinearProgress,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Info as InfoIcon,
  Assessment as AnalysisIcon,
  Category as FeaturesIcon,
  People as ResourcesIcon,
  AttachMoney as RatesIcon,
  CompareArrows as ScenariosIcon,
  CheckCircle as ApprovalsIcon,
  Comment as CommentsIcon,
  AttachFile as AttachmentsIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Tab Components
import RfqOverview from '../components/rfq/RfqOverview';
import RfqFeatures from '../components/rfq/RfqFeatures';
import RfqResourcePlan from '../components/rfq/RfqResourcePlan';
import RfqRates from '../components/rfq/RfqRates';
import RfqScenarios from '../components/rfq/RfqScenarios';
import RfqDecisionPackages from '../components/rfq/RfqDecisionPackages';
import RfqComments from '../components/rfq/RfqComments';
import RfqAttachments from '../components/rfq/RfqAttachments';
import RfqExports from '../components/rfq/RfqExports';

function RfqDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasFinancialAccess } = useAuth();

  const { data: rfq, isLoading, refetch } = useQuery(
    ['rfq', id],
    async () => {
      const response = await api.get(`/rfqs/${id}`);
      return response.data;
    }
  );

  const tabs = [
    { value: 'overview', label: 'Overview', icon: <InfoIcon />, path: '' },
    { value: 'features', label: 'Features', icon: <FeaturesIcon />, path: 'features' },
    { value: 'resources', label: 'Resource Plan', icon: <ResourcesIcon />, path: 'resources' },
    ...(hasFinancialAccess() ? [
      { value: 'rates', label: 'Rates', icon: <RatesIcon />, path: 'rates' },
    ] : []),
    { value: 'scenarios', label: 'Scenarios', icon: <ScenariosIcon />, path: 'scenarios' },
    { value: 'packages', label: 'Decision Packages', icon: <ApprovalsIcon />, path: 'packages' },
    { value: 'comments', label: 'Comments', icon: <CommentsIcon />, path: 'comments' },
    { value: 'attachments', label: 'Attachments', icon: <AttachmentsIcon />, path: 'attachments' },
    { value: 'exports', label: 'Exports', icon: <ExportIcon />, path: 'exports' },
  ];

  const currentTab = location.pathname.split('/').pop() || 'overview';
  const activeTab = tabs.find(t => t.path === currentTab)?.value || 'overview';

  if (isLoading) return <LinearProgress />;
  if (!rfq) return <Typography>RFQ not found</Typography>;

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/rfqs');
          }}
        >
          RFQs
        </Link>
        <Typography color="text.primary">{rfq.name}</Typography>
      </Breadcrumbs>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">{rfq.name}</Typography>
          <Box display="flex" gap={1} mt={1}>
            <Typography variant="body1" color="textSecondary">
              {rfq.customer}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              •
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {rfq.startYear}-{rfq.endYear}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              •
            </Typography>
            <Chip
              label={rfq.status}
              size="small"
              color={
                rfq.status === 'AWARDED' ? 'success' :
                rfq.status === 'SUBMITTED' ? 'primary' :
                'default'
              }
            />
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={() => navigate('/rfqs')}>
            Back to List
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, value) => {
            const tab = tabs.find(t => t.value === value);
            navigate(tab.path ? `/rfqs/${id}/${tab.path}` : `/rfqs/${id}`);
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      <Routes>
        <Route index element={<RfqOverview rfq={rfq} onUpdate={refetch} />} />
        <Route path="features" element={<RfqFeatures rfqId={id} />} />
        <Route path="resources" element={<RfqResourcePlan rfqId={id} />} />
        {hasFinancialAccess() && (
          <Route path="rates" element={<RfqRates rfqId={id} />} />
        )}
        <Route path="scenarios" element={<RfqScenarios rfqId={id} hasFinancialAccess={hasFinancialAccess()} />} />
        <Route path="packages" element={<RfqDecisionPackages rfqId={id} />} />
        <Route path="comments" element={<RfqComments rfqId={id} />} />
        <Route path="attachments" element={<RfqAttachments rfqId={id} />} />
        <Route path="exports" element={<RfqExports rfqId={id} />} />
      </Routes>
    </Box>
  );
}

export default RfqDetail;