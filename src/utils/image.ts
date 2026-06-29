export const IMAGE_ERROR_CODES = {
  DECODE_FAILED: "DECODE_FAILED",
  NOT_IMAGE: "NOT_IMAGE",
  READ_FAILED: "READ_FAILED",
  TOO_LARGE: "TOO_LARGE",
} as const;

export type ImageErrorCode = typeof IMAGE_ERROR_CODES[keyof typeof IMAGE_ERROR_CODES];

export class ImageError extends Error {
  code: ImageErrorCode;

  constructor(code: ImageErrorCode) {
    super(code);
    this.code = code;
  }
}

export function compressDishPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new ImageError(IMAGE_ERROR_CODES.NOT_IMAGE));
  }
  if (file.size > 8 * 1024 * 1024) {
    return Promise.reject(new ImageError(IMAGE_ERROR_CODES.TOO_LARGE));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ImageError(IMAGE_ERROR_CODES.READ_FAILED));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new ImageError(IMAGE_ERROR_CODES.DECODE_FAILED));
      image.onload = () => {
        const maxSize = 720;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
