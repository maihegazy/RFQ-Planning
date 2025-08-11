// web/src/components/Layout.jsx - Perfectly aligned clean layout
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Button,
  Stack,
  InputBase,
  Paper,
} from '@mui/material';
import {
  GridViewRounded,
  ArticleOutlined,
  TaskAltOutlined,
  PeopleOutlined,
  SettingsOutlined,
  LogoutOutlined,
  NotificationsNoneOutlined,
  AddRounded,
  SearchRounded,
  KeyboardArrowDownRounded,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { styled, alpha } from '@mui/material/styles';

// Constants for consistent spacing
const HEADER_HEIGHT = 64;
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;

// Styled Components with precise alignment
const Root = styled(Box)({
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#FAFAFA',
});

const Header = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: SIDEBAR_WIDTH,
  right: 0,
  height: HEADER_HEIGHT,
  backgroundColor: '#FFFFFF',
  borderBottom: '1px solid #E5E7EB',
  zIndex: 1200,
  display: 'flex',
  alignItems: 'center',
  padding: '0 24px',
  transition: 'left 0.2s ease',
  [theme.breakpoints.down('lg')]: {
    left: SIDEBAR_COLLAPSED_WIDTH,
  },
  [theme.breakpoints.down('md')]: {
    left: 0,
  },
}));

const Sidebar = styled(Box)(({ theme, collapsed }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
  backgroundColor: '#FFFFFF',
  borderRight: '1px solid #E5E7EB',
  transition: 'width 0.2s ease',
  overflowX: 'hidden',
  overflowY: 'auto',
  zIndex: 1100,
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.down('md')]: {
    transform: collapsed ? 'translateX(-100%)' : 'translateX(0)',
    width: SIDEBAR_WIDTH,
  },
}));

const Main = styled(Box, {
  shouldForwardProp: (prop) => prop !== '$sidebarCollapsed',
})(({ theme, $sidebarCollapsed }) => ({
  flexGrow: 1,
  marginTop: HEADER_HEIGHT,
  marginLeft: $sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
  minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
  backgroundColor: '#FAFAFA',
  transition: 'margin-left 0.2s ease',
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
  },
}));

const Logo = styled(Box)({
  height: HEADER_HEIGHT,
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  borderBottom: '1px solid #E5E7EB',
  backgroundColor: '#FFFFFF',
});

const NavItem = styled(Box)(({ active }) => ({
  display: 'flex',
  alignItems: 'center',
  height: 40,
  margin: '2px 12px',
  padding: '0 12px',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  color: active ? '#00A8A8' : '#6B7280',
  backgroundColor: active ? alpha('#00A8A8', 0.08) : 'transparent',
  fontWeight: active ? 600 : 400,
  fontSize: '0.875rem',
  '&:hover': {
    backgroundColor: active ? alpha('#00A8A8', 0.12) : '#F9FAFB',
    color: active ? '#00A8A8' : '#222222',
  },
}));

