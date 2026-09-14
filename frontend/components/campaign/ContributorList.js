import { coverGradient } from "../../lib/campaign";
import { formatEth, shortAddress } from "../../lib/format";
import { UsersIcon } from "../ui/Icons";
import Loader from "../ui/Loader";

const ContributorList = ({ contributors }) => (
  <div className="card p-6">
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-bold text-slate-900">
        <UsersIcon className="h-5 w-5 text-slate-400" />
        Donatur
      </h2>
      <span className="badge bg-slate-100 text-slate-600">{contributors?.length ?? 0}</span>
    </div>

    <div className="mt-4 max-h-96 space-y-1 overflow-y-auto">
      {!contributors ? (
        <Loader label="Memuat donatur..." />
      ) : contributors.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Belum ada donatur. Jadilah yang pertama!</p>
      ) : (
        contributors.map(({ contributor, amount }) => (
          <div key={contributor} className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50">
            <span className={`h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br ${coverGradient(contributor)}`} />
            <p className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700">{shortAddress(contributor)}</p>
            <p className="text-sm font-bold text-slate-900">{formatEth(amount)}</p>
          </div>
        ))
      )}
    </div>
  </div>
);

export default ContributorList;
