import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inningsAPI, matchAPI } from '../../services/api';
import { BallInput, BallResult, Innings, InningsUpdate, Match } from '../../types';

interface ScoringState {
  match: Match | null;
  innings: Innings | null;
  inningsUpdate: InningsUpdate | null;
  commentaryFeed: string[];
  lastBall: BallResult | null;
  isLoading: boolean;
  error: string | null;
  isLiveConnected: boolean;
}

const initialState: ScoringState = {
  match: null,
  innings: null,
  inningsUpdate: null,
  commentaryFeed: [],
  lastBall: null,
  isLoading: false,
  error: null,
  isLiveConnected: false,
};

export const fetchMatch = createAsyncThunk(
  'scoring/fetchMatch',
  async (matchId: string, { rejectWithValue }) => {
    try {
      const res = await matchAPI.get(matchId);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load match');
    }
  }
);

export const processBall = createAsyncThunk(
  'scoring/processBall',
  async ({ inningsId, ball }: { inningsId: string; ball: BallInput }, { rejectWithValue }) => {
    try {
      const res = await inningsAPI.processBall(inningsId, ball);
      return res.data as BallResult;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to process ball');
    }
  }
);

export const undoLastBall = createAsyncThunk(
  'scoring/undoLastBall',
  async (inningsId: string, { rejectWithValue }) => {
    try {
      const res = await inningsAPI.undoBall(inningsId);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to undo ball');
    }
  }
);

export const endOver = createAsyncThunk(
  'scoring/endOver',
  async (inningsId: string, { rejectWithValue }) => {
    try {
      const res = await inningsAPI.endOver(inningsId);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to end over');
    }
  }
);

const scoringSlice = createSlice({
  name: 'scoring',
  initialState,
  reducers: {
    setLiveConnected(state, action: PayloadAction<boolean>) {
      state.isLiveConnected = action.payload;
    },
    liveUpdate(state, action: PayloadAction<BallResult>) {
      state.lastBall = action.payload;
      state.inningsUpdate = action.payload.inningsUpdate;
      if (action.payload.commentary) {
        state.commentaryFeed = [action.payload.commentary, ...state.commentaryFeed.slice(0, 49)];
      }
    },
    setInningsUpdate(state, action: PayloadAction<InningsUpdate>) {
      if (!state.inningsUpdate) {
        state.inningsUpdate = action.payload;
      }
    },
    clearError(state) {
      state.error = null;
    },
    resetScoring() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatch.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchMatch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.match = action.payload;
      })
      .addCase(fetchMatch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(processBall.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(processBall.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastBall = action.payload;
        state.inningsUpdate = action.payload.inningsUpdate;
        if (action.payload.commentary) {
          state.commentaryFeed = [action.payload.commentary, ...state.commentaryFeed.slice(0, 49)];
        }
      })
      .addCase(processBall.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(undoLastBall.fulfilled, (state, action) => {
        state.inningsUpdate = action.payload.inningsUpdate;
      })
      .addCase(endOver.fulfilled, (state) => {
        state.isLoading = false;
      });
  },
});

export const { setLiveConnected, liveUpdate, setInningsUpdate, clearError, resetScoring } = scoringSlice.actions;
export default scoringSlice.reducer;
