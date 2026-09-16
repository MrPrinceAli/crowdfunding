import { Contract, JsonRpcProvider } from "ethers";
import ProjectAbi from "./abi/Project.json";
import { APP_URL, CHAIN_ID, RPC_URL } from "./config";
import { weiToEther } from "./format";

const TIMEOUT_MS = 2500;

const withTimeout = (promise) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS))]);

/** Origin absolut untuk URL gambar pratinjau (APP_URL, atau dari header request) */
export const requestOrigin = (req) => {
  if (APP_URL) return APP_URL;
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.headers["x-forwarded-host"] || req.headers.host}`;
};

/**
 * Data ringkas kampanye untuk meta tag Open Graph (pratinjau link di WhatsApp, X, dll).
 * Dibaca di server; jika blockchain tidak bisa dihubungi, halaman tetap tampil tanpa pratinjau khusus.
 */
export const loadCampaignPreview = async (address) => {
  try {
    const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
    const contract = new Contract(address, ProjectAbi, provider);
    const [details, category, imageUrl] = await withTimeout(
      Promise.all([contract.getProjectDetails(), contract.category(), contract.imageUrl()]),
    );
    provider.destroy();

    const raised = weiToEther(details.currentAmount);
    const goal = weiToEther(details.goalAmount);
    return {
      title: details.title,
      description: details.description.slice(0, 200),
      category,
      imageUrl,
      raised,
      goal,
      progress: goal > 0 ? Math.round((raised / goal) * 100) : 0,
    };
  } catch {
    return null;
  }
};

/** URL gambar pratinjau dinamis (pages/api/og.js) */
export const previewImageUrl = (origin, preview) => {
  const params = new URLSearchParams({
    title: preview.title,
    category: preview.category,
    raised: String(+preview.raised.toFixed(4)),
    goal: String(+preview.goal.toFixed(4)),
    progress: String(preview.progress),
  });
  return `${origin}/api/og?${params}`;
};
