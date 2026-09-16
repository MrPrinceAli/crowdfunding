import { useState } from "react";
import { coverGradient } from "../../lib/campaign";
import { HandsIcon } from "../ui/Icons";

/** Cover kampanye: gambar dari URL jika ada, selain itu gradasi yang konsisten per alamat */
const CampaignCover = ({
  address,
  imageUrl,
  className = "h-36",
  iconClassName = "-bottom-6 -right-4 h-32 w-32",
  children,
}) => {
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${coverGradient(address)} ${className}`}>
      {showImage ? (
        <>
          {/* URL gambar bebas dari penggalang dana, jadi tidak lewat optimasi next/image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={() => setFailedUrl(imageUrl)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
        </>
      ) : (
        <>
          <div className="bg-grid absolute inset-0 opacity-40" />
          <HandsIcon
            className={`absolute text-white/20 transition duration-500 group-hover:scale-110 ${iconClassName}`}
          />
        </>
      )}
      {children}
    </div>
  );
};

export default CampaignCover;
