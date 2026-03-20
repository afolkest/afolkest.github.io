#!/usr/bin/env python3
"""Fetch Substack RSS feed, update essays.html index, and generate
individual essay pages under /essays/ for LLM discoverability."""

import xml.etree.ElementTree as ET
import urllib.request
import re
import html
import json
import os
import time
from urllib.parse import unquote
from email.utils import parsedate_to_datetime
from datetime import timezone

FEED_URL = "https://extramediumplease.substack.com/feed"
ESSAYS_FILE = "essays.html"
ESSAYS_DIR = "essays"
SITEMAP_FILE = "sitemap.xml"
SITE_URL = "https://afolkestad.com"

# Marker comments in essays.html
SELECTED_START = "<!-- SELECTED_START -->"
SELECTED_END = "<!-- SELECTED_END -->"
ALL_START = "<!-- ESSAYS_START -->"
ALL_END = "<!-- ESSAYS_END -->"

# Selected essays in display order (URL slugs)
SELECTED_SLUGS = [
    "spirits-and-the-incompleteness-of",
    "equations-that-demand-beauty",
    "god-is-nan",
    "beauty-as-entropic-fine-tuning",
]

SUBSTACK_CDN = "https://substackcdn.com/image/fetch/w_320,h_213,c_fill,f_auto,q_auto:good,fl_progressive:steep,g_center/"
NS = {"content": "http://purl.org/rss/1.0/modules/content/"}


