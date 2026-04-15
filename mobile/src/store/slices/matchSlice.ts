import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { matchAPI } from '../../services/api';
import { Match, Pagination } from '../../types';

interface MatchState {
  matches: Match[];
  currentMatch: Match | null;
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: MatchState = {
  matches: [],
  currentMatch: null,
  pagination: null,
  isLoading: false,
  error: null,
};

export const fetchMatches = createAsyncThunk(
  'matches/fetchAll',
  async (params: object | undefined, { rejectWithValue }) => {
    try {
      const res = await matchAPI.list(params);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load matches');
    }
  }
);

export const fetchMatch = createAsyncThunk(
  'matches/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await matchAPI.get(id);
      return res.data as Match;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load match');
    }
  }
);

export const createMatch = createAsyncThunk(
  'matches/create',
  async (data: object, { rejectWithValue }) => {
    try {
      const res = await matchAPI.create(data);
      return res.data as Match;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Failed to create match');
    }
  }
);

const matchSlice = createSlice({
  name: 'matches',
  initialState,
  reducers: {
    setCurrentMatch(state, action: PayloadAction<Match>) {
      state.currentMatch = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatches.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchMatches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.matches = action.payload.matches;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMatch.pending, (state) => { state.isLoading = true; })
      .addCase(fetchMatch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMatch = action.payload;
      })
      .addCase(fetchMatch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createMatch.fulfilled, (state, action) => {
        state.matches = [action.payload, ...state.matches];
        state.currentMatch = action.payload;
      });
  },
});

export const { setCurrentMatch, clearError } = matchSlice.actions;
export default matchSlice.reducer;
