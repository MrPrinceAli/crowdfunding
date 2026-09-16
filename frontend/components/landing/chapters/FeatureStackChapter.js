import { ABANDON_PERIOD_DAYS, QUORUM_PERCENT, VOTING_PERIOD_DAYS } from "../../../lib/campaign";
import { useI18n } from "../../providers/PreferencesProvider";
import { BanIcon, ShieldIcon, WalletIcon } from "../../ui/Icons";
import { Eyebrow } from "./shared";

// ---------------------------------------------------------------------------
// Fitur — kartu bertumpuk (sticky), tiap kartu punya gaya berbeda
// ---------------------------------------------------------------------------

const EVENT_LOG = [
  ["FundingReceived", "+4.5 ETH"],
  ["WithdrawRequestCreated", "#1"],
  ["WithdrawRequestApproved", "6/10"],
  ["WithdrawCompleted", "1.0 ETH"],
];

const FeatureStackChapter = () => {
  const { t } = useI18n();
  const cards = [
    {
      title: t("landing.feature1Title"),
      text: t("landing.feature1Text"),
      style: { background: "var(--l-paper-raised)" },
      className: "l-line border",
      art: (
        <div className="l-line w-full overflow-hidden rounded-2xl border font-mono text-xs sm:text-sm">
          {EVENT_LOG.map(([event, value], index) => (
            <div key={event} className={`l-line flex justify-between gap-4 px-4 py-3 ${index ? "border-t" : ""}`}>
              <span className="truncate">{event}</span>
              <span className="l-accent font-bold">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t("landing.feature2Title"),
      text: t("landing.feature2Text", { days: VOTING_PERIOD_DAYS, quorum: QUORUM_PERCENT }),
      style: {
        background: "var(--l-ink)",
        color: "var(--l-paper)",
        "--l-muted": "color-mix(in srgb, var(--l-paper) 65%, transparent)",
      },
      art: (
        <p
          className="font-mono text-[clamp(4rem,10vw,8rem)] font-bold leading-none tracking-tighter"
          style={{ color: "var(--l-neon)" }}
        >
          50%+1
        </p>
      ),
    },
    {
      title: t("landing.feature3Title"),
      text: t("landing.feature3Text"),
      style: {
        background: "linear-gradient(135deg, #34d399, #0d9488)",
        color: "#04130d",
        "--l-muted": "rgba(4, 19, 13, 0.72)",
      },
      art: <WalletIcon className="h-40 w-40 opacity-80 sm:h-56 sm:w-56" />,
    },
    {
      title: t("landing.feature4Title"),
      text: t("landing.feature4Text", { days: ABANDON_PERIOD_DAYS }),
      style: { background: "var(--l-paper)", borderColor: "var(--l-gold)" },
      className: "border-2",
      art: (
        <p
          className="font-mono text-[clamp(6rem,14vw,11rem)] font-bold leading-none"
          style={{ color: "var(--l-gold)" }}
        >
          ↺
        </p>
      ),
    },
    {
      title: t("landing.feature5Title"),
      text: t("landing.feature5Text"),
      style: {
        background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
        color: "#f5f3ff",
        "--l-muted": "rgba(245, 243, 255, 0.75)",
      },
      art: (
        <div className="flex gap-4 opacity-90">
          <ShieldIcon className="h-24 w-24 sm:h-36 sm:w-36" />
          <BanIcon className="h-24 w-24 sm:h-36 sm:w-36" />
        </div>
      ),
    },
  ];

  return (
    <div className="py-10">
      <Eyebrow>{t("landing.bentoEyebrow")}</Eyebrow>
      <h2 className="mt-4 max-w-3xl text-[clamp(2.25rem,5.5vw,4.75rem)] font-extrabold leading-[0.98] tracking-tighter">
        {t("landing.bentoTitle")}
      </h2>
      <ol className="mt-12 space-y-[10vh] pb-[6vh]">
        {cards.map((card, index) => (
          <li
            key={card.title}
            className={`l-pin sticky grid min-h-[56vh] items-center gap-8 overflow-hidden rounded-[2.5rem] p-8 shadow-[0_-30px_80px_-40px_rgba(0,0,0,0.45)] sm:p-12 md:grid-cols-[1fr_auto] ${card.className || ""}`}
            style={{ top: `calc(5.5rem + ${index} * 1.4rem)`, ...card.style }}
          >
            <div>
              <p className="font-mono text-sm font-bold opacity-70">0{index + 1} / 05</p>
              <h3 className="mt-4 text-[clamp(2rem,4.5vw,3.75rem)] font-extrabold leading-none tracking-tighter">
                {card.title}
              </h3>
              <p className="l-muted mt-5 max-w-lg text-base sm:text-lg">{card.text}</p>
            </div>
            <div className="hidden justify-self-end md:flex">{card.art}</div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default FeatureStackChapter;
