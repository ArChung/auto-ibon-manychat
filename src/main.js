import fs from "fs";
import path from "path";
import { uploadToIbon } from "./ibon-upload.js";
import { updateBotField } from "./manychat-update.js";

function findLatestPdf() {
  const dir = "file";
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory "${dir}" does not exist`);
  }

  const pdfs = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((f) => ({
      name: f,
      path: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (pdfs.length === 0) {
    throw new Error(`No PDF files found in "${dir}" directory`);
  }

  return pdfs[0].path;
}

async function run() {
  const pdfPath = process.env.PDF_PATH || findLatestPdf();
  console.log(`Using PDF: ${pdfPath}`);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }

  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n--- Attempt ${attempt}/${maxRetries} ---`);

      const code = await uploadToIbon(pdfPath);
      await updateBotField(code);

      console.log(`\nSuccess! ibon code: ${code}`);

      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(
          process.env.GITHUB_OUTPUT,
          `ibon_code=${code}\n`
        );
      }

      return;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed: ${error.message}`);

      if (error.message.includes("not retryable")) {
        throw error;
      }

      if (attempt < maxRetries) {
        console.log("Retrying in 10 seconds...");
        await new Promise((r) => setTimeout(r, 10000));
      }
    }
  }

  throw new Error(
    `All ${maxRetries} attempts failed. Last error: ${lastError.message}`
  );
}

run().catch((err) => {
  console.error(`\nFATAL: ${err.message}`);
  process.exit(1);
});
