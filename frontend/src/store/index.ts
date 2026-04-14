import { configureStore } from '@reduxjs/toolkit';
import pumpReducer from './slices/pumpSlice';
import sensorReducer from './slices/sensorSlice';
import alarmReducer from './slices/alarmSlice';
import simulationReducer from './slices/simulationSlice';

const store = configureStore({
  reducer: {
    pump: pumpReducer,
    sensor: sensorReducer,
    alarm: alarmReducer,
    simulation: simulationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
