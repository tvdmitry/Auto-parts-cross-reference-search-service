import { configureStore } from '@reduxjs/toolkit';
import search from './searchSlice.js';

export const store = configureStore({ reducer: { search } });
