// web/src/main.jsx - Ultra-clean theme with proper alignment
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { SnackbarProvider } from 'notistack';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Ultra-clean theme with teal accent
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#222222',
      light: '#484848',
      dark: '#000000',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#00A8A8', // Teal accent color
      light: '#00C9C9',
      dark: '#008585',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#222222',
      secondary: '#6B7280',
    },
    error: {
      main: '#DC2626',
      light: '#EF4444',
      dark: '#991B1B',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
    },
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    divider: '#E5E7EB',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
      color: '#222222',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
      color: '#222222',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
      color: '#222222',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
      color: '#222222',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1.5,
      color: '#222222',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: 0,
      lineHeight: 1.5,
      color: '#222222',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#4B5563',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
      color: '#4B5563',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#222222',
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#6B7280',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.875rem',
      letterSpacing: 0,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.4,
      color: '#6B7280',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    ...Array(18).fill('0 25px 50px -12px rgba(0, 0, 0, 0.25)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#CBD5E1 #F9FAFB',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 12,
            height: 12,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 6,
            backgroundColor: '#CBD5E1',
            border: '3px solid #FFFFFF',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: '#F9FAFB',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: 'none',
          textTransform: 'none',
          transition: 'all 0.15s ease',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&.MuiButton-containedPrimary': {
            backgroundColor: '#222222',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#000000',
            },
          },
          '&.MuiButton-containedSecondary': {
            backgroundColor: '#00A8A8',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#008585',
            },
          },
        },
        outlined: {
          borderColor: '#E5E7EB',
          color: '#222222',
          '&:hover': {
            borderColor: '#9CA3AF',
            backgroundColor: 'transparent',
          },
        },
        text: {
          color: '#6B7280',
          '&:hover': {
            backgroundColor: '#F9FAFB',
            color: '#222222',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          boxShadow: 'none',
          transition: 'all 0.15s ease',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: '#E5E7EB',
              borderWidth: 1,
            },
            '&:hover fieldset': {
              borderColor: '#9CA3AF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00A8A8',
              borderWidth: 2,
            },
          },
          '& .MuiInputLabel-root': {
            color: '#6B7280',
            '&.Mui-focused': {
              color: '#00A8A8',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
          height: 24,
          border: 'none',
        },
        filled: {
          backgroundColor: '#F3F4F6',
          color: '#4B5563',
          '&:hover': {
            backgroundColor: '#E5E7EB',
          },
        },
        colorPrimary: {
          backgroundColor: '#222222',
          color: '#FFFFFF',
        },
        colorSecondary: {
          backgroundColor: '#E0F2F1',
          color: '#00A8A8',
        },
        colorSuccess: {
          backgroundColor: '#D1FAE5',
          color: '#059669',
        },
        colorError: {
          backgroundColor: '#FEE2E2',
          color: '#DC2626',
        },
        colorWarning: {
          backgroundColor: '#FEF3C7',
          color: '#D97706',
        },
        colorInfo: {
          backgroundColor: '#DBEAFE',
          color: '#2563EB',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#222222',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E5E7EB',
          boxShadow: 'none',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
          borderRadius: 8,
          marginBottom: 2,
          '&:hover': {
            backgroundColor: '#F9FAFB',
          },
          '&.Mui-selected': {
            backgroundColor: '#E0F2F1',
            color: '#00A8A8',
            '&:hover': {
              backgroundColor: '#CCE7E7',
            },
            '& .MuiListItemIcon-root': {
              color: '#00A8A8',
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: '#F9FAFB',
          },
          '&.Mui-selected': {
            backgroundColor: '#E0F2F1',
            color: '#00A8A8',
            '&:hover': {
              backgroundColor: '#CCE7E7',
            },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 40,
          color: '#6B7280',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        secondary: {
          fontSize: '0.75rem',
          color: '#9CA3AF',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #E5E7EB',
          minHeight: 48,
        },
        indicator: {
          backgroundColor: '#00A8A8',
          height: 2,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          color: '#6B7280',
          minHeight: 48,
          padding: '12px 16px',
          '&:hover': {
            color: '#222222',
          },
          '&.Mui-selected': {
            color: '#00A8A8',
            fontWeight: 600,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#222222',
          padding: '20px 24px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '0 24px 20px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px',
          borderTop: '1px solid #E5E7EB',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: 'none',
        },
        standardSuccess: {
          backgroundColor: '#D1FAE5',
          color: '#065F46',
        },
        standardError: {
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
        },
        standardWarning: {
          backgroundColor: '#FEF3C7',
          color: '#92400E',
        },
        standardInfo: {
          backgroundColor: '#DBEAFE',
          color: '#1E40AF',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: '#E5E7EB',
          height: 4,
        },
        bar: {
          borderRadius: 4,
          backgroundColor: '#00A8A8',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#00A8A8',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#374151',
          borderRadius: 6,
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '6px 10px',
        },
        arrow: {
          color: '#374151',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: '#00A8A8',
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: '0.875rem',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#E5E7EB',
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          '& .MuiBreadcrumbs-separator': {
            color: '#CBD5E1',
          },
          '& a': {
            color: '#6B7280',
            textDecoration: 'none',
            '&:hover': {
              color: '#00A8A8',
              textDecoration: 'underline',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#6B7280',
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: '#F9FAFB',
            color: '#222222',
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontSize: '0.625rem',
          fontWeight: 600,
          minWidth: 18,
          height: 18,
          padding: '0 6px',
        },
        colorPrimary: {
          backgroundColor: '#00A8A8',
          color: '#FFFFFF',
        },
        colorError: {
          backgroundColor: '#DC2626',
          color: '#FFFFFF',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          fontSize: '0.875rem',
          '& .MuiDataGrid-cell': {
            borderColor: '#E5E7EB',
            padding: '12px 16px',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#F9FAFB',
            borderBottom: '1px solid #E5E7EB',
            color: '#6B7280',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
          '& .MuiDataGrid-row': {
            '&:hover': {
              backgroundColor: '#F9FAFB',
            },
            '&.Mui-selected': {
              backgroundColor: '#E0F2F1',
              '&:hover': {
                backgroundColor: '#CCE7E7',
              },
            },
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid #E5E7EB',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 26,
          padding: 0,
          '& .MuiSwitch-switchBase': {
            padding: 0,
            margin: 2,
            transitionDuration: '200ms',
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                backgroundColor: '#00A8A8',
                opacity: 1,
                border: 0,
              },
            },
          },
          '& .MuiSwitch-thumb': {
            boxSizing: 'border-box',
            width: 22,
            height: 22,
          },
          '& .MuiSwitch-track': {
            borderRadius: 13,
            backgroundColor: '#E5E7EB',
            opacity: 1,
            transition: 'background-color 200ms',
          },
        },
      },
    },
  },
});

// Clean global styles
const GlobalStyles = () => (
  <style jsx global>{`
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #FFFFFF;
      color: #222222;
      line-height: 1.5;
    }

    /* Clean focus states */
    *:focus-visible {
      outline: 2px solid #00A8A8;
      outline-offset: 2px;
    }

    /* Clean links */
    a {
      color: inherit;
      text-decoration: none;
    }

    a:hover {
      color: #00A8A8;
    }

    /* Clean selection */
    ::selection {
      background: rgba(0, 168, 168, 0.15);
      color: #222222;
    }

    /* Remove spinner from number inputs */
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    /* Clean scrollbar */
    ::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }

    ::-webkit-scrollbar-track {
      background: #F9FAFB;
      border-radius: 6px;
    }

    ::-webkit-scrollbar-thumb {
      background: #CBD5E1;
      border-radius: 6px;
      border: 3px solid #F9FAFB;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #9CA3AF;
    }

    /* Smooth transitions */
    * {
      transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
      transition-timing-function: ease;
      transition-duration: 150ms;
    }

    /* Disable transitions for reduce motion */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `}</style>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <SnackbarProvider 
              maxSnack={3} 
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              autoHideDuration={4000}
            >
              <AuthProvider>
                <CssBaseline />
                <GlobalStyles />
                <App />
              </AuthProvider>
            </SnackbarProvider>
          </LocalizationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);