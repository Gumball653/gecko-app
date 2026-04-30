import React, { useMemo, useRef, useState } from "react";
import { auth, storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { compressImage } from "./photoUtils";

function makePhotoId() {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function MobilePhotoUploader({ animalId = "unassigned", onUploaded }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState("Camera only — ready");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const canUpload = useMemo(() => Boolean(auth?.currentUser && storage), []);

  async function handlePick(event) {
    const originalFile = event.target.files?.[0];
    event.target.value = "";
    if (!originalFile) return;

    setError("");
    setProgress(0);
    setStatus("Preparing camera photo...");

    try {
      const compressed = await compressImage(originalFile, { maxWidth: 900, quality: 0.65 });
      const localPreview = URL.createObjectURL(compressed);
      setPreviewUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return localPreview;
      });

      if (!canUpload) {
        setStatus("Preview ready. Log in and configure Firebase Storage to upload.");
        return;
      }

      setStatus("Uploading photo...");
      const user = auth.currentUser;
      const safeAnimalId = animalId || "unassigned";
      const fileName = `${makePhotoId()}.jpg`;
      const fileRef = ref(storage, `users/${user.uid}/animals/${safeAnimalId}/photos/${fileName}`);
      const task = uploadBytesResumable(fileRef, compressed, { contentType: "image/jpeg" });

      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snapshot) => setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
          reject,
          resolve
        );
      });

      const url = await getDownloadURL(task.snapshot.ref);
      setStatus("Photo uploaded");
      onUploaded?.({ url, animalId: safeAnimalId, fileName, uploadedAt: new Date().toISOString() });
    } catch (err) {
      setError(err?.message || "Photo upload failed.");
      setStatus("Upload failed");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-950">Camera photo upload</h3>
          <p className="text-sm text-slate-500">Uses camera capture only to avoid iPhone photo-library freezes.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">
          Open Camera
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handlePick} className="hidden" />

      {previewUrl && <img src={previewUrl} alt="Camera upload preview" className="mb-3 max-h-64 w-full rounded-xl object-contain bg-slate-100" />}

      <p className="text-sm font-medium text-slate-700">{status}</p>
      {progress > 0 && progress < 100 && <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-600" style={{ width: `${progress}%` }} /></div>}
      {progress === 100 && <p className="mt-1 text-sm text-emerald-700">Upload complete.</p>}
      {error && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
    </section>
  );
}
