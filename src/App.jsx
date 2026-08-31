import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import BackspaceRoundedIcon from '@mui/icons-material/BackspaceRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import KeyboardReturnRoundedIcon from '@mui/icons-material/KeyboardReturnRounded';
import PetsRoundedIcon from '@mui/icons-material/PetsRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SetMealRoundedIcon from '@mui/icons-material/SetMealRounded';
import {
  createGame,
  getBoardRows,
  getKeyboardState,
  getLocalDateKey,
  getStorageKey,
  restoreGame,
  submitGuess,
} from './gameLogic.js';
import { getDailyWordProgress } from './wordBank.js';

const MODES = [3, 4];
const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

const STATUS_STYLES = {
  empty: { background: '#ffffff', color: '#1d2733', border: '#b8c6d5', borderStyle: 'solid', borderWidth: 2 },
  correct: { background: '#b7e4c7', color: '#173d2a', border: '#287a4b', borderStyle: 'double', borderWidth: 4 },
  present: { background: '#ffe08a', color: '#473500', border: '#9a6b00', borderStyle: 'dashed', borderWidth: 2 },
  absent: { background: '#d7dde5', color: '#293746', border: '#758395', borderStyle: 'solid', borderWidth: 2 },
};

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The game remains playable when storage is unavailable.
  }
}

function loadGames(dayKey, date) {
  return Object.fromEntries(MODES.map((length) => [
    length,
    restoreGame(length, readStorage(getStorageKey(length, dayKey)), date),
  ]));
}

function createDailyState(date = new Date()) {
  const dayKey = getLocalDateKey(date);
  return {
    dayKey,
    games: loadGames(dayKey, date),
    ...getDailyWordProgress(date),
  };
}

