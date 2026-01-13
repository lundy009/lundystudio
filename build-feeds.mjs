import fs from "fs";

const data = JSON.parse(fs.readFileSync("./posts.json","utf8"));
const site = data.site || {};
const base = (site.url || "https://example.com").replace(/\/$/,"");
const posts = data.posts || [];

const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc></url>
  <url><loc>${base}/index.html</loc></url>
${posts.map(p => `  <url><loc>${base}/post.html?id=${p.id}</loc></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync("./sitemap.xml", sitemap, "utf8");

function rfc822(iso){
  const d = new Date((iso || "2026-01-01") + "T00:00:00Z");
  return d.toUTCString();
}

const rss =
`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${site.name || "Blog Studio"}</title>
    <link>${base}/</link>
    <description>${site.description || ""}</description>
    <language>km</language>
${posts.slice(0, 30).map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${base}/post.html?id=${p.id}</link>
      <guid>${base}/post.html?id=${p.id}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description><![CDATA[${p.excerpt || ""}]]></description>
    </item>
`).join("")}
  </channel>
</rss>
`;
fs.writeFileSync("./rss.xml", rss, "utf8");

console.log("✅ Generated sitemap.xml + rss.xml");
