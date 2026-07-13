import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const publicDir = join(__dirname, '..', 'public')
const seo = JSON.parse(readFileSync(join(__dirname, '..', 'src', 'data', 'seo.json'), 'utf8'))

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const today = new Date().toISOString().split('T')[0]

const sitemapEntries = [
  ...seo.pages.map(
    (p) => `  <url>\n    <loc>${escapeXml(`${seo.siteUrl}${p.path}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
  ),
  ...seo.projectSlugs.map(
    (slug) =>
      `  <url>\n    <loc>${escapeXml(`${seo.siteUrl}/project/${slug}/`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
  ),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join('\n')}\n</urlset>\n`

const robots = `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /jdr/\nDisallow: /irlrpg/\nDisallow: /perso/\n\nSitemap: ${seo.siteUrl}/sitemap.xml\n`

writeFileSync(join(publicDir, 'sitemap.xml'), sitemap)
writeFileSync(join(publicDir, 'robots.txt'), robots)

console.log('Generated public/sitemap.xml and public/robots.txt')