def fetch_feed():
    req = urllib.request.Request(FEED_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8")


def fetch_og_image(url):
    """Fetch the og:image from a post's page, return CDN-resized thumbnail URL."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            page = resp.read().decode("utf-8", errors="replace")
        m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', page)
        if m:
            raw_url = unquote(m.group(1))
            s3_match = re.search(
                r"(https://substack-post-media\.s3\.amazonaws\.com/public/images/[^\s\"&]+)",
                raw_url,
            )
            if s3_match:
                return SUBSTACK_CDN + s3_match.group(1)
            return ""
    except Exception as e:
        print(f"  Warning: could not fetch OG image from {url}: {e}")
    return ""


def get_slug(link):
    m = re.search(r"/p/([^/?]+)", link)
    return m.group(1) if m else None


def parse_posts(xml_text):
    root = ET.fromstring(xml_text)
    posts = []
    for item in root.findall(".//item"):
        title = html.unescape(item.findtext("title", ""))
        link = item.findtext("link", "")
        desc = item.findtext("description", "")
        pub_date = item.findtext("pubDate", "")
        content_el = item.find("content:encoded", NS)
        content_html = content_el.text if content_el is not None and content_el.text else ""

        # Clean up description
        desc = re.sub(r"<[^>]+>", "", desc).strip()
        desc = html.unescape(desc)

        # Parse date
        date_str = ""
        date_iso = ""
        if pub_date:
            try:
                dt = parsedate_to_datetime(pub_date)
                date_str = dt.strftime("%b %d, %Y")
                date_iso = dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                pass

        posts.append({
            "title": title,
            "link": link,
            "slug": get_slug(link),
            "description": desc,
            "date": date_str,
            "date_iso": date_iso,
            "image": "",
            "content_html": content_html,
        })
    return posts


# ---------------------------------------------------------------------------
# Content cleaning
# ---------------------------------------------------------------------------

def _extract_balanced_div(text, start):
    """From position `start` (pointing at '<div'), find the matching </div>.
    Returns the end position (after '</div>') or -1."""
    depth = 0
    i = start
    while i < len(text):
        if text[i:i + 4] == "<div":
            depth += 1
        elif text[i:i + 6] == "</div>":
            depth -= 1
            if depth == 0:
                return i + 6
        i += 1
    return -1


def _replace_balanced_divs(text, class_prefix, replacer):
    """Find all <div ...class="<class_prefix>..."> blocks using balanced-div
    matching and replace each with the result of replacer(block).
    Handles class appearing anywhere in the opening tag attributes."""
    pattern = re.compile(r'<div\s[^>]*class="' + re.escape(class_prefix))
    result = []
    last = 0
    for m in pattern.finditer(text):
        idx = m.start()
        if idx < last:
            continue
        end = _extract_balanced_div(text, idx)
        if end == -1:
            continue
        block = text[idx:end]
        result.append(text[last:idx])
        result.append(replacer(block))
        last = end
    result.append(text[last:])
    return "".join(result)


def _simplify_image_block(block):
    """Extract a clean <figure> from a Substack captioned-image-container."""
    img_m = re.search(r'<img\s[^>]*src="([^"]+)"[^>]*/?\s*>', block)
    if not img_m:
        return ""
    src = img_m.group(1)

    # Extract real dimensions and metadata from data-attrs JSON
    width = ""
    height = ""
    alt = ""
    attrs_m = re.search(r'data-attrs="([^"]+)"', block)
    if attrs_m:
        try:
            attrs = json.loads(attrs_m.group(1).replace("&quot;", '"'))
            orig_w = attrs.get("width")
            orig_h = attrs.get("height")
            resize_w = attrs.get("resizeWidth")
            if orig_w and orig_h:
                if resize_w and resize_w < orig_w:
                    # Substack intended a smaller display size — scale proportionally
                    scale = resize_w / orig_w
                    width = int(resize_w)
                    height = int(orig_h * scale)
                else:
                    width = int(orig_w)
                    height = int(orig_h)
            if attrs.get("alt"):
                alt = attrs["alt"]
            if attrs.get("src"):
                src = attrs["src"]
        except (json.JSONDecodeError, ValueError):
            pass

    if not alt:
        alt_m = re.search(r'alt="([^"]*)"', block)
        alt = alt_m.group(1) if alt_m else ""

    cap_m = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', block, re.DOTALL)
    caption = cap_m.group(1).strip() if cap_m else ""

    size_attrs = ""
    if width and height:
        size_attrs = f' width="{width}" height="{height}"'

    fig = f'<figure class="essay-figure"><img src="{html.escape(src)}" alt="{html.escape(alt)}"{size_attrs} loading="lazy">'
    if caption:
        fig += f"<figcaption>{caption}</figcaption>"
    fig += "</figure>"
    return fig


def _simplify_youtube_block(block):
    iframe_m = re.search(r'<iframe\s[^>]*src="([^"]+)"[^>]*>', block)
    if not iframe_m:
        return ""
    src = iframe_m.group(1)
    return (
        '<div class="essay-video">'
        f'<iframe src="{src}" frameborder="0" loading="lazy" '
        'allow="autoplay; fullscreen" allowfullscreen></iframe>'
        "</div>"
    )


def _simplify_soundcloud_block(block):
    iframe_m = re.search(r'<iframe\s[^>]*src="([^"]+)"[^>]*>', block)
    if not iframe_m:
        return ""
    src = iframe_m.group(1)
    return (
        '<div class="essay-audio">'
        f'<iframe src="{src}" frameborder="0" loading="lazy"></iframe>'
        "</div>"
    )


def _simplify_post_embed(block):
    """Convert a digest-post-embed into a linked card."""
    attrs_m = re.search(r'data-attrs="([^"]+)"', block)
    if not attrs_m:
        return ""
    try:
        attrs = json.loads(attrs_m.group(1).replace("&quot;", '"'))
    except (json.JSONDecodeError, ValueError):
        return ""
    title = html.unescape(attrs.get("title", ""))
    caption = html.unescape(attrs.get("caption", ""))
    url = attrs.get("canonical_url", "")
    cover = attrs.get("cover_image", "")
    if not url or not title:
        return ""
    img_html = ""
    if cover:
        thumb = f"https://substackcdn.com/image/fetch/w_300,c_limit,f_auto,q_auto:good,fl_progressive:steep/{cover}"
        img_html = f'<img src="{thumb}" alt="" loading="lazy">'
    # If it's one of our own essays, link locally
    slug_m = re.search(r"/p/([^/?]+)", url)
    slug = slug_m.group(1) if slug_m else ""
    if "extramediumplease.substack.com" in url and slug:
        href = f"{slug}.html"
        target = ""
    else:
        href = url
        target = ' target="_blank" rel="noopener"'
    caption_html = f"<p>{html.escape(caption[:150])}</p>" if caption else ""
    return (
        f'<a href="{href}"{target} class="essay-embed-card">'
        f'{img_html}'
        f'<span class="essay-embed-card-text">'
        f'<strong>{html.escape(title)}</strong>'
        f'{caption_html}'
        f'</span>'
        f'</a>'
    )


def _make_media_placeholder(block, substack_url, media_type):
    """Create a placeholder linking to Substack for native video/audio."""
    if media_type == "video":
        label = "Video hosted on Substack"
        icon = "&#9654;"  # play triangle
    else:
        label = "Audio hosted on Substack"
        icon = "&#9835;"  # music note
    return (
        f'<a href="{html.escape(substack_url)}" target="_blank" rel="noopener" '
        f'class="essay-media-placeholder">'
        f'<span class="essay-media-icon">{icon}</span> {label}'
        f'</a>'
    )


def clean_essay_html(raw_html, substack_url=""):
    """Strip Substack-specific markup, subscribe buttons, etc."""
    h = raw_html

    # Remove subscribe buttons / CTAs
    h = re.sub(
        r'<p\s+class="button-wrapper"[^>]*>.*?</p>',
        "", h, flags=re.DOTALL,
    )

    # Remove subscription widgets (balanced div matching)
    h = _replace_balanced_divs(h, "subscription-widget", lambda _: "")

    # Simplify image containers (balanced div matching)
    h = _replace_balanced_divs(h, "captioned-image-container", _simplify_image_block)

    # Clean YouTube embeds (balanced div matching)
    h = _replace_balanced_divs(h, "youtube-wrap", _simplify_youtube_block)

    # Clean SoundCloud embeds (balanced div matching)
    h = _replace_balanced_divs(h, "soundcloud-wrap", _simplify_soundcloud_block)

    # Convert post embeds to linked cards
    h = _replace_balanced_divs(h, "digest-post-embed", _simplify_post_embed)

    # Replace native video/audio with placeholders linking to Substack
    h = _replace_balanced_divs(
        h, "native-video-embed",
        lambda b: _make_media_placeholder(b, substack_url, "video"),
    )
    h = _replace_balanced_divs(
        h, "native-audio-embed",
        lambda b: _make_media_placeholder(b, substack_url, "audio"),
    )

    # Remove data-attrs, data-component-name attributes
    h = re.sub(r'\s*data-attrs="[^"]*"', "", h)
    h = re.sub(r'\s*data-component-name="[^"]*"', "", h)

    # Remove empty paragraphs
    h = re.sub(r"<p>\s*</p>", "", h)

    # Collapse consecutive <div><hr></div> pairs (left behind after removing subscribe buttons)
    h = re.sub(r'(<div><hr></div>\s*){2,}', '<div><hr></div>', h)

    # Clean up excessive whitespace
    h = re.sub(r"\n{3,}", "\n\n", h)

    return h.strip()


# ---------------------------------------------------------------------------
# Essay page generation
# ---------------------------------------------------------------------------

ESSAY_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Åsmund Folkestad</title>
    <meta name="description" content="{description}">
    <meta property="og:title" content="{title} - Åsmund Folkestad">
    <meta property="og:description" content="{description}">
    <meta property="og:url" content="{page_url}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#f5f5f5">
    <link rel="canonical" href="{canonical_url}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,500;1,400&family=Red+Hat+Display:wght@400;600&display=swap" rel="stylesheet">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="stylesheet" href="../style.css?v=1">
    <script type="application/ld+json">
{json_ld}
    </script>
</head>

<body>
    <nav>
        <div class="nav-container">
            <a href="../index.html" class="nav-home">Åsmund Folkestad <span class="page-label">// essays</span></a>
            <div class="nav-links">
                <a href="../index.html">home</a>
                <a href="../about.html">about</a>
                <a href="../research.html">research</a>
                <a href="../art.html">art</a>
                <a href="../essays.html" class="active">essays</a>
            </div>
        </div>
    </nav>

    <main class="essay-page">
        <article>
            <header class="essay-header">
                <h1>{title}</h1>
                {subtitle_html}
                {date_html}
            </header>
            <div class="essay-body">
{content}
            </div>
            <footer class="essay-footer">
                <p>Originally published on <a href="{canonical_url}" target="_blank" rel="noopener">Mechanics of Aesthetics</a></p>
            </footer>
        </article>
    </main>

    <footer>
        <p></p>
    </footer>
    <script data-goatcounter="https://afolkest.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
</body>

</html>"""


def generate_essay_page(post):
    """Generate a standalone HTML page for a single essay."""
    clean_content = clean_essay_html(post["content_html"], substack_url=post["link"])
    if not clean_content:
        return None

    # If the cleaned content is very short, it's likely a video/audio post
    # where Substack omitted the main media from the feed. Add a link.
    stripped_len = len(re.sub(r"<[^>]+>", "", clean_content))
    if stripped_len < 500:
        clean_content += (
            f'\n<a href="{html.escape(post["link"])}" target="_blank" rel="noopener" '
            f'class="essay-media-placeholder">'
            f'<span class="essay-media-icon">&#9654;</span> '
            f'View full post on Substack</a>'
        )

    page_url = f"{SITE_URL}/essays/{post['slug']}.html"
    date_html = f'<time datetime="{post["date_iso"]}">{post["date"]}</time>' if post["date"] else ""

    json_ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post["title"],
        "description": post["description"],
        "author": {
            "@type": "Person",
            "name": "Åsmund Folkestad",
            "url": SITE_URL,
        },
        "datePublished": post["date_iso"],
        "url": page_url,
        "publisher": {
            "@type": "Person",
            "name": "Åsmund Folkestad",
        },
    }, indent=4)

    esc_title = html.escape(post["title"])
    esc_desc = html.escape(post["description"])
    subtitle_html = f'<p class="essay-subtitle">{esc_desc}</p>' if esc_desc else ""

    return ESSAY_TEMPLATE.format(
        title=esc_title,
        description=esc_desc,
        subtitle_html=subtitle_html,
        page_url=page_url,
        canonical_url=post["link"],
        json_ld=json_ld,
        date_html=date_html,
        content=clean_content,
    )


