import React, { useState } from 'react';
import { useMutation } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  CloudUpload as CloudIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Settings() {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    // Company Settings
    companyName: 'Your Company',
    companyLogo: '',
    currency: 'EUR',
    
    // NextCloud Settings
    nextcloudUrl: '',
    nextcloudUsername: '',
    nextcloudPassword: '',
    nextcloudBasePath: '/RFQ-System',
    
    // Email Settings
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    emailFrom: '',
    
    // Security Settings
    sessionTimeout: 8,
    passwordMinLength: 8,
    passwordRequireNumbers: true,
    passwordRequireSpecial: false,
    maxLoginAttempts: 5,
    
    // System Settings
    enableAuditLog: true,
    enableEmailNotifications: true,
    enableAutoBackup: true,
    backupRetentionDays: 30,
  });

  const saveMutation = useMutation(
    (data) => api.post('/settings', data),
    {
      onSuccess: () => {
        enqueueSnackbar('Settings saved successfully', { variant: 'success' });
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to save settings', { variant: 'error' });
      },
    }
  );

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const testEmailMutation = useMutation(
    () => api.post('/settings/test-email', { to: settings.smtpUser }),
    {
      onSuccess: () => {
        enqueueSnackbar('Test email sent successfully', { variant: 'success' });
      },
      onError: () => {
        enqueueSnackbar('Failed to send test email', { variant: 'error' });
      },
    }
  );

  const testNextCloudMutation = useMutation(
    () => api.post('/settings/test-nextcloud', {
      url: settings.nextcloudUrl,
      username: settings.nextcloudUsername,
      password: settings.nextcloudPassword,
    }),
    {
      onSuccess: () => {
        enqueueSnackbar('NextCloud connection successful', { variant: 'success' });
      },
      onError: () => {
        enqueueSnackbar('Failed to connect to NextCloud', { variant: 'error' });
      },
    }
  );

  if (!isAdmin()) {
    return (
      <Box>
        <Alert severity="error">
          Access denied. Only administrators can access system settings.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<BusinessIcon />} label="Company" />
          <Tab icon={<CloudIcon />} label="NextCloud" />
          <Tab icon={<EmailIcon />} label="Email" />
          <Tab icon={<SecurityIcon />} label="Security" />
        </Tabs>
      </Paper>

      {/* Company Settings */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Company Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Logo URL"
                value={settings.companyLogo}
                onChange={(e) => setSettings({ ...settings, companyLogo: e.target.value })}
                helperText="URL to company logo for reports"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Default Currency"
                value={settings.currency}
                disabled
                helperText="EUR only in version 1"
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* NextCloud Settings */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            NextCloud Configuration
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="NextCloud URL"
                value={settings.nextcloudUrl}
                onChange={(e) => setSettings({ ...settings, nextcloudUrl: e.target.value })}
                placeholder="https://your-nextcloud.com"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Username"
                value={settings.nextcloudUsername}
                onChange={(e) => setSettings({ ...settings, nextcloudUsername: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={settings.nextcloudPassword}
                onChange={(e) => setSettings({ ...settings, nextcloudPassword: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Base Path"
                value={settings.nextcloudBasePath}
                onChange={(e) => setSettings({ ...settings, nextcloudBasePath: e.target.value })}
                helperText="Root folder for RFQ files"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                onClick={() => testNextCloudMutation.mutate()}
                disabled={!settings.nextcloudUrl || !settings.nextcloudUsername}
              >
                Test Connection
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Email Settings */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Email Configuration (SMTP)
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="SMTP Host"
                value={settings.smtpHost}
                onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="SMTP Port"
                type="number"
                value={settings.smtpPort}
                onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Username"
                value={settings.smtpUser}
                onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Password"
                type="password"
                value={settings.smtpPass}
                onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="From Email"
                type="email"
                value={settings.emailFrom}
                onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.smtpSecure}
                    onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
                  />
                }
                label="Use Secure Connection (TLS/SSL)"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableEmailNotifications}
                    onChange={(e) => setSettings({ ...settings, enableEmailNotifications: e.target.checked })}
                  />
                }
                label="Enable Email Notifications"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                onClick={() => testEmailMutation.mutate()}
                disabled={!settings.smtpHost || !settings.smtpUser}
              >
                Send Test Email
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Security Settings */}
      {activeTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Session Timeout (hours)"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Login Attempts"
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Password Requirements
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Minimum Length"
                type="number"
                value={settings.passwordMinLength}
                onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.passwordRequireNumbers}
                    onChange={(e) => setSettings({ ...settings, passwordRequireNumbers: e.target.checked })}
                  />
                }
                label="Require Numbers"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.passwordRequireSpecial}
                    onChange={(e) => setSettings({ ...settings, passwordRequireSpecial: e.target.checked })}
                  />
                }
                label="Require Special Characters"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                System Settings
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableAuditLog}
                    onChange={(e) => setSettings({ ...settings, enableAuditLog: e.target.checked })}
                  />
                }
                label="Enable Audit Logging"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableAutoBackup}
                    onChange={(e) => setSettings({ ...settings, enableAutoBackup: e.target.checked })}
                  />
                }
                label="Enable Automatic Backups"
              />
            </Grid>
            {settings.enableAutoBackup && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Backup Retention (days)"
                  type="number"
                  value={settings.backupRetentionDays}
                  onChange={(e) => setSettings({ ...settings, backupRetentionDays: parseInt(e.target.value) })}
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saveMutation.isLoading}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
}

export default Settings;