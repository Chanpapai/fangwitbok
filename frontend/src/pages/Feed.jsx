import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import PostCard from "../components/PostCard";
import Icon from "../components/Icon";

const TABS = [
  { key: "", label: "ทั้งหมด" },
  { key: "ANNOUNCE", label: "ฝากบอก" },
  { key: "LOST_FOUND", label: "ตามหาของหาย" },
];

function Skeleton() {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="skeleton h-4 w-1/3 rounded" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-28 w-full rounded-xl" />
    </div>
  );
}

export default function Feed() {
  const [tab, setTab] = useState("");
  const [posts, setPosts] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [slow, setSlow] = useState(false);

  const fetchPage = useCallback((type, p) => api.get(`/api/posts?page=${p}${type ? `&type=${type}` : ""}`), []);

  useEffect(() => {
    let cancelled = false;
    setPosts(null); setError(""); setSlow(false); setPage(1);
    // Free Tier ของ Backend อาจ "หลับ" เมื่อไม่มีคนใช้ — ตื่นครั้งแรกอาจช้า 30-60 วินาที ข้อมูลไม่หาย
    const slowTimer = setTimeout(() => !cancelled && setSlow(true), 4000);
    fetchPage(tab, 1)
      .then((d) => { if (!cancelled) { setPosts(d.posts); setHasMore(d.hasMore); } })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => clearTimeout(slowTimer));
    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, [tab, fetchPage]);

  async function more() {
    setLoadingMore(true);
    try {
      const d = await fetchPage(tab, page + 1);
      setPosts((prev) => [...prev, ...d.posts.filter((p) => !prev.some((x) => x.id === p.id))]);
      setPage(page + 1);
      setHasMore(d.hasMore);
    } catch (e) { setError(e.message); }
    finally { setLoadingMore(false); }
  }

  const handleChanged = (id, updated) =>
    setPosts((prev) => (updated === null ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? updated : p))));

  return (
    <div className="relative z-10 max-w-xl mx-auto px-4 py-4 pb-28">
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`chip ${tab === t.key ? "chip-on" : "chip-off"}`}>{t.label}</button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}
      {posts === null && !error && (
        <div className="flex flex-col gap-3">
          {slow && <p className="text-xs text-center text-slate-400">กำลังปลุกเซิร์ฟเวอร์ ครั้งแรกอาจใช้เวลาประมาณ 30–60 วินาที...</p>}
          <Skeleton /><Skeleton />
        </div>
      )}
      {posts?.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Icon name="megaphone" size={36} className="mx-auto mb-3 opacity-60" />
          <p className="text-sm">ยังไม่มีโพสต์ในหมวดนี้</p>
          <Link to="/new" className="btn-primary mt-4">เป็นคนแรกที่ฝากบอก</Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {posts?.map((post) => <PostCard key={post.id} post={post} onChanged={(u) => handleChanged(post.id, u)} />)}
      </div>

      {hasMore && (
        <button onClick={more} disabled={loadingMore} className="btn-ghost w-full mt-4 py-3">{loadingMore ? "กำลังโหลด..." : "โหลดโพสต์เพิ่ม"}</button>
      )}
    </div>
  );
}
