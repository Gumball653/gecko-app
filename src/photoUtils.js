function waitForIdle() {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(resolve, { timeout: 500 });
    else window.setTimeout(resolve, 50);
  });
}

async function decodeWithImageElement(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // URL is revoked after canvas draw by caller to avoid blank image on Safari.
  }
}

export async function compressImage(file, options = {}) {
  const maxWidth = options.maxWidth || 900;
  const quality = options.quality || 0.65;

  if (!file || !file.type?.startsWith("image/")) return file;

  await waitForIdle();

  let source;
  let objectUrl = "";

  try {
    if ("createImageBitmap" in window) {
      source = await createImageBitmap(file, { resizeWidth: maxWidth, resizeQuality: "high" }).catch(() => null);
    }

    if (!source) {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = "async";
      img.src = objectUrl;
      await img.decode();
      source = img;
    }

    const sourceWidth = source.width;
    const sourceHeight = source.height;
    const scale = Math.min(1, maxWidth / sourceWidth);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(source, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    source.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);

    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    source?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export function makeObjectPreview(file) {
  return URL.createObjectURL(file);
}
