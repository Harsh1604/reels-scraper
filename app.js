import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json());

app.get("/", async(req, res) => {
  res.send("Hii, This API is live!, send username in query")
})

app.get("/reels", async (req, res) => {
  const { username } = req.query.username;
  if (!username) return res.status(400).json({ error: "Username required" });

  const browser = await chromium.launch({ headless: true, slowMo: 200 }); 
  const page = await browser.newPage();

  try {
    const url = `https://www.instagram.com/${username}/reels/`;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Check for private account message
    const isPrivate = await page.$("text='This Account is Private'");
    if (isPrivate) {
      await browser.close();
      return res.status(403).json({ error: "Account is private" });
    }

    // Wait for at least one reel to appear
    await page.waitForSelector('a[href*="/reel/"]', { timeout: 10000 });

    // Extract reel data (id, basic: URL, thumbnail, caption)
    const reels = await page.$$eval('a[href*="/reel/"]', (nodes) =>
      nodes.map((node) => ({
        _id : node.href.split("/").filter(Boolean).pop(),
        reelUrl: node.href,
        thumbnail: node.querySelector("img")?.src || null,
        caption: node.querySelector("img")?.alt || "",
      }))
    );

    await browser.close();
    res.json({ username, reels });
  } catch (err) {
    await browser.close();
    console.error("Scraping failed:", err);
    res.status(500).json({ error: "Failed to scrape reels" });
  }
});

app.listen(5000, () =>
  console.log("Server running on http://localhost:5000")
);


