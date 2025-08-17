import React, { useState, useMemo } from 'react';
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
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Description as ExcelIcon,
  PictureAsPdf as PdfIcon,
  Assessment as ReportIcon,
  Timeline as TimelineIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { saveAs } from 'file-saver';

function RfqExports({ rfqId }) {
  const { enqueueSnackbar } = useSnackbar();
  const { hasFinancialAccess } = useAuth();
  const [exporting, setExporting] = useState({});
  const [selectedPackage, setSelectedPackage] = useState('');
  
  // Template options state
  const [useRfqTemplate, setUseRfqTemplate] = useState(true); // Default to RFQ-specific
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');

  const { data: decisionPackages } = useQuery(
    ['decision-packages', rfqId],
    async () => {
      const response = await api.get(`/decision-packages/rfq/${rfqId}`);
      return response.data;
    }
  );

  const { data: rfq } = useQuery(
    ['rfq-brief', rfqId],
    async () => (await api.get(`/rfqs/${rfqId}`)).data
  );

  // Get RFQ period info for display
  const rfqPeriodInfo = useMemo(() => {
    if (!rfq) return null;
    const startPeriod = `${rfq.startYear}-${String(rfq.startMonth || 1).padStart(2, '0')}`;
    const endPeriod = `${rfq.endYear}-${String(rfq.endMonth || 12).padStart(2, '0')}`;
    return { 
      startPeriod, 
      endPeriod,
      startYear: rfq.startYear,
      endYear: rfq.endYear,
      startMonth: rfq.startMonth || 1,
      endMonth: rfq.endMonth || 12
    };
  }, [rfq]);

  const yearsAreValid = useMemo(() => {
    if (useRfqTemplate) return true; // RFQ template is always valid
    
    const s = Number(startYear);
    const e = Number(endYear);
    if (!Number.isInteger(s) || !Number.isInteger(e)) return false;
    if (s < 2000 || e > 2100) return false;
    if (s > e) return false;
    if (e - s > 15) return false;
    return true;
  }, [startYear, endYear, useRfqTemplate]);

  const downloadResourceTemplate = async () => {
    try {
      setExporting(p => ({ ...p, ['resource-template']: true }));
      
      let response;
      let filename;
      
      if (useRfqTemplate) {
        // Download RFQ-specific template
        response = await api.get(`/imports/templates/resource-plan?rfqId=${rfqId}`, {
          responseType: 'blob',
        });
        
        // Extract filename from response headers or create default
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
          const matches = /filename="([^"]*)"/.exec(contentDisposition);
          if (matches != null && matches[1]) {
            filename = matches[1];
          }
        }
        if (!filename) {
          filename = `${rfq?.name || 'rfq'}-resource-plan-${rfqPeriodInfo?.startYear}-${rfqPeriodInfo?.endYear}.xlsx`.replace(/[^a-zA-Z0-9\-_\.]/g, '_');
        }
      } else {
        // Download generic template with custom years
        if (!yearsAreValid) {
          enqueueSnackbar('Enter a valid year range (2000–2100, Start ≤ End, span ≤ 16 yrs).', { variant: 'warning' });
          return;
        }
        
        const s = Number(startYear), e = Number(endYear);
        response = await api.get(`/imports/templates/resource-plan?startYear=${s}&endYear=${e}`, {
          responseType: 'blob',
        });
        filename = `resource-plan-${s}-${e}.xlsx`;
      }
      
      saveAs(response.data, filename);
      enqueueSnackbar(`Template downloaded: ${filename}`, { variant: 'success' });
    } catch (err) {
      console.error('Template download error:', err);
      enqueueSnackbar('Failed to download template. Please try again.', { variant: 'error' });
    } finally {
      setExporting(p => ({ ...p, ['resource-template']: false }));
    }
  };

  const downloadResourceTemplatePlaceholder = async () => {
    try {
      setExporting(p => ({ ...p, ['resource-placeholder']: true }));
      const response = await api.get(`/imports/templates/resource-plan`, { responseType: 'blob' });
      saveAs(response.data, `resource-plan-XXXX.xlsx`);
      enqueueSnackbar('Placeholder template downloaded', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to download placeholder. Please try again.', { variant: 'error' });
    } finally {
      setExporting(p => ({ ...p, ['resource-placeholder']: false }));
    }
  };

  const handleExport = async (type, format) => {
    if (type === 'resource-template') {
      await downloadResourceTemplate();
      return;
    }

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
      window.URL.revokeObjectURL(url);

      enqueueSnackbar(`Export completed: ${filename}`, { variant: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      enqueueSnackbar(`Export failed: ${error.response?.data?.error || error.message}`, { variant: 'error' });
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
      icon: <ScheduleIcon fontSize="large" color="primary" />,
      format: 'Template',
      available: true,
      isTemplate: true,
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
                    {decisionPackages && decisionPackages.length > 0 ? (
                      decisionPackages.map(pkg => (
                        <MenuItem key={pkg.id} value={pkg.id}>
                          {pkg.name} (v{pkg.version})
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled>No packages available</MenuItem>
                    )}
                  </TextField>
                )}

                {option.id === 'resource-template' && (
                  <Box sx={{ mt: 2 }}>
                    {rfqPeriodInfo && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        RFQ Period: {rfqPeriodInfo.startPeriod} to {rfqPeriodInfo.endPeriod}
                      </Alert>
                    )}

                    <FormControlLabel
                      control={
                        <Switch
                          checked={useRfqTemplate}
                          onChange={(e) => setUseRfqTemplate(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={useRfqTemplate ? "Use RFQ Timeline" : "Custom Years"}
                      sx={{ mb: 2 }}
                    />

                    {useRfqTemplate ? (
                      <Box>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          Template will include sheets for {rfqPeriodInfo?.startYear} to {rfqPeriodInfo?.endYear} with 
                          month columns from {rfqPeriodInfo ? 
                            `${new Date(0, (rfqPeriodInfo.startMonth || 1) - 1).toLocaleString('default', { month: 'short' })} to ${new Date(0, (rfqPeriodInfo.endMonth || 12) - 1).toLocaleString('default', { month: 'short' })}` 
                            : 'Jan to Dec'}
                        </Typography>
                        <Typography variant="body2" color="primary" sx={{ fontStyle: 'italic' }}>
                          ✓ Includes existing features and allocations
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Generate template with custom year range:
                        </Typography>

                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 1.5,
                            mb: 0.5,
                          }}
                        >
                          <TextField
                            label="Start Year"
                            type="number"
                            size="small"
                            value={startYear}
                            onChange={(e) => setStartYear(e.target.value)}
                            inputProps={{ min: 2000, max: 2100 }}
                          />
                          <TextField
                            label="End Year"
                            type="number"
                            size="small"
                            value={endYear}
                            onChange={(e) => setEndYear(e.target.value)}
                            inputProps={{ min: 2000, max: 2100 }}
                          />
                        </Box>

                        {!yearsAreValid && (startYear || endYear) && (
                          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                            Enter valid years (2000–2100), Start ≤ End, span ≤ 16 years.
                          </Typography>
                        )}
                      </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Button
                      variant="text"
                      size="small"
                      onClick={downloadResourceTemplatePlaceholder}
                      disabled={!!exporting['resource-placeholder']}
                      sx={{ px: 0, textTransform: 'none', color: 'text.secondary' }}
                    >
                      {exporting['resource-placeholder'] ? (
                        <>
                          <CircularProgress size={16} sx={{ mr: 1 }} />
                          Downloading...
                        </>
                      ) : (
                        'Or download generic placeholder (ProjectPlan-XXXX)'
                      )}
                    </Button>
                  </Box>
                )}
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={exporting[option.id] ? <CircularProgress size={20} /> : <DownloadIcon />}
                  onClick={() => handleExport(option.id, option.format)}
                  disabled={
                    !option.available || 
                    exporting[option.id] || 
                    (option.id === 'resource-template' && !useRfqTemplate && !yearsAreValid)
                  }
                  sx={{
                    bgcolor: 'grey.900',
                    color: 'common.white',
                    '&:hover': { bgcolor: 'grey.800' },
                    '&.Mui-disabled': {
                      bgcolor: 'action.disabledBackground',
                      color: 'action.disabled',
                    },
                  }}
                >
                  {exporting[option.id] ? 'Exporting...' : 
                   option.id === 'resource-template' && useRfqTemplate ? 'Download RFQ Template' : 
                   'Export'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Template Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              RFQ-Specific Templates
            </Typography>
            <Typography variant="body2" color="textSecondary">
              • Pre-configured with your RFQ timeline<br/>
              • Includes existing features and allocations<br/>
              • Only shows relevant months<br/>
              • Ready for immediate use
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="secondary" gutterBottom>
              Generic Templates
            </Typography>
            <Typography variant="body2" color="textSecondary">
              • Custom year ranges<br/>
              • Empty starting templates<br/>
              • All 12 months included<br/>
              • For planning new projects
            </Typography>
          </Grid>
        </Grid>
      </Paper>

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