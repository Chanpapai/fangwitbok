import { useEffect, useState } from "react";
import { api } from "../lib/api";
import PostCard from "../components/PostCard";

const TABS = [
  { key: "", label: "ทั้งหมด" },
  { key: "ANNOUNCE", label: "📣 ฝากบอก" },
  { key: "LOST_FOUND", label: "🔍 ตามหาของหาย" },
];

export default function Feed() {
  const [tab, setTab] = useState("");
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setPosts(null);
    api
      .get(`/api/posts${tab ? `?type=${tab}` : ""}`)
      .then((data) => setPosts(data.posts))
      .catch((err) => setError(err.message));
  }, [tab]);

  function handleChanged(id, updatedOrNull) {
    setPosts((prev) =>
      updatedOrNull === null ? prev.filter((p) => p.id !== id) : prev.map((p) => (p.id === id ? updatedOrNull : p))
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-24">
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
              tab === t.key ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {posts === null && !error && <p className="text-center text-slate-400 text-sm">กำลังโหลด...</p>}
      {posts?.length === 0 && <p className="text-center text-slate-400 text-sm">ยังไม่มีโพสต์ในหมวดนี้</p>}

      <div className="flex flex-col gap-3">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} onChanged={(updated) => handleChanged(post.id, updated)} />
        ))}
      </div>
    </div>
  );
}
