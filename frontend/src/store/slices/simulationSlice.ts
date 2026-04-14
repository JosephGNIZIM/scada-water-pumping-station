import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getSimulationReport, getSimulationScenarios, getSimulationState, SimulationReport, SimulationScenario, SimulationState } from '../../services/api';

interface SimulationStoreState {
    state: SimulationState | null;
    scenarios: SimulationScenario[];
    report: SimulationReport | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: SimulationStoreState = {
    state: null,
    scenarios: [],
    report: null,
    status: 'idle',
    error: null,
};

export const fetchSimulationStateAsync = createAsyncThunk(
    'simulation/fetchState',
    async () => getSimulationState(),
);

export const fetchSimulationScenariosAsync = createAsyncThunk(
    'simulation/fetchScenarios',
    async () => getSimulationScenarios(),
);

export const fetchSimulationReportAsync = createAsyncThunk(
    'simulation/fetchReport',
    async () => getSimulationReport(),
);

const simulationSlice = createSlice({
    name: 'simulation',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchSimulationStateAsync.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchSimulationStateAsync.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.state = action.payload;
                state.error = null;
            })
            .addCase(fetchSimulationStateAsync.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to fetch simulation state';
            })
            .addCase(fetchSimulationScenariosAsync.fulfilled, (state, action) => {
                state.scenarios = action.payload;
            })
            .addCase(fetchSimulationReportAsync.fulfilled, (state, action) => {
                state.report = action.payload;
            });
    },
});

export default simulationSlice.reducer;
