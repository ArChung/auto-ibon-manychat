import path from "path";
import { fileURLToPath } from "url";

const API_BASE = "https://api.manychat.com/fb/page";

async function setField(token, fieldName, fieldValue) {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${API_BASE}/setBotFieldByName`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        field_name: fieldName,
        field_value: fieldValue,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        console.log(`ManyChat bot field "${fieldName}" updated to: ${fieldValue}`);
        return data;
      }
      throw new Error(`ManyChat API error: ${JSON.stringify(data)}`);
    }

    if (res.status === 401 || res.status === 400) {
      const body = await res.text();
      throw new Error(
        `ManyChat API ${res.status}: ${body} (not retryable)`
      );
    }

    console.log(
      `ManyChat API attempt ${attempt}/${maxRetries} for "${fieldName}" failed (${res.status}), retrying...`
    );

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  throw new Error(`ManyChat API failed after ${maxRetries} attempts for "${fieldName}"`);
}

export async function updateBotField(code, expiry) {
  const token = process.env.MANYCHAT_API_TOKEN;
  if (!token) {
    throw new Error("MANYCHAT_API_TOKEN environment variable is not set");
  }

  await setField(token, "ibon_code", code);
  if (expiry) {
    await setField(token, "ibon_expiry", expiry);
  }
}

const __filename = fileURLToPath(import.meta.url);
if (path.resolve(process.argv[1]) === __filename) {
  const testCode = process.argv[2] || "TEST_CODE";
  updateBotField(testCode)
    .then(() => console.log("Done."))
    .catch((err) => {
      console.error("Update failed:", err.message);
      process.exit(1);
    });
}
