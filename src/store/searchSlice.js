import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchParts, getBrands, getOffers } from '../api/parts.js';

export const loadBrands = createAsyncThunk('search/brands', async (number, { signal }) => {
  return getBrands(await fetchParts({ number, signal }));
});

export const loadOffers = createAsyncThunk('search/offers', async ({ number, brand }, { signal }) => {
  return getOffers(await fetchParts({ number, brand, signal }));
});

const initialState = {
  number: '',
  selectedBrand: '',
  brands: [],
  offers: [],
  brandsStatus: 'idle',
  offersStatus: 'idle',
  brandsError: '',
  offersError: '',
  brandsRequestId: null,
  offersRequestId: null,
};

const slice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    numberChanged: (_, action) => ({ ...initialState, number: action.payload }),
    brandSelected(state, action) {
      state.selectedBrand = action.payload;
      state.offers = [];
      state.offersError = '';
      state.offersStatus = 'idle';
      state.offersRequestId = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loadBrands.pending, (state, action) => {
        state.brandsStatus = 'loading';
        state.brandsError = '';
        state.brandsRequestId = action.meta.requestId;
      })
      .addCase(loadBrands.fulfilled, (state, action) => {
        if (state.brandsRequestId !== action.meta.requestId) return;
        state.brands = action.payload;
        state.brandsStatus = 'succeeded';
        state.brandsRequestId = null;
      })
      .addCase(loadBrands.rejected, (state, action) => {
        if (state.brandsRequestId !== action.meta.requestId) return;
        state.brandsStatus = action.meta.aborted ? 'idle' : 'failed';
        state.brandsError = action.meta.aborted ? '' : action.error.message;
        state.brandsRequestId = null;
      })
      .addCase(loadOffers.pending, (state, action) => {
        state.offersStatus = 'loading';
        state.offersError = '';
        state.offersRequestId = action.meta.requestId;
      })
      .addCase(loadOffers.fulfilled, (state, action) => {
        if (state.offersRequestId !== action.meta.requestId) return;
        state.offers = action.payload;
        state.offersStatus = 'succeeded';
        state.offersRequestId = null;
      })
      .addCase(loadOffers.rejected, (state, action) => {
        if (state.offersRequestId !== action.meta.requestId) return;
        state.offersStatus = action.meta.aborted ? 'idle' : 'failed';
        state.offersError = action.meta.aborted ? '' : action.error.message;
        state.offersRequestId = null;
      });
  },
});

export const { numberChanged, brandSelected } = slice.actions;
export default slice.reducer;
