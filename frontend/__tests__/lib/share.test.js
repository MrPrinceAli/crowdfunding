/** @jest-environment node */
import { campaignUrl, shareLinks } from "../../lib/share";

describe("share", () => {
  test("campaignUrl memakai APP_URL jika ada", () => {
    expect(campaignUrl("0xabc", "https://himpun.example")).toBe("https://himpun.example/project-details/0xabc");
  });

  test("shareLinks meng-encode judul dan URL", () => {
    const links = shareLinks("https://x.id/project-details/0xabc", "Air bersih & sumur");
    expect(links.whatsapp).toContain("wa.me/?text=");
    expect(links.whatsapp).toContain(encodeURIComponent("Air bersih & sumur"));
    expect(links.x).toContain(`url=${encodeURIComponent("https://x.id/project-details/0xabc")}`);
    expect(links.telegram).toContain("t.me/share/url");
    expect(links.facebook).toContain("facebook.com/sharer");
  });
});
