import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from 'react-query';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Send as SendIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AlternateEmail as MentionIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function RfqComments({ rfqId }) {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const commentInputRef = useRef(null);

  const { data: comments, refetch } = useQuery(
    ['comments', 'RFQ', rfqId],
    async () => {
      const response = await api.get(`/comments/RFQ/${rfqId}`);
      return response.data;
    }
  );

  const { data: users } = useQuery('users', async () => {
    const response = await api.get('/users');
    return response.data;
  });

  const createCommentMutation = useMutation(
    (data) => api.post('/comments', data),
    {
      onSuccess: () => {
        enqueueSnackbar('Comment posted', { variant: 'success' });
        setComment('');
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to post comment', { variant: 'error' });
      },
    }
  );

  const updateCommentMutation = useMutation(
    ({ id, data }) => api.put(`/comments/${id}`, data),
    {
      onSuccess: () => {
        enqueueSnackbar('Comment updated', { variant: 'success' });
        setEditingComment(null);
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to update comment', { variant: 'error' });
      },
    }
  );

  const deleteCommentMutation = useMutation(
    (id) => api.delete(`/comments/${id}`),
    {
      onSuccess: () => {
        enqueueSnackbar('Comment deleted', { variant: 'success' });
        refetch();
      },
      onError: (error) => {
        enqueueSnackbar(error.response?.data?.error || 'Failed to delete comment', { variant: 'error' });
      },
    }
  );

  const handleSubmit = () => {
    if (!comment.trim()) return;

    // Extract mentions from comment
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(comment)) !== null) {
      const mentionedUser = users?.find(u => 
        u.name.toLowerCase().includes(match[1].toLowerCase()) ||
        u.email.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentionedUser) {
        mentions.push(mentionedUser.id);
      }
    }

    createCommentMutation.mutate({
      parentType: 'RFQ',
      parentId: rfqId,
      body: comment,
      mentions: [...new Set(mentions)], // Remove duplicates
    });
  };

  const handleEdit = (comment) => {
    setEditingComment(comment);
    setAnchorEl(null);
  };

  const handleDelete = (commentId) => {
    deleteCommentMutation.mutate(commentId);
    setAnchorEl(null);
  };

  const handleMention = (userName) => {
    const currentText = comment;
    const cursorPosition = commentInputRef.current?.selectionStart || currentText.length;
    const textBefore = currentText.substring(0, cursorPosition);
    const textAfter = currentText.substring(cursorPosition);
    
    // Check if we need to add @ symbol
    const needsAt = !textBefore.endsWith('@');
    const mention = needsAt ? `@${userName} ` : `${userName} `;
    
    setComment(textBefore + mention + textAfter);
    
    // Focus back on input
    setTimeout(() => {
      commentInputRef.current?.focus();
      const newPosition = cursorPosition + mention.length;
      commentInputRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const formatCommentTime = (timestamp) => {
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

  const CommentItem = ({ commentData }) => {
    const isOwner = commentData.user.id === user?.id;
    const isEditing = editingComment?.id === commentData.id;

    return (
      <ListItem alignItems="flex-start" sx={{ px: 0 }}>
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {commentData.user.name.charAt(0).toUpperCase()}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle2" component="span">
                  {commentData.user.name}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                  {formatCommentTime(commentData.createdAt)}
                </Typography>
                {commentData.updatedAt !== commentData.createdAt && (
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                    (edited)
                  </Typography>
                )}
              </Box>
              {isOwner && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    setAnchorEl(e.currentTarget);
                    setSelectedComment(commentData);
                  }}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          }
          secondary={
            isEditing ? (
              <Box sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  size="small"
                  value={editingComment.body}
                  onChange={(e) => setEditingComment({ ...editingComment, body: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      updateCommentMutation.mutate({
                        id: editingComment.id,
                        data: { body: editingComment.body },
                      });
                    }
                  }}
                />
                <Box sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      updateCommentMutation.mutate({
                        id: editingComment.id,
                        data: { body: editingComment.body },
                      });
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setEditingComment(null)}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}
                dangerouslySetInnerHTML={{
                  __html: commentData.body.replace(
                    /@(\w+)/g,
                    '<span style="color: #1976d2; font-weight: 500;">@$1</span>'
                  ),
                }}
              />
            )
          }
        />
      </ListItem>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Comments
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Add a comment... Use @ to mention someone"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            inputRef={commentInputRef}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSubmit();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => {
                      // Show mention helper
                    }}
                  >
                    <MentionIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Box display="flex" gap={1}>
            {users?.slice(0, 5).map(u => (
              <Chip
                key={u.id}
                label={`@${u.name.split(' ')[0]}`}
                size="small"
                variant="outlined"
                onClick={() => handleMention(u.name.split(' ')[0])}
              />
            ))}
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary" sx={{ mr: 2 }}>
              Ctrl+Enter to submit
            </Typography>
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={!comment.trim()}
            >
              Post
            </Button>
          </Box>
        </Box>
      </Paper>

      {comments?.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No comments yet. Be the first to comment!
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <List>
            {comments?.map((commentData, index) => (
              <React.Fragment key={commentData.id}>
                <CommentItem commentData={commentData} />
                {index < comments.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleEdit(selectedComment)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => handleDelete(selectedComment.id)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default RfqComments;