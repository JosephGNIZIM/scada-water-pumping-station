import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Alarm, getAlarms, acknowledgeAlarm } from '../../services/api';

interface AlarmState {
    alarms: Alarm[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: AlarmState = {
    alarms: [],
    status: 'idle',
    error: null,
};

export const fetchAlarmsAsync = createAsyncThunk(
    'alarm/fetchAlarms',
    async () => {
        const response = await getAlarms();
        return response;
    }
);

export const acknowledgeAlarmAsync = createAsyncThunk(
    'alarm/acknowledgeAlarm',
    async (alarmId: number) => {
        return await acknowledgeAlarm(alarmId);
    }
);

const alarmSlice = createSlice({
    name: 'alarm',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAlarmsAsync.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchAlarmsAsync.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.alarms = action.payload;
            })
            .addCase(fetchAlarmsAsync.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to fetch alarms';
            })
            .addCase(acknowledgeAlarmAsync.fulfilled, (state, action) => {
                const updatedAlarm = action.payload;
                const alarm = state.alarms.find((entry) => entry.id === updatedAlarm.id);

                if (alarm) {
                    alarm.acknowledged = updatedAlarm.acknowledged;
                }
            });
    },
});

export default alarmSlice.reducer;
