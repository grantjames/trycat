import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App.jsx';
import './index.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#176b87',
      dark: '#0d4f65',
      light: '#d6edf4',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#e76f51',
    },
    success: {
      main: '#2e7d5a',
    },
    warning: {
      main: '#a86200',
    },
    info: {
      main: '#176b87',
    },
    background: {
      default: '#edf3f6',
      paper: '#ffffff',
    },
    text: {
      primary: '#1d2733',
      secondary: '#526273',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiDialog: {
      defaultProps: {
        slotProps: { paper: { sx: { borderRadius: '8px' } } },
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
