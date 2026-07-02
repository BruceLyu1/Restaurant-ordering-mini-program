import { afterEach, describe, expect, it, vi } from "vitest";
import { compressDishPhoto, IMAGE_ERROR_CODES, ImageError } from "../image";

function stubSuccessfulFileReader(): void {
  vi.stubGlobal("FileReader", class {
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    result: string | ArrayBuffer | null = null;

    readAsDataURL(): void {
      this.result = "data:image/png;base64,cG5n";
      this.onload?.();
    }
  });
}

function stubImageLoad(): void {
  vi.stubGlobal("Image", class {
    height = 1;
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    width = 1;

    set src(_value: string) {
      this.onload?.();
    }
  });
}

describe("compressDishPhoto", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects non-image files with NOT_IMAGE", async () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" });

    await expect(compressDishPhoto(file)).rejects.toMatchObject({ code: IMAGE_ERROR_CODES.NOT_IMAGE });
  });

  it("rejects files larger than 8MB with TOO_LARGE", async () => {
    const file = new File(["content"], "large.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 8 * 1024 * 1024 + 1 });

    await expect(compressDishPhoto(file)).rejects.toMatchObject({ code: IMAGE_ERROR_CODES.TOO_LARGE });
  });

  it("rejects files that fail FileReader with READ_FAILED", async () => {
    vi.stubGlobal("FileReader", class {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      result: string | ArrayBuffer | null = null;

      readAsDataURL(): void {
        this.onerror?.();
      }
    });

    const file = new File(["png"], "dish.png", { type: "image/png" });

    await expect(compressDishPhoto(file)).rejects.toMatchObject({ code: IMAGE_ERROR_CODES.READ_FAILED });
  });

  it("rejects files that fail image decode with DECODE_FAILED", async () => {
    stubSuccessfulFileReader();
    vi.stubGlobal("Image", class {
      height = 1;
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      width = 1;

      set src(_value: string) {
        this.onerror?.();
      }
    });

    const file = new File(["png"], "dish.png", { type: "image/png" });

    await expect(compressDishPhoto(file)).rejects.toMatchObject({ code: IMAGE_ERROR_CODES.DECODE_FAILED });
  });

  it("rejects with DECODE_FAILED when canvas context is unavailable", async () => {
    stubSuccessfulFileReader();
    stubImageLoad();
    vi.spyOn(document, "createElement").mockReturnValue({
      getContext: () => null,
      height: 0,
      toDataURL: () => "data:image/jpeg;base64,",
      width: 0,
    } as unknown as HTMLCanvasElement);

    const file = new File(["png"], "dish.png", { type: "image/png" });

    await expect(compressDishPhoto(file)).rejects.toMatchObject({ code: IMAGE_ERROR_CODES.DECODE_FAILED });
  });

  it("resolves with a base64 jpeg data URL for valid images", async () => {
    stubSuccessfulFileReader();
    stubImageLoad();
    const drawImage = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      getContext: () => ({ drawImage }),
      height: 0,
      toDataURL: () => "data:image/jpeg;base64,Y29tcHJlc3NlZA==",
      width: 0,
    } as unknown as HTMLCanvasElement);

    const file = new File(["png"], "dish.png", { type: "image/png" });

    await expect(compressDishPhoto(file)).resolves.toBe("data:image/jpeg;base64,Y29tcHJlc3NlZA==");
    expect(drawImage).toHaveBeenCalled();
  });
});

describe("ImageError", () => {
  it("has the correct code property", () => {
    const err = new ImageError(IMAGE_ERROR_CODES.NOT_IMAGE);

    expect(err.code).toBe(IMAGE_ERROR_CODES.NOT_IMAGE);
    expect(err).toBeInstanceOf(Error);
  });
});
