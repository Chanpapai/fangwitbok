import { Link } from "react-router-dom";
import { MegaphoneIcon, SearchIcon } from "../components/Icons";

export default function Home() {
  return (
    <div className="max-w-xl mx-auto px-6 min-h-[calc(100vh-56px)] flex flex-col items-center justify-center text-center gap-8 pb-20">
      <img src="/logo.webp" alt="FangwitBok V2" className="w-48 sm:w-56 drop-shadow-xl" />
      <p className="text-sm text-slate-500 dark:text-slate-400 -mt-4">ฝากบอก • ตามหาของหาย ของคนในโรงเรียน</p>

      <div className="w-full flex flex-col gap-3">
        <Link to="/feed" className="btn-primary w-full py-3.5 text-base inline-flex items-center justify-center gap-2">
          <SearchIcon size={18} /> ดูโพสต์
        </Link>
        <Link to="/create" className="btn-ghost w-full py-3.5 text-base inline-flex items-center justify-center gap-2">
          <MegaphoneIcon size={18} /> ฝากบอก
        </Link>
      </div>
    </div>
  );
}
