import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Upload as UploadIcon,
  InsertDriveFile as FileIcon,
  Description as PdfIcon,
  Image as ImageIcon,
  TableChart as ExcelIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function RfqAttachments({ rfqId }) {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: attachments, refetch } = useQuery(
    ['attachments', 'RFQ', rfqId],
    async () => {
      const response = await api.get(`/attachments/RFQ/${rfqId}`);
      return response.data;
    }
  );

  const uploadMutation = useMutation(
    (formData) => api.post('/attachments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log('Upload progress:', percentCompleted);
      },
    }),
    {
      onSuccess: () => {
        enqueueSnackbar('File uploaded successfully', { variant: 'success' });
        setUploadDialog(false);
        setSelectedFile(null);
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to upload file', { variant: 'error' });
      },
      onSettled: () => {
        setUploading(false);
      },
    }
  );

  const deleteMutation = useMutation(
    (id) => api.delete(`/attachments/${id}`),
    {
      onSuccess: () => {
        enqueueSnackbar('File deleted successfully', { variant: 'success' });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to delete file', { variant: 'error' });
      },
    }
  );

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('parentType', 'RFQ');
    formData.append('parentId', rfqId);

    setUploading(true);
    uploadMutation.mutate(formData);
  };

  const handleDownload = async (attachment) => {
    try {
      const response = await api.get(`/attachments/download/${attachment.id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      enqueueSnackbar('Failed to download file', { variant: 'error' });
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return <PdfIcon />;
    if (mimeType.includes('image')) return <ImageIcon />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <ExcelIcon />;
    return <FileIcon />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Group attachments by version
  const groupedAttachments = attachments?.reduce((acc, att) => {
    const key = att.filename;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(att);
    return acc;
  }, {});

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Attachments</Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadDialog(true)}
        >
          Upload File
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Allowed file types: PDF, Excel, Word, Images, Text, CSV. Maximum size: 10MB
      </Alert>

      {!groupedAttachments || Object.keys(groupedAttachments).length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No attachments yet. Click "Upload File" to add documents.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {Object.entries(groupedAttachments).map(([filename, versions]) => {
              const latestVersion = versions.sort((a, b) => b.version - a.version)[0];
              const olderVersions = versions.filter(v => v.id !== latestVersion.id);

              return (
                <React.Fragment key={filename}>
                  <ListItem>
                    <ListItemIcon>
                      {getFileIcon(latestVersion.mimeType)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography>{latestVersion.filename}</Typography>
                          <Chip label={`v${latestVersion.version}`} size="small" />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="textSecondary">
                            {formatFileSize(latestVersion.fileSize)} • 
                            Uploaded {new Date(latestVersion.createdAt).toLocaleDateString()} by {latestVersion.uploadedBy}
                          </Typography>
                          {olderVersions.length > 0 && (
                            <Typography variant="caption" color="textSecondary">
                              {olderVersions.length} older version{olderVersions.length > 1 ? 's' : ''} available
                            </Typography>
                          )}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleDownload(latestVersion)}>
                        <DownloadIcon />
                      </IconButton>
                      {latestVersion.uploadedBy === user?.id && (
                        <IconButton onClick={() => deleteMutation.mutate(latestVersion.id)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                  {olderVersions.map(version => (
                    <ListItem key={version.id} sx={{ pl: 8 }}>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">Version {version.version}</Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary">
                            {formatFileSize(version.fileSize)} • 
                            {new Date(version.createdAt).toLocaleDateString()}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => handleDownload(version)}>
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => !uploading && setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Attachment</DialogTitle>
        <DialogContent>
          <input
            type="file"
            accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.txt,.csv"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button
              variant="outlined"
              component="span"
              fullWidth
              startIcon={<UploadIcon />}
              disabled={uploading}
            >
              {selectedFile ? selectedFile.name : 'Select File'}
            </Button>
          </label>
          
          {selectedFile && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                File: {selectedFile.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Size: {formatFileSize(selectedFile.size)}
              </Typography>
            </Box>
          )}

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>Uploading...</Typography>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RfqAttachments;