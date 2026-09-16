import { applyMiddleware, combineReducers, legacy_createStore as createStore } from "redux";
import { thunk } from "redux-thunk";
import { campaignsReducer } from "./campaigns";
import { walletReducer } from "./wallet";

// State sederhana tanpa SSR, jadi cukup satu store di sisi browser
export const store = createStore(
  combineReducers({ wallet: walletReducer, campaigns: campaignsReducer }),
  applyMiddleware(thunk),
);
