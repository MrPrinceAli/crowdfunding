import { byteLength, MAX_NAME_BYTES } from "../../components/profile/DisplayNameForm";

describe("DisplayNameForm", () => {
  test("panjang nama dihitung dalam byte UTF-8 seperti di contract", () => {
    expect(MAX_NAME_BYTES).toBe(32);
    expect(byteLength("Yayasan")).toBe(7);
    expect(byteLength("Café")).toBe(5);
    expect(byteLength("🙏")).toBe(4);
  });
});
