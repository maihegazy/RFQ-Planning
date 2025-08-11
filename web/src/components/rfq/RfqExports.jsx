import React, { useState } from 'react';
import { useQuery } from 'react-query';
import Chip from '@mui/material/Chip';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Description as ExcelIcon,
  PictureAsPdf as PdfIcon,
  Assessment as ReportIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function RfqExports({ rfqId }) {
  const { enqueueSnackbar } = useSnackbar();
  const { hasFinancialAccess } = useAuth();
  const [exporting, setExporting] = useState({});
  const [selectedPackage, setSelectedPackage] = useState('');

  const { data: decisionPackages } = useQuery(
    ['decision-packages', rfqId],
    async () => {
      const response = await api.get(`/decision-packages/rfq/${rfqId}`);
      return response.data;
    }
  );

  const handleExport = async (type, format) => {
    setExporting({ ...exporting, [type]: true });

    try {
      let response;
      let filename;

      switch (type) {
        case 'yearly-plan':
          response = await api.get(`/exports/yearly-plan/${rfqId}`, {
            responseType: 'blob',
          });
          filename = `yearly-plan-${new Date().toISOString().split('T')[0]}.xlsx`;
          break;

        case 'executive-pdf':
          if (!selectedPackage) {
            enqueueSnackbar('Please select a decision package', { variant: 'warning' });
            setExporting({ ...exporting, [type]: false });
            return;
          }
          response = await api.get(`/exports/executive-pdf/${rfqId}/${selectedPackage}`, {
            responseType: 'blob',
          });
          filename = `executive-summary-${new Date().toISOString().split('T')[0]}.pdf`;
          break;

        case 'resource-template':
          response = await api.get('/imports/templates/resource-plan', {
            responseType: 'blob',
          });
          filename = 'resource-plan-template.xlsx';
          break;

        case 'rates-template':
          response = await api.get('/imports/templates/rates', {
            responseType: 'blob',
          });
          filename = 'rates-template.xlsx';
          break;

        default:
          throw new Error('Unknown export type');
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      enqueueSnackbar(`Export completed: ${filename}`, { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(`Export failed: ${error.message}`, { variant: 'error' });
    } finally {
      setExporting({ ...exporting, [type]: false });
    }
  };

  const exportOptions = [
    {
      id: 'yearly-plan',
      title: 'Yearly Resource Plan',
      description: 'Export detailed resource allocation plan with monthly FTE breakdown',
      icon: <ExcelIcon fontSize="large" color="success" />,
      format: 'Excel',
      available: true,
    },
    {
      id: 'executive-pdf',
      title: 'Executive Summary PDF',
      description: 'Generate one-page executive summary with financial overview',
      icon: <PdfIcon fontSize="large" color="error" />,
      format: 'PDF',
      available: hasFinancialAccess() && decisionPackages?.length > 0,
      requiresPackage: true,
    },
    {
      id: 'resource-template',
      title: 'Resource Plan Template',
      description: 'Download Excel template for bulk resource import',
      icon: <ExcelIcon fontSize="large" color="primary" />,
      format: 'Template',
      available: true,
    },
    {
      id: 'rates-template',
      title: 'Rates Template',
      description: 'Download Excel template for rates import',
      icon: <ExcelIcon fontSize="large" color="primary" />,
      format: 'Template',
      available: hasFinancialAccess(),
    },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Exports & Templates
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Export RFQ data in various formats for reporting and analysis. Some exports require specific permissions.
      </Alert>

      <Grid container spacing={3}>
        {exportOptions.map((option) => (
          <Grid item xs={12} md={6} key={option.id}>
            <Card sx={{ height: '100%', opacity: option.available ? 1 : 0.6 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  {option.icon}
                  <Box>
                    <Typography variant="h6">{option.title}</Typography>
                    <Chip label={option.format} size="small" />
                  </Box>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {option.description}
                </Typography>
                
                {option.requiresPackage && (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Select Decision Package"
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    sx={{ mt: 2 }}
                    disabled={!decisionPackages || decisionPackages.length === 0}
                  >
                    {decisionPackages?.map(pkg => (
                      <MenuItem key={pkg.id} value={pkg.id}>
                        {pkg.name} (v{pkg.version})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={exporting[option.id] ? <CircularProgress size={20} /> : <DownloadIcon />}
                  onClick={() => handleExport(option.id, option.format)}
                  disabled={!option.available || exporting[option.id]}
                >
                  {exporting[option.id] ? 'Exporting...' : 'Export'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Export History
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Recent exports are automatically saved to NextCloud for team access.
          Check the Attachments tab for previously generated reports.
        </Typography>
      </Paper>
    </Box>
  );
}

export default RfqExports;