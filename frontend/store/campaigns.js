import { loadCampaign, loadCampaigns } from "../lib/contracts";

const CAMPAIGNS_LOADED = "campaigns/loaded";
const CAMPAIGN_UPDATED = "campaigns/updated";

/** list === null berarti belum dimuat */
const initialState = { list: null };

export const campaignsReducer = (state = initialState, action) => {
  switch (action.type) {
    case CAMPAIGNS_LOADED:
      return { ...state, list: action.payload };
    case CAMPAIGN_UPDATED: {
      const list = state.list || [];
      const exists = list.some((campaign) => campaign.address === action.payload.address);
      return {
        ...state,
        list: exists
          ? list.map((campaign) => (campaign.address === action.payload.address ? action.payload : campaign))
          : [...list, action.payload],
      };
    }
    default:
      return state;
  }
};

export const loadAllCampaigns = () => async (dispatch, getState) => {
  const campaigns = await loadCampaigns(getState().wallet.web3);
  dispatch({ type: CAMPAIGNS_LOADED, payload: campaigns });
};

/** Muat ulang satu kampanye dari blockchain (setelah donasi / aksi penarikan dana) */
export const refreshCampaign = (address) => async (dispatch, getState) => {
  const campaign = await loadCampaign(getState().wallet.web3, address);
  dispatch({ type: CAMPAIGN_UPDATED, payload: campaign });
  return campaign;
};

export const selectCampaigns = (state) => state.campaigns.list;
export const selectCampaign = (address) => (state) =>
  state.campaigns.list?.find((campaign) => campaign.address === address);
