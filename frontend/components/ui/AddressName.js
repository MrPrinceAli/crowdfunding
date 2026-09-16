import Link from "next/link";
import { coverGradient } from "../../lib/campaign";
import { useIdentity } from "../providers/IdentityProvider";

/** Avatar ENS, atau gradasi warna yang konsisten per alamat */
export const Avatar = ({ address, className = "h-9 w-9" }) => {
  const { identityOf } = useIdentity([address]);
  const { avatar } = identityOf(address);
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt="" className={`flex-shrink-0 rounded-full object-cover ${className}`} />;
  }
  return <span className={`flex-shrink-0 rounded-full bg-gradient-to-br ${coverGradient(address)} ${className}`} />;
};

/**
 * Nama tampilan sebuah alamat. Nama profil tidak unik, jadi alamat lengkap selalu ada di tooltip
 * dan `withAddress` menampilkan alamat singkat di sampingnya.
 */
const AddressName = ({ address, href, withAddress = false, className = "" }) => {
  const { identityOf } = useIdentity([address]);
  const identity = identityOf(address);

  const content = identity.name ? (
    <>
      <span className="truncate">{identity.name}</span>
      {withAddress && <span className="text-faint ml-1.5 font-mono text-[0.85em] font-normal">{identity.short}</span>}
    </>
  ) : (
    <span className="truncate font-mono">{identity.short}</span>
  );

  const props = { title: address, className: `inline-flex min-w-0 max-w-full items-baseline ${className}` };
  return href ? (
    <Link href={href} {...props}>
      {content}
    </Link>
  ) : (
    <span {...props}>{content}</span>
  );
};

export default AddressName;