function App() {
  const [mode, setMode] = useState(3);
  const [daily, setDaily] = useState(createDailyState);
  const [rulesOpen, setRulesOpen] = useState(
    () => readStorage('trycat-rules-seen') !== 'true',
  );

  const game = daily.games[mode];
  const boardRows = useMemo(() => getBoardRows(game), [game]);
  const keyboardState = useMemo(() => getKeyboardState(game), [game]);

  const refreshDay = useCallback(() => {
    const now = new Date();
    const nextDayKey = getLocalDateKey(now);
    setDaily((previous) => {
      if (previous.dayKey === nextDayKey) return previous;
      return createDailyState(now);
    });
  }, []);

  useEffect(() => {
    MODES.forEach((length) => {
      writeStorage(
        getStorageKey(length, daily.dayKey),
        JSON.stringify(daily.games[length]),
      );
    });
  }, [daily]);

  useEffect(() => {
    let midnightTimer;

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      midnightTimer = window.setTimeout(() => {
        refreshDay();
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime() + 100);
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshDay();
    };

    scheduleMidnightRefresh();
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshDay);
    return () => {
      window.clearTimeout(midnightTimer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshDay);
    };
  }, [refreshDay]);

  const updateCurrentGame = useCallback((updater) => {
    setDaily((previous) => ({
      ...previous,
      games: {
        ...previous.games,
        [mode]: updater(previous.games[mode]),
      },
    }));
  }, [mode]);

  const submitCurrentGuess = useCallback(() => {
    updateCurrentGame(submitGuess);
  }, [updateCurrentGame]);

  const handleKey = useCallback((key) => {
    if (key === 'ENTER') {
      submitCurrentGuess();
      return;
    }

    updateCurrentGame((previous) => {
      if (previous.status !== 'playing') return previous;
      if (key === 'BACKSPACE') {
        return {
          ...previous,
          currentGuess: previous.currentGuess.slice(0, -1),
          message: '',
        };
      }
      if (!/^[A-Z]$/.test(key) || previous.currentGuess.length >= previous.mode) {
        return previous;
      }
      return {
        ...previous,
        currentGuess: `${previous.currentGuess}${key.toLowerCase()}`,
        message: '',
      };
    });
  }, [submitCurrentGuess, updateCurrentGame]);

  useEffect(() => {
    const handlePhysicalKey = (event) => {
      if (rulesOpen || daily.finished) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        handleKey(key);
      } else if (key === 'ENTER' || key === 'BACKSPACE') {
        event.preventDefault();
        handleKey(key);
      }
    };

    window.addEventListener('keydown', handlePhysicalKey);
    return () => window.removeEventListener('keydown', handlePhysicalKey);
  }, [daily.finished, handleKey, rulesOpen]);

  const toggleMode = () => {
    setMode((currentMode) => currentMode === 3 ? 4 : 3);
  };

  const closeRules = () => {
    writeStorage('trycat-rules-seen', 'true');
    setRulesOpen(false);
  };

  const resetCurrentGame = () => {
    updateCurrentGame(() => createGame(mode));
  };

  const statusMessage = game.status === 'won'
    ? `Solved ${game.answer.toUpperCase()} in ${game.guesses.length} ${game.guesses.length === 1 ? 'try' : 'tries'}!`
    : game.message || 'Choose your letters and submit your guess.';

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <AppBar position="sticky" color="primary" elevation={2}>
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 3 }, minHeight: { xs: 56, sm: 64 } }}>
          <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ alignItems: 'center' }}>
            {mode === 3
              ? <PetsRoundedIcon sx={{ fontSize: { xs: 26, sm: 30 } }} />
              : <SetMealRoundedIcon sx={{ fontSize: { xs: 26, sm: 30 } }} />}
            <Typography component="h1" variant="h5" sx={{ fontWeight: 900, letterSpacing: 0, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>
              {mode === 3 ? 'Try Cat' : 'Try Fish'}
            </Typography>
            <Chip
              label={`${daily.wordNumber}/${daily.totalWords}`}
              size="small"
              aria-label={`Word ${daily.wordNumber} of ${daily.totalWords}`}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.16)',
                border: '1px solid rgba(255, 255, 255, 0.34)',
                color: 'inherit',
                fontWeight: 900,
              }}
            />
          </Stack>
          <Stack direction="row" spacing={0.5}>
            {import.meta.env.DEV && (
              <Tooltip title="Reset current game">
                <IconButton size="small" color="inherit" onClick={resetCurrentGame} aria-label="Reset current game">
                  <RestartAltRoundedIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={`Switch to ${mode === 3 ? 'Try Fish' : 'Try Cat'}`}>
              <IconButton
                size="small"
                color="inherit"
                onClick={toggleMode}
                aria-label={`Switch to ${mode === 3 ? 'Try Fish' : 'Try Cat'}`}
              >
                {mode === 3 ? <SetMealRoundedIcon /> : <PetsRoundedIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="How to play">
              <IconButton size="small" color="inherit" onClick={() => setRulesOpen(true)} aria-label="How to play">
                <HelpOutlineRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Paper
            elevation={2}
            sx={{
              width: '100%',
              borderRadius: '8px',
              py: { xs: 2, sm: 2.5 },
              px: { xs: 1.5, sm: 2.5 },
              bgcolor: 'background.paper',
            }}
          >
            <Box
              role="grid"
              aria-label={`${mode}-letter word board`}
              sx={{
                width: mode === 3 ? 206 : 248,
                maxWidth: '100%',
                mx: 'auto',
                display: 'grid',
                gap: '7px',
              }}
            >
              {boardRows.map((row, rowIndex) => (
                <Box
                  role="row"
                  key={`row-${rowIndex}`}
                  sx={{ display: 'grid', gridTemplateColumns: `repeat(${mode}, 1fr)`, gap: '7px' }}
                >
                  {row.map((cell, columnIndex) => {
                    const style = STATUS_STYLES[cell.status];
                    const statusLabel = cell.status === 'empty' ? 'not scored' : cell.status;
                    return (
                      <Box
                        role="gridcell"
                        aria-label={`Row ${rowIndex + 1}, letter ${columnIndex + 1}: ${cell.letter || 'blank'}, ${statusLabel}`}
                        key={`cell-${rowIndex}-${columnIndex}`}
                        sx={{
                          aspectRatio: '1',
                          borderRadius: '6px',
                          borderWidth: `${style.borderWidth}px`,
                          borderStyle: style.borderStyle,
                          borderColor: style.border,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: style.background,
                          color: style.color,
                          fontSize: mode === 3 ? 28 : 24,
                          fontWeight: 900,
                          textTransform: 'uppercase',
                        }}
                      >
                        {cell.letter}
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Paper>

          <Alert
            severity={game.status === 'won'
              ? 'success'
              : game.status === 'lost'
                ? 'info'
                : game.message
                  ? 'warning'
                  : 'info'}
            variant={game.status === 'playing' ? 'outlined' : 'filled'}
            role="status"
            aria-live="polite"
            sx={{ width: '100%', borderRadius: '8px', fontWeight: 700 }}
          >
            {statusMessage}
          </Alert>

          <Paper
            component="section"
            aria-label="On-screen keyboard"
            variant="outlined"
            sx={{
              width: '100%',
              p: { xs: 1, sm: 1.5 },
              borderRadius: '8px',
              bgcolor: 'background.paper',
            }}
          >
            {KEY_ROWS.map((row, rowIndex) => (
              <Box
                key={row.join('-')}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: rowIndex === 2
                    ? '1.35fr repeat(7, minmax(0, 1fr)) 1.15fr'
                    : `repeat(${row.length}, minmax(0, 1fr))`,
                  gap: { xs: '3px', sm: '6px' },
                  mb: { xs: '4px', sm: '7px' },
                  px: rowIndex === 1 ? { xs: 1.5, sm: 2.5 } : 0,
                }}
              >
                {row.map((key) => {
                  const status = keyboardState[key] || 'empty';
                  const style = STATUS_STYLES[status];
                  const label = key === 'BACKSPACE' ? 'Backspace' : key === 'ENTER' ? 'Submit guess' : key;
                  return (
                    <Button
                      key={key}
                      variant="contained"
                      aria-label={label}
                      aria-disabled={game.status !== 'playing'}
                      disableElevation
                      onClick={() => handleKey(key)}
                      sx={{
                        minWidth: 0,
                        width: '100%',
                        height: { xs: 42, sm: 46 },
                        px: 0,
                        borderRadius: '6px',
                        border: `${style.borderWidth}px ${style.borderStyle} ${style.border}`,
                        backgroundColor: style.background,
                        color: style.color,
                        fontSize: { xs: '0.78rem', sm: '0.9rem' },
                        fontWeight: 900,
                        '&:hover': { backgroundColor: style.background },
                      }}
                    >
                      {key === 'BACKSPACE' && <BackspaceRoundedIcon fontSize="small" />}
                      {key === 'ENTER' && <KeyboardReturnRoundedIcon fontSize="small" />}
                      {key !== 'BACKSPACE' && key !== 'ENTER' && key}
                    </Button>
                  );
                })}
              </Box>
            ))}
          </Paper>
        </Stack>
      </Container>

      <Dialog open={rulesOpen && !daily.finished} onClose={closeRules} maxWidth="xs" fullWidth>
        <DialogTitle>How to play</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography>Guess today&apos;s word in six tries.</Typography>
            <Typography><strong>Green:</strong> right letter, right place.</Typography>
            <Typography><strong>Yellow:</strong> right letter, different place.</Typography>
            <Typography><strong>Gray:</strong> the letter is not in the word.</Typography>
            <Typography>You can play one 3-letter word and one 4-letter word each day.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeRules} autoFocus>Let&apos;s play</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        fullScreen
        open={daily.finished}
        aria-labelledby="game-finished-title"
      >
        <Box
          sx={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            px: 3,
            textAlign: 'center',
            bgcolor: 'background.default',
          }}
        >
          <CelebrationRoundedIcon color="secondary" sx={{ fontSize: 72 }} />
          <Typography id="game-finished-title" component="h2" variant="h3" sx={{ fontWeight: 900 }}>
            Game finished
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 480 }}>
            All 100 days of Try Cat and Try Fish are complete. Thanks for playing!
          </Typography>
        </Box>
      </Dialog>
    </Box>
  );
}

export default App;
