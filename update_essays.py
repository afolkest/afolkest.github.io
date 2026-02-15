#!/usr/bin/env python3
"""Fetch Substack RSS feed and update essays.html with preview cards."""

import xml.etree.ElementTree as ET
import urllib.request
import re
import html
import time
from urllib.parse import unquote

FEED_URL = "https://extramediumplease.substack.com/feed"
ESSAYS_FILE = "essays.html"

# Marker comments in essays.html
START_MARKER = "<!-- ESSAYS_START -->"
END_MARKER = "<!-- ESSAYS_END -->"


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

        # Clean up description (strip HTML tags)
        desc = re.sub(r"<[^>]+>", "", desc).strip()
        desc = html.unescape(desc)

        posts.append({
            "title": html.unescape(title),
            "link": link,
            "description": desc,
            "image": "",  # filled in later
        })
    return posts


def generate_html(posts):
    cards = []
    for p in posts:
        img_html = ""
        if p["image"]:
            img_html = f'<img src="{p["image"]}" alt="{p["title"]}">'

        cards.append(f"""            <a href="{p['link']}" target="_blank" class="essay-card">
                {img_html}
                <div class="essay-card-text">
                    <h3>{p['title']}</h3>
                    <p>{p['description']}</p>
                </div>
            </a>""")

    return "\n".join(cards)


def update_essays_html(cards_html):
    with open(ESSAYS_FILE, "r") as f:
        content = f.read()

    start = content.find(START_MARKER)
    end = content.find(END_MARKER)

    if start == -1 or end == -1:
        print(f"ERROR: Could not find markers in {ESSAYS_FILE}")
        print(f"Add {START_MARKER} and {END_MARKER} around the essays list.")
        return False

    new_content = (
        content[: start + len(START_MARKER)]
        + "\n"
        + cards_html
        + "\n            "
        + content[end:]
    )

    with open(ESSAYS_FILE, "w") as f:
        f.write(new_content)

    return True


if __name__ == "__main__":
    print("Fetching Substack RSS feed...")
    xml_text = fetch_feed()

    print("Parsing posts...")
    posts = parse_posts(xml_text)
    print(f"Found {len(posts)} posts")

    print("Fetching OG images from each post...")
    for p in posts:
        print(f"  - {p['title']}")
        p["image"] = fetch_og_image(p["link"])
        time.sleep(0.3)  # be polite

    cards_html = generate_html(posts)

    print(f"Updating {ESSAYS_FILE}...")
    if update_essays_html(cards_html):
        print("Done!")
    else:
        print("Failed to update. Check the markers in essays.html.")
