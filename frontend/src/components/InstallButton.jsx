import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useDialogs } from "./Dialogs";

// ปุ่ม "ติดตั้งเว็บเป็นแอป": Android/Chrome/Edge/Desktop ใช้ beforeinstallprompt, iPhone/iPad (Safari) แสดงวิธีเพิ่มลงหน้าจอหลัก
// ซ่อนอัตโนมัติถ้าติดตั้งแล้ว (เปิดแบบ standalone) หรือเบราว์เซอร์ติดตั้งไม่ได้
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export default function InstallButton() {
  const { confirm } = useDialogs();
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const ios = isIOS();

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (installed || (!evt && !ios)) return null;

  async function install() {
    if (evt) {
      evt.prompt();
      await evt.userChoice.catch(() => {});
      setEvt(null);
    } else {
      await confirm({
        title: "ติดตั้งเว็บไซต์เป็นแอป",
        message: "1. แตะปุ่มแชร์ (สี่เหลี่ยมมีลูกศรขึ้น) ใน Safari\n2. เลือก “เพิ่มลงในหน้าจอโฮม”\n3. แตะ “เพิ่ม”",
        confirmText: "เข้าใจแล้ว", cancelText: null, icon: "download",
      });
    }
  }

  return (
    <button onClick={install} className="btn-ghost !px-3 !py-2 text-xs" aria-label="ติดตั้งเว็บไซต์เป็นแอป">
      <Icon name="download" size={16} /> <span className="hidden min-[380px]:inline">ติดตั้งแอป</span>
    </button>
  );
}
