import { useEffect } from "react";
import { compressImage } from "./photoUtils";

function makeFileList(files) {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}

async function optimizeInputFiles(input) {
  if (!input?.files?.length || input.dataset.optimizingPhotos === "true") return;

  const files = Array.from(input.files);
  const imageFiles = files.filter((file) => file.type?.startsWith("image/"));
  if (imageFiles.length === 0) return;

  input.dataset.optimizingPhotos = "true";
  input.disabled = true;

  try {
    const optimized = await Promise.all(
      files.map(async (file) => {
        if (!file.type?.startsWith("image/")) return file;
        return compressImage(file, { maxWidth: 1000, quality: 0.7 });
      })
    );

    input.files = makeFileList(optimized);
  } catch (error) {
    console.warn("Photo optimization skipped", error);
  } finally {
    input.disabled = false;
    window.setTimeout(() => {
      delete input.dataset.optimizingPhotos;
    }, 500);
  }
}

export default function PhotoInputOptimizer() {
  useEffect(() => {
    function handleChange(event) {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.type !== "file") return;
      if (!input.accept?.includes("image") && !Array.from(input.files || []).some((file) => file.type?.startsWith("image/"))) return;

      event.stopImmediatePropagation?.();
      event.stopPropagation();

      optimizeInputFiles(input).finally(() => {
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    document.addEventListener("change", handleChange, true);
    return () => document.removeEventListener("change", handleChange, true);
  }, []);

  return null;
}
