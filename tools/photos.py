"""Download the real photographs used as "existing images" in beat 2.

    python3 tools/photos.py

Each file comes from Wikimedia Commons and must be CC0 or public domain,
which is checked against the Commons API before downloading. The photos
are cropped square and written to site/public/assets/found/, with their
sources listed in site/public/assets/CREDITS.md. Needs ffmpeg.
"""

import json
import pathlib
import re
import subprocess
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "site" / "public" / "assets"
AGENT = {"User-Agent": "seminar-site/0.1 (https://commons.wikimedia.org)"}
ALLOWED = ("CC0", "Public domain")

# In grid order. Tile 1 is the collage's sky, and tiles 0, 6 and 8 are cut
# out for its lighthouse, cliff and sea (see the cutouts group in assets.py).
FILES = [
    "File:East Usk Lighthouse (32990547983).jpg",
    "File:Sunset over the sea near Sozopol 1.jpg",
    "File:Coast line from Pointe du Hoc.jpg",
    "File:Ballycotton Lighthouse Aerial View.jpg",
    "File:Portland Head Lighthouse in October.jpeg",
    "File:Sunset over the sea near Sozopol.jpg",
    "File:Promontoire rocheux Calahonda.jpg",
    "File:Sunset clouds over the sea, La Fajana, La Palma.jpg",
    "File:Ocean Splashing on Rocks.jpg",
    "File:The Sea Cliff Bridge. NSW Aust. (21016079739).jpg"
]


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=60).read()


def describe(title):
    """Return (thumbnail url, licence, author, page url) for a Commons file."""
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "titles": title, "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": 1280,
    })
    pages = json.loads(fetch("https://commons.wikimedia.org/w/api.php?" + query))["query"]["pages"]
    info = next(iter(pages.values()))["imageinfo"][0]
    meta = info["extmetadata"]
    licence = meta.get("LicenseShortName", {}).get("value", "")
    author = re.sub("<[^>]+>", "", meta.get("Artist", {}).get("value", "unknown")).strip()
    return info["thumburl"], licence, author, info["descriptionurl"]


def main():
    (ASSETS / "found").mkdir(parents=True, exist_ok=True)
    credits = [
        "# Image credits",
        "",
        "- `portrait.jpg`: President Barack Obama, official portrait, 6 December 2012. Official White House Photo by Pete Souza. Public domain. https://commons.wikimedia.org/wiki/File:President_Barack_Obama.jpg",
        "",
        "Photographs in `found/`, all from Wikimedia Commons:",
        "",
    ]
    for i, title in enumerate(FILES):
        thumb, licence, author, page = describe(title)
        if licence not in ALLOWED:
            raise SystemExit(f"{title} is {licence!r}, not CC0 or public domain")
        source = ASSETS / "found" / f"{i}.src"
        source.write_bytes(fetch(thumb))
        crop = "scale=640:640:force_original_aspect_ratio=increase,crop=640:640"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-vf", crop, "-quality", "84", str(ASSETS / "found" / f"{i}.webp")], check=True)
        source.unlink()
        name = title.removeprefix("File:")
        credits.append(f"- `found/{i}.webp`: {name}, by {author}. {licence}. {page}")
        print("wrote", f"found/{i}.webp", "|", licence, "|", author)
    (ASSETS / "CREDITS.md").write_text("\n".join(credits) + "\n")


if __name__ == "__main__":
    main()
