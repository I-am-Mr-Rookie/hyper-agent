import Link from "next/link";

export function Logo() {
  return (
    <Link className="brand" href="/" aria-label="AlgoRise home">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>Algo<span>Rise</span></span>
    </Link>
  );
}