const NavIcon = styled(Box)({
  minWidth: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const SearchBar = styled(Paper)({
  display: 'flex',
  alignItems: 'center',
  width: 320,
  height: 40,
  borderRadius: 8,
  border: '1px solid #E5E7EB',
  backgroundColor: '#FFFFFF',
  boxShadow: 'none',
  padding: '0 12px',
  transition: 'all 0.15s ease',
  '&:hover': {
    borderColor: '#CBD5E1',
  },
  '&:focus-within': {
    borderColor: '#00A8A8',
    boxShadow: `0 0 0 3px ${alpha('#00A8A8', 0.1)}`,
  },
});

const CreateButton = styled(Button)({
  backgroundColor: '#222222',
  color: '#FFFFFF',
  borderRadius: 8,
  padding: '8px 20px',
  fontWeight: 600,
  textTransform: 'none',
  '&:hover': {
    backgroundColor: '#000000',
  },
});

const NotificationBadge = styled(Badge)({
  '& .MuiBadge-badge': {
    backgroundColor: '#00A8A8',
    color: '#FFFFFF',
    fontSize: '0.625rem',
    fontWeight: 600,
    minWidth: 18,
    height: 18,
  },
});

const menuItems = [
  { 
    path: '/dashboard', 
    label: 'Dashboard', 
    icon: <GridViewRounded sx={{ fontSize: 20 }} />,
    roles: null,
  },
  { 
    path: '/rfqs', 
    label: 'RFQs', 
    icon: <ArticleOutlined sx={{ fontSize: 20 }} />,
    roles: null,
  },
  { 
    path: '/approvals', 
    label: 'Approvals', 
    icon: <TaskAltOutlined sx={{ fontSize: 20 }} />,
    roles: null,
    badge: 3,
  },
  { 
    path: '/users', 
    label: 'Users', 
    icon: <PeopleOutlined sx={{ fontSize: 20 }} />,
    roles: ['ADMIN'],
  },
  { 
    path: '/settings', 
    label: 'Settings', 
    icon: <SettingsOutlined sx={{ fontSize: 20 }} />,
    roles: ['ADMIN'],
  },
];

function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleProfileMenu = (event) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setProfileAnchor(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Root>
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed}>
        {/* Logo Area */}
        <Logo>
          {!sidebarCollapsed ? (
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#222222' }}>
              RFQ System
            </Typography>
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#00A8A8' }}>
              R
            </Typography>
          )}
        </Logo>

        {/* Navigation Items */}
        <Box sx={{ flex: 1, py: 2 }}>
          {menuItems
            .filter(item => !item.roles || item.roles.includes(user?.role))
            .map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavItem
                  key={item.path}
                  active={isActive}
                  onClick={() => navigate(item.path)}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <NavIcon>
                    {item.badge ? (
                      <NotificationBadge badgeContent={item.badge}>
                        {React.cloneElement(item.icon, { 
                          sx: { 
                            color: isActive ? '#00A8A8' : '#6B7280',
                            fontSize: 20,
                          }
                        })}
                      </NotificationBadge>
                    ) : (
                      React.cloneElement(item.icon, { 
                        sx: { 
                          color: isActive ? '#00A8A8' : '#6B7280',
                          fontSize: 20,
                        }
                      })
                    )}
                  </NavIcon>
                  {!sidebarCollapsed && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        ml: 1.5,
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {item.label}
                    </Typography>
                  )}
                </NavItem>
              );
            })}
        </Box>

        {/* User Section */}
        {!sidebarCollapsed && (
          <Box sx={{ p: 2, borderTop: '1px solid #E5E7EB' }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  backgroundColor: '#00A8A8',
                  fontSize: '0.875rem',
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#222222',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.name}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{
                    color: '#6B7280',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.role?.replace(/_/g, ' ')}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}
      </Sidebar>

      {/* Header */}
      <Header>
        <Stack 
          direction="row" 
          alignItems="center" 
          justifyContent="space-between"
          sx={{ width: '100%' }}
        >
          {/* Search Bar */}
          <SearchBar>
            <SearchRounded sx={{ color: '#9CA3AF', fontSize: 20, mr: 1 }} />
            <InputBase
              placeholder="Search..."
              sx={{ 
                flex: 1,
                fontSize: '0.875rem',
                '& input': {
                  padding: 0,
                },
              }}
            />
          </SearchBar>

          {/* Right Actions */}
          <Stack direction="row" spacing={2} alignItems="center">
            <CreateButton
              startIcon={<AddRounded />}
              onClick={() => navigate('/rfqs/new')}
            >
              New RFQ
            </CreateButton>
            
            <IconButton sx={{ color: '#6B7280' }}>
              <NotificationBadge badgeContent={2}>
                <NotificationsNoneOutlined sx={{ fontSize: 22 }} />
              </NotificationBadge>
            </IconButton>

            <Button
              onClick={handleProfileMenu}
              sx={{
                borderRadius: 8,
                padding: '6px 8px',
                minWidth: 'auto',
                '&:hover': {
                  backgroundColor: '#F9FAFB',
                },
              }}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  backgroundColor: '#00A8A8',
                  fontSize: '0.875rem',
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <KeyboardArrowDownRounded sx={{ ml: 1, color: '#6B7280' }} />
            </Button>
          </Stack>
        </Stack>
      </Header>

      {/* Main Content */}
      <Main sidebarCollapsed={sidebarCollapsed}>
        <Box sx={{ p: 3, maxWidth: 1440, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Main>

      {/* Profile Menu */}
      <Menu
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {user?.name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleCloseMenu}>
          Profile Settings
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>
          Preferences
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutOutlined fontSize="small" sx={{ mr: 1.5, color: '#DC2626' }} />
          <Typography color="error">Log out</Typography>
        </MenuItem>
      </Menu>
    </Root>
  );
}

export default Layout;