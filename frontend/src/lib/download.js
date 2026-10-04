import { api } from "./api";

// ดาวน์โหลดรูปของโพสต์ (เฉพาะทีมงาน): ขอไฟล์ผ่าน Backend แล้วสั่งบันทึกลงเครื่อง
export async function downloadImage(imageId) {
  const blob = await api.blob(`/api/admin/images/${imageId}/download`);
  const ext = blob.type.includes("png") ? "png" : blob.type.includes("jpeg") ? "jpg" : "webp";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fangwitbok-${imageId.slice(0, 8)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function downloadMany(imageIds) {
  for (const id of imageIds) {
    await downloadImage(id);
    await new Promise((r) => setTimeout(r, 350)); // เว้นช่วงสั้น ๆ ให้เบราว์เซอร์ไม่บล็อกการดาวน์โหลดหลายไฟล์ติดกัน
  }
}
