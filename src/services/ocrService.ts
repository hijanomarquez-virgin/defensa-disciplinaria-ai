import Tesseract from "tesseract.js";

export async function runOCR(base64Image: string) {
  const result = await Tesseract.recognize(
    base64Image,
    "spa",
    {
      logger: (m) => console.log(m)
    }
  );

  return result.data.text;
}