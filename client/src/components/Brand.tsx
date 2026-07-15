import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/">
      <img src="/brand-mark.svg" alt="" />
      <span>
        <strong>Study Bank</strong>
        {!compact ? <small>Colorado Gamma · CSU</small> : null}
      </span>
    </Link>
  );
}