def write_essay_pages(posts):
    """Write individual HTML files for each essay."""
    os.makedirs(ESSAYS_DIR, exist_ok=True)
    written = []
    for p in posts:
        if not p["slug"] or not p["content_html"]:
            continue
        page_html = generate_essay_page(p)
        if page_html is None:
            continue
        filepath = os.path.join(ESSAYS_DIR, f"{p['slug']}.html")
        with open(filepath, "w") as f:
            f.write(page_html)
        written.append(p)
        print(f"  wrote {filepath}")
    return written


# ---------------------------------------------------------------------------
# Index page (essays.html)
# ---------------------------------------------------------------------------

def generate_card_html(posts, local_links=True):
    cards = []
    for p in posts:
        img_html = ""
        if p["image"]:
            img_html = (
                f'<img src="{p["image"]}" alt="{html.escape(p["title"])}"'
                f' width="320" height="213" loading="lazy">'
            )

        date_html = f'<span class="essay-date">{p["date"]}</span>' if p["date"] else ""

        if local_links and p["slug"]:
            href = f"essays/{p['slug']}.html"
            target = ""
            rel = ""
        else:
            href = p["link"]
            target = ' target="_blank"'
            rel = ' rel="noopener"'

        cards.append(
            f'            <a href="{href}"{target}{rel} class="essay-card">\n'
            f"                {img_html}\n"
            f'                <div class="essay-card-text">\n'
            f"                    <h3>{html.escape(p['title'])}</h3>\n"
            f"                    <p>{html.escape(p['description'])}</p>\n"
            f"                    {date_html}\n"
            f"                </div>\n"
            f"            </a>"
        )

    return "\n".join(cards)


