import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

export async function uploadToIbon(pdfPath) {
  const absolutePath = path.resolve(pdfPath);
  const isCI = !!process.env.CI;
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false",
    channel: isCI ? undefined : "chrome",
  });

  const page = await browser.newPage();

  try {
    await page.goto("https://print.ibon.com.tw/ibonprinter", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.getByTestId("addFile-btn").waitFor({
      state: "visible",
      timeout: 15000,
    });

    const addFileBtn = page.getByTestId("addFile-btn");
    const tagName = await addFileBtn.evaluate((el) =>
      el.tagName.toLowerCase()
    );

    if (tagName === "input") {
      await addFileBtn.setInputFiles(absolutePath);
    } else {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(absolutePath);
    }

    await page.waitForTimeout(2000);

    await page.getByTestId("uploadAgreed").locator("span").nth(2).click();
    await page.getByTestId("uploadCommit-btn").click();

    await page.getByTestId("pickupId").waitFor({
      state: "visible",
      timeout: 60000,
    });

    const rawText = await page.getByTestId("pickupId").textContent();
    const code = rawText.trim();

    if (!code) {
      throw new Error("Pickup code is empty");
    }

    const expiryText = await page
      .locator("#QRcodeWrap .desc p")
      .textContent();
    const expiry = expiryText.trim();

    console.log(`ibon pickup code: ${code}`);
    console.log(`ibon expiry: ${expiry}`);
    return { code, expiry };
  } catch (error) {
    await page.screenshot({ path: "error-screenshot.png" }).catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}

const __filename = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1]) === __filename) {
  const pdfPath = process.argv[2] || "file/20260526-draw.pdf";
  uploadToIbon(pdfPath)
    .then((result) => console.log(`Done. Code: ${result.code}, Expiry: ${result.expiry}`))
    .catch((err) => {
      console.error("Upload failed:", err.message);
      process.exit(1);
    });
}
