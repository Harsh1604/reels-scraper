import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json());

app.get("/", async(req, res) => {
  res.status(200).send("Hii, This API is live!, send username in query")
})

app.get("/reels", async (req, res) => {
  const { username } = req.query;
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
    
      nodes.map((node) => {
        const fiberKey = Object.keys(node).find(k => k.startsWith("__reactFiber$"));
        const fiber = node[fiberKey];

        // try to access the data you want
        let media = null;
        if (fiber?.child?.memoizedProps?.children[0]?.props?.clip?.media) {
          media = fiber.child.memoizedProps.children[0].props.clip.media;
        }

        let date = null;
        if(media?.caption?.created_at){
          date = new Date(media.caption.created_at * 1000);
        }

        return {
          _id : node.href.split("/").filter(Boolean).pop(),
          reelUrl: node.href,
          // thumbnail: node.querySelector("img")?.src || null,
          caption: media?.caption.text || "",
          date: date ? date.toISOString() : "",
          views: media?.play_count ?? 0,
          likes: media?.like_count ?? 0,
          comments: media?.comment_count ?? 0,
        }
      })
    );

    // await browser.close();
    res.status(200).json({ username, reels });
  } catch (err) {
    await browser.close();
    console.error("Scraping failed:", err);
    res.status(500).json({ error: "Failed to scrape reels" });
  }
});

app.listen(5000, () =>
  console.log("Server running on http://localhost:5000")
);


