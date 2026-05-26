import path from "path";
import { fileURLToPath } from "url";

const API_BASE = "https://api.manychat.com/fb/page";

export async function updateBotField(code) {
  const token = process.env.MANYCHAT_API_TOKEN;
  if (!token) {
    throw new Error("MANYCHAT_API_TOKEN environment variable is not set");
  }

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${API_BASE}/setBotFieldByName`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        field_name: "ibon_code",
        field_value: code,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        console.log(`ManyChat bot field updated to: ${code}`);
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
      `ManyChat API attempt ${attempt}/${maxRetries} failed (${res.status}), retrying...`
    );

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  throw new Error(`ManyChat API failed after ${maxRetries} attempts`);
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
