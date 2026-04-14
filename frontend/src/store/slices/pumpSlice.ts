import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getPumpStatus, startPump as startPumpRequest, stopPump as stopPumpRequest } from '../../services/api';

interface PumpState {
    id: number;
    status: string;
    lastUpdated: string;
    loading: boolean;
    commandLoading: boolean;
    error: string | null;
}

const initialState: PumpState = {
    id: 1,
    status: 'unknown',
    lastUpdated: new Date().toISOString(),
    loading: false,
    commandLoading: false,
    error: null,
};

export const fetchPumpStatusAsync = createAsyncThunk(
    'pump/fetchPumpStatus',
    async () => {
        const response = await getPumpStatus();
        return response;
    }
);

export const startPumpAsync = createAsyncThunk(
    'pump/startPump',
    async (pumpId: number) => {
        const response = await startPumpRequest(pumpId);
        return response;
    }
);

export const stopPumpAsync = createAsyncThunk(
    'pump/stopPump',
    async (pumpId: number) => {
        const response = await stopPumpRequest(pumpId);
        return response;
    }
);

const pumpSlice = createSlice({
    name: 'pump',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPumpStatusAsync.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchPumpStatusAsync.fulfilled, (state, action) => {
                state.loading = false;
                state.id = action.payload.id;
                state.status = action.payload.status;
                state.lastUpdated = action.payload.lastUpdated;
                state.error = null;
            })
            .addCase(fetchPumpStatusAsync.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch pump status';
            })
            .addCase(startPumpAsync.pending, (state) => {
                state.commandLoading = true;
            })
            .addCase(startPumpAsync.fulfilled, (state, action) => {
                state.commandLoading = false;
                state.id = action.payload.id;
                state.status = action.payload.status;
                state.lastUpdated = action.payload.lastUpdated;
                state.error = null;
            })
            .addCase(startPumpAsync.rejected, (state, action) => {
                state.commandLoading = false;
                state.error = action.error.message || 'Failed to start pump';
            })
            .addCase(stopPumpAsync.pending, (state) => {
                state.commandLoading = true;
            })
            .addCase(stopPumpAsync.fulfilled, (state, action) => {
                state.commandLoading = false;
                state.id = action.payload.id;
                state.status = action.payload.status;
                state.lastUpdated = action.payload.lastUpdated;
                state.error = null;
            })
            .addCase(stopPumpAsync.rejected, (state, action) => {
                state.commandLoading = false;
                state.error = action.error.message || 'Failed to stop pump';
            });
    },
});

export default pumpSlice.reducer;