def replace_between_markers(content, start_marker, end_marker, new_html):
    start = content.find(start_marker)
    end = content.find(end_marker)
    if start == -1 or end == -1:
        print(f"ERROR: Could not find markers {start_marker} / {end_marker}")
        return None
    return (
        content[: start + len(start_marker)]
        + "\n"
        + new_html
        + "\n            "
        + content[end:]
    )


def update_essays_html(selected_posts, all_posts, has_local_pages):
    """Update the essays.html index page."""
    with open(ESSAYS_FILE, "r") as f:
        content = f.read()

    selected_html = generate_card_html(selected_posts, local_links=has_local_pages)
    all_html = generate_card_html(all_posts, local_links=has_local_pages)

    content = replace_between_markers(content, SELECTED_START, SELECTED_END, selected_html)
    if content is None:
        return False

    content = replace_between_markers(content, ALL_START, ALL_END, all_html)
    if content is None:
        return False

    with open(ESSAYS_FILE, "w") as f:
        f.write(content)
    return True


# ---------------------------------------------------------------------------
# Sitemap
# ---------------------------------------------------------------------------

def update_sitemap(essay_posts):
    """Regenerate sitemap.xml including essay pages."""
    urls = [
        (f"{SITE_URL}/", "1.0"),
        (f"{SITE_URL}/about.html", "0.8"),
        (f"{SITE_URL}/research.html", "0.8"),
        (f"{SITE_URL}/art.html", "0.8"),
        (f"{SITE_URL}/essays.html", "0.8"),
    ]
    for p in essay_posts:
        if p["slug"]:
            urls.append((f"{SITE_URL}/essays/{p['slug']}.html", "0.6"))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for loc, priority in urls:
        lines.append(f"  <url>")
        lines.append(f"    <loc>{loc}</loc>")
        lines.append(f"    <priority>{priority}</priority>")
        lines.append(f"  </url>")
    lines.append("</urlset>")
    lines.append("")

    with open(SITEMAP_FILE, "w") as f:
        f.write("\n".join(lines))
    print(f"Updated {SITEMAP_FILE} ({len(urls)} URLs)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Fetching Substack RSS feed...")
    xml_text = fetch_feed()

    print("Parsing posts...")
    posts = parse_posts(xml_text)
    print(f"Found {len(posts)} posts")

    # Check for selected essays not in feed
    feed_slugs = {p["slug"] for p in posts if p["slug"]}
    for slug in SELECTED_SLUGS:
        if slug not in feed_slugs:
            print(f"  Selected essay '{slug}' not in feed, fetching page...")
            url = f"https://extramediumplease.substack.com/p/{slug}"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    page = resp.read().decode("utf-8", errors="replace")
                title_m = re.search(
                    r'<meta[^>]+property="og:title"[^>]+content="([^"]+)"', page
                )
                desc_m = re.search(
                    r'<meta[^>]+property="og:description"[^>]+content="([^"]+)"', page
                )
                date_m = re.search(
                    r'<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"', page
                )
                title = html.unescape(title_m.group(1)) if title_m else slug
                desc = html.unescape(desc_m.group(1)) if desc_m else ""
                date_str = ""
                date_iso = ""
                if date_m:
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(date_m.group(1).replace("Z", "+00:00"))
                        date_str = dt.strftime("%b %d, %Y")
                        date_iso = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                    except Exception:
                        pass

                # Extract article body from page HTML
                content_html = ""
                body_idx = page.find('class="body markup"')
                if body_idx != -1:
                    div_start = page.rfind("<div", 0, body_idx)
                    end = _extract_balanced_div(page, div_start)
                    if end != -1:
                        outer = page[div_start:end]
                        inner_start = outer.find(">") + 1
                        inner_end = outer.rfind("</div>")
                        content_html = outer[inner_start:inner_end]

                posts.append({
                    "title": title,
                    "link": url,
                    "slug": slug,
                    "description": desc,
                    "date": date_str,
                    "date_iso": date_iso,
                    "image": "",
                    "content_html": content_html,
                })
                if content_html:
                    print(f"    got {len(content_html)} chars of content")
                else:
                    print(f"    warning: no content extracted")
            except Exception as e:
                print(f"  Warning: could not fetch {url}: {e}")

    print("Fetching OG images from each post...")
    for p in posts:
        if not p["image"]:
            print(f"  - {p['title']}")
            p["image"] = fetch_og_image(p["link"])
            time.sleep(0.3)

    # Build lookup by slug
    by_slug = {}
    for p in posts:
        if p["slug"]:
            by_slug[p["slug"]] = p

    # Generate individual essay pages
    print("Generating essay pages...")
    written = write_essay_pages(posts)

    # Selected essays in specified order
    selected = [by_slug[s] for s in SELECTED_SLUGS if s in by_slug]

    # Update index page (link locally if we generated pages)
    print(f"Updating {ESSAYS_FILE}...")
    has_local = len(written) > 0
    if update_essays_html(selected, posts, has_local):
        print("  Done!")
    else:
        print("  Failed to update. Check the markers in essays.html.")

    # Update sitemap
    print("Updating sitemap...")
    update_sitemap(posts)

    print(f"\nFinished: {len(written)} essay pages written, index updated, sitemap updated.")
