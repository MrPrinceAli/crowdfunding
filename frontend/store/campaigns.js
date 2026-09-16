import { loadCampaign, loadCampaigns } from "../lib/contracts";

const CAMPAIGNS_LOADED = "campaigns/loaded";
const CAMPAIGNS_FAILED = "campaigns/failed";
const CAMPAIGN_UPDATED = "campaigns/updated";

/** list === null berarti belum dimuat; error berisi pesan jika blockchain tidak bisa dihubungi */
const initialState = { list: null, error: null };

export const campaignsReducer = (state = initialState, action) => {
  switch (action.type) {
    case CAMPAIGNS_LOADED:
      return { list: action.payload, error: null };
    case CAMPAIGNS_FAILED:
      return { ...state, error: action.payload };
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

export const loadAllCampaigns = () => async (dispatch) => {
  try {
    dispatch({ type: CAMPAIGNS_LOADED, payload: await loadCampaigns() });
  } catch (error) {
    console.error("Gagal memuat kampanye:", error);
    dispatch({ type: CAMPAIGNS_FAILED, payload: error.shortMessage || error.message });
  }
};

/** Muat ulang satu kampanye dari blockchain (setelah donasi / aksi penarikan dana) */
export const refreshCampaign = (address) => async (dispatch) => {
  const campaign = await loadCampaign(address);
  dispatch({ type: CAMPAIGN_UPDATED, payload: campaign });
  return campaign;
};

export const selectCampaigns = (state) => state.campaigns.list;
export const selectCampaignsError = (state) => state.campaigns.error;
export const selectCampaign = (address) => (state) =>
  state.campaigns.list?.find((campaign) => campaign.address === address);
