import { fireEvent, render, screen } from "@testing-library/react";
import CampaignCard from "../../components/campaign/CampaignCard";

// Kurs Rupiah diambil dari internet; di test cukup dianggap belum tersedia
jest.mock("../../lib/ethPrice", () => ({ useEthIdrPrice: () => null, formatIdr: () => "" }));

const campaign = {
  address: "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
  creator: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  title: "Beasiswa untuk 50 anak di pelosok",
  description: "Bantu biaya sekolah anak-anak di desa terpencil.",
  goalAmount: 10,
  raisedAmount: 6.5,
  progress: 65,
  state: "Fundraising",
  deadline: Math.floor(Date.now() / 1000) + 10 * 86400,
  activeVotingCount: 2,
  category: "Pendidikan",
  location: "Nusa Tenggara Timur",
  imageUrl: "",
  isVerified: true,
  reportCount: 1,
};

describe("CampaignCard", () => {
  test("menampilkan ringkasan kampanye", () => {
    render(<CampaignCard campaign={campaign} isMine />);

    expect(screen.getByText(campaign.title)).toBeInTheDocument();
    expect(screen.getByText("6,5 ETH")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByText("Kampanye saya")).toBeInTheDocument();
    expect(screen.getByText("Ada voting (2)")).toBeInTheDocument();
    expect(screen.getByText("Pendidikan")).toBeInTheDocument();
    expect(screen.getByText("Nusa Tenggara Timur")).toBeInTheDocument();
    expect(screen.getByText("Terverifikasi")).toBeInTheDocument();
    expect(screen.getByText("⚠ Dilaporkan 1x")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", `/project-details/${campaign.address}`);
  });

  test("tanpa badge tambahan untuk kampanye orang lain tanpa voting", () => {
    render(<CampaignCard campaign={{ ...campaign, activeVotingCount: 0, isVerified: false, reportCount: 0 }} />);

    expect(screen.queryByText("Kampanye saya")).not.toBeInTheDocument();
    expect(screen.queryByText(/Ada voting/)).not.toBeInTheDocument();
    expect(screen.queryByText("Terverifikasi")).not.toBeInTheDocument();
    expect(screen.queryByText(/Dilaporkan/)).not.toBeInTheDocument();
  });

  test("menampilkan gambar cover jika ada link gambar", () => {
    const { container } = render(
      <CampaignCard campaign={{ ...campaign, imageUrl: "https://example.com/cover.jpg" }} />,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  test("tombol favorit menyimpan kampanye ke localStorage", () => {
    window.localStorage.clear();
    render(<CampaignCard campaign={campaign} />);

    fireEvent.click(screen.getByRole("button", { name: "Simpan ke favorit" }));
    expect(screen.getByRole("button", { name: "Hapus dari favorit" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("himpun-favorites"))).toContain(campaign.address.toLowerCase());
  });
});
