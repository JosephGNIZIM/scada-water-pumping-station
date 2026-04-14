import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getSensorReadings } from '../../services/api';

interface SensorState {
    readings: Array<{ id: number; type: string; value: number; timestamp: string }>;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: SensorState = {
    readings: [],
    status: 'idle',
    error: null,
};

export const fetchSensorReadingsAsync = createAsyncThunk(
    'sensor/fetchSensorReadings',
    async () => {
        const response = await getSensorReadings();
        return response;
    }
);

const sensorSlice = createSlice({
    name: 'sensor',
    initialState,
    reducers: {
        setSensorReadings(state, action: PayloadAction<Array<{ id: number; type: string; value: number; timestamp: string }>>) {
            state.readings = action.payload;
        },
        setSensorStatus(state, action: PayloadAction<string>) {
            state.status = action.payload as any;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSensorReadingsAsync.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchSensorReadingsAsync.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.readings = action.payload;
            })
            .addCase(fetchSensorReadingsAsync.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to fetch sensor readings';
            });
    },
});

export const { setSensorReadings, setSensorStatus } = sensorSlice.actions;

export default sensorSlice.reducer;