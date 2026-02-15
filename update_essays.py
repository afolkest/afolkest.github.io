#!/usr/bin/env python3
"""Fetch Substack RSS feed and update essays.html with preview cards."""

import xml.etree.ElementTree as ET
import urllib.request
import re
import html
import time
from urllib.parse import unquote
from email.utils import parsedate_to_datetime

FEED_URL = "https://extramediumplease.substack.com/feed"
ESSAYS_FILE = "essays.html"

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


def fetch_feed():
    req = urllib.request.Request(FEED_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8")


SUBSTACK_CDN = "https://substackcdn.com/image/fetch/w_320,h_213,c_fill,f_auto,q_auto:good,fl_progressive:steep,g_center/"


def fetch_og_image(url):
    """Fetch the og:image from a post's page, return CDN-resized thumbnail URL."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            page = resp.read().decode("utf-8", errors="replace")
        m = re.search(r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"', page)
        if m:
            raw_url = unquote(m.group(1))
            # Extract the raw S3 URL from any CDN nesting
            s3_match = re.search(r'(https://substack-post-media\.s3\.amazonaws\.com/public/images/[^\s"&]+)', raw_url)
            if s3_match:
                return SUBSTACK_CDN + s3_match.group(1)
            return ""
    except Exception as e:
        print(f"  Warning: could not fetch OG image from {url}: {e}")
    return ""


def parse_posts(xml_text):
    root = ET.fromstring(xml_text)
    posts = []
    for item in root.findall(".//item"):
        title = item.findtext("title", "")
        link = item.findtext("link", "")
        desc = item.findtext("description", "")
        pub_date = item.findtext("pubDate", "")

        # Clean up description (strip HTML tags)
        desc = re.sub(r"<[^>]+>", "", desc).strip()
        desc = html.unescape(desc)

        # Parse date
        date_str = ""
        if pub_date:
            try:
                dt = parsedate_to_datetime(pub_date)
                date_str = dt.strftime("%b %d, %Y")
            except Exception:
                pass

        posts.append({
            "title": html.unescape(title),
            "link": link,
            "description": desc,
            "date": date_str,
            "image": "",  # filled in later
        })
    return posts


def generate_html(posts):
    cards = []
    for p in posts:
        img_html = ""
        if p["image"]:
            img_html = f'<img src="{p["image"]}" alt="{p["title"]}">'

        date_html = f'<span class="essay-date">{p["date"]}</span>' if p["date"] else ""

        cards.append(f"""            <a href="{p['link']}" target="_blank" class="essay-card">
                {img_html}
                <div class="essay-card-text">
                    <h3>{p['title']}</h3>
                    <p>{p['description']}</p>
                    {date_html}
                </div>
            </a>""")

    return "\n".join(cards)


def replace_between_markers(content, start_marker, end_marker, html):
    start = content.find(start_marker)
    end = content.find(end_marker)
    if start == -1 or end == -1:
        print(f"ERROR: Could not find markers {start_marker} / {end_marker}")
        return None
    return (
        content[: start + len(start_marker)]
        + "\n"
        + html
        + "\n            "
        + content[end:]
    )


def update_essays_html(selected_html, all_html):
    with open(ESSAYS_FILE, "r") as f:
        content = f.read()

    content = replace_between_markers(content, SELECTED_START, SELECTED_END, selected_html)
    if content is None:
        return False

    content = replace_between_markers(content, ALL_START, ALL_END, all_html)
    if content is None:
        return False

    with open(ESSAYS_FILE, "w") as f:
        f.write(content)

    return True


if __name__ == "__main__":
    print("Fetching Substack RSS feed...")
    xml_text = fetch_feed()

    print("Parsing posts...")
    posts = parse_posts(xml_text)
    print(f"Found {len(posts)} posts")

    # Check for selected essays not in feed
    feed_slugs = {re.search(r'/p/([^/?]+)', p["link"]).group(1) for p in posts if re.search(r'/p/([^/?]+)', p["link"])}
    for slug in SELECTED_SLUGS:
        if slug not in feed_slugs:
            print(f"  Selected essay '{slug}' not in feed, fetching directly...")
            url = f"https://extramediumplease.substack.com/p/{slug}"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    page = resp.read().decode("utf-8", errors="replace")
                title_m = re.search(r'<meta[^>]+property="og:title"[^>]+content="([^"]+)"', page)
                desc_m = re.search(r'<meta[^>]+property="og:description"[^>]+content="([^"]+)"', page)
                title = html.unescape(title_m.group(1)) if title_m else slug
                desc = html.unescape(desc_m.group(1)) if desc_m else ""
                posts.append({
                    "title": title,
                    "link": url,
                    "description": desc,
                    "date": "",
                    "image": "",
                })
            except Exception as e:
                print(f"  Warning: could not fetch {url}: {e}")

    print("Fetching OG images from each post...")
    for p in posts:
        if not p["image"]:
            print(f"  - {p['title']}")
            p["image"] = fetch_og_image(p["link"])
            time.sleep(0.3)  # be polite

    # Build lookup by slug
    by_slug = {}
    for p in posts:
        m = re.search(r'/p/([^/?]+)', p["link"])
        if m:
            by_slug[m.group(1)] = p

    # Selected essays in specified order
    selected = [by_slug[s] for s in SELECTED_SLUGS if s in by_slug]
    selected_html = generate_html(selected)

    # All essays in date order (already sorted by feed)
    all_html = generate_html(posts)

    print(f"Updating {ESSAYS_FILE}...")
    if update_essays_html(selected_html, all_html):
        print("Done!")
    else:
        print("Failed to update. Check the markers in essays.html.")
