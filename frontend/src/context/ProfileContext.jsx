import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { getSavedProfile, patchProfile } from "../lib/guest";
import { makeAvatar } from "../lib/image";
import { parseSocialUrl } from "../lib/social";

// โปรไฟล์: ทีมงาน (มีบัญชี) = เก็บที่ฐานข้อมูล ซิงค์ทุกอุปกรณ์ · ผู้เข้าชมทั่วไป (ไม่มีบัญชี) = เก็บในเครื่องนี้เท่านั้น
// ลิงก์ IG/FB เป็นข้อมูลส่วนตัว ไม่ถูกส่งให้ใคร จนกว่าผู้ใช้จะเลือกแนบในโพสต์เอง
// รูปโปรไฟล์: ผู้ใช้อัปโหลดเอง — ดึงรูปจาก Instagram/Facebook อัตโนมัติไม่ได้ (ต้องมีสิทธิ์ OAuth ของเจ้าของบัญชี) จึงใช้รูปสำรองเมื่อไม่มีรูป
const Ctx = createContext(null);

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [local, setLocal] = useState(getSavedProfile);
  const [remote, setRemote] = useState(null);

  useEffect(() => {
    if (!user) { setRemote(null); return; }
    let live = true;
    api.get("/api/profile").then((d) => live && setRemote(d.profile)).catch(() => {});
    return () => { live = false; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const profile = useMemo(() => user
    ? { synced: true, name: user.displayName, className: "", instagramUrl: remote?.instagramUrl || "", facebookUrl: remote?.facebookUrl || "", avatarUrl: remote?.avatarUrl ?? user.avatarUrl ?? null }
    : { synced: false, name: local.name || "", className: local.className || "", instagramUrl: local.instagramUrl || "", facebookUrl: local.facebookUrl || "", avatarUrl: local.avatar || null },
  [user, remote, local]);

  const saveLocal = (patch) => { patchProfile(patch); setLocal(getSavedProfile()); };

  // บันทึกชื่อ/ชั้น (เฉพาะผู้เข้าชมทั่วไป) + ลิงก์ — ตรวจลิงก์ก่อนบันทึกเสมอ (Backend ตรวจซ้ำ)
  const save = useCallback(async ({ name, className, instagramUrl, facebookUrl }) => {
    const ig = parseSocialUrl(instagramUrl, ["INSTAGRAM"]);
    if (ig.error) throw new Error(`Instagram: ${ig.error}`);
    const fb = parseSocialUrl(facebookUrl, ["FACEBOOK"]);
    if (fb.error) throw new Error(`Facebook: ${fb.error}`);
    if (user) {
      const d = await api.put("/api/profile", { instagramUrl: ig.url || "", facebookUrl: fb.url || "" });
      setRemote(d.profile);
    } else {
      saveLocal({ name: (name || "").trim().slice(0, 60), className: (className || "").trim().slice(0, 30), instagramUrl: ig.url || "", facebookUrl: fb.url || "" });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAvatar = useCallback(async (file) => {
    const { blob, dataUrl } = await makeAvatar(file, user ? 256 : 160);
    if (user) {
      const form = new FormData();
      form.append("image", new File([blob], "avatar.webp", { type: "image/webp" }));
      const d = await api.postForm("/api/profile/avatar", form);
      setRemote(d.profile);
    } else {
      try { saveLocal({ avatar: dataUrl }); } catch { throw new Error("บันทึกรูปในเครื่องไม่ได้ (พื้นที่เต็ม)"); }
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAvatar = useCallback(async () => {
    if (user) { const d = await api.del("/api/profile/avatar"); setRemote(d.profile); }
    else saveLocal({ avatar: null });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={{ profile, save, setAvatar, clearAvatar }}>{children}</Ctx.Provider>;
}

export const useProfile = () => useContext(Ctx);
