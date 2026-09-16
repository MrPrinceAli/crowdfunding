/** Tautan berbagi kampanye ke media sosial */
export const shareLinks = (url, title, text = `Yuk bantu kampanye "${title}"`) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
};

/** URL absolut sebuah halaman kampanye */
export const campaignUrl = (address, appUrl = "") => {
  const origin = appUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}/project-details/${address}`;
};
