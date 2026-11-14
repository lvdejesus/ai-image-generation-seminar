"""Download the real photographs used as "existing images" in beat 2, and
the collection of training images in beat 7.

    python3 tools/photos.py

Each file comes from Wikimedia Commons and must be CC0 or public domain,
which is checked against the Commons API before downloading. The photos
are cropped square and written to site/public/assets/found/ and
site/public/assets/collection/, with their sources listed in
site/public/assets/CREDITS.md. Needs ffmpeg.
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

# Beat 7: everyday subjects, so the collection looks like a broad scrape.
# Their captions are in site/src/scenes/training.ts, in this order.
COLLECTION = [
    "File:Dog at Nørre Vorupør Strand.jpg",
    "File:Pizza 14.jpg",
    "File:A train at East Croydon.jpg",
    "File:Spring Tulips (153795123).jpeg",
    "File:Lake Mountain Landscape.jpg",
    "File:Black coffee cup (Unsplash).jpg",
    "File:Chateau Frontenac illuminated at night in Quebec City.jpg",
    "File:Catalina 34 Mark II sailboat Vagabond 5765.jpg",
    "File:Fruit Platter (Unsplash).jpg",
    "File:Horse and ranch.jpg",
    "File:Moscow car show 2026-07-31 Porsche red-black 01.jpg",
    "File:Birthday Cake Bloomsburg, Pennsylvania.jpg",
    "File:Dog in Chacachacare.jpg",
    "File:JA1271 crossing the Otaki River.jpg",
    "File:Anonymous - Tulips - B1981.25.2584 - Yale Center for British Art.jpg",
    "File:Bicycle parking lemonjellos.jpg",
    "File:Snowy Forest and Mountain Landscape.jpg",
    "File:Covered Owl Jar MET DP241775.jpg",
    "File:Equestrian Portrait of Cornelis (1639–1680) and Michiel Pompe van Meerdervoort (1638–1653) with Their Tutor and Coachman (\"Starting for the Hunt\") MET DP146442.jpg",
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
    credits = [
        "# Image credits",
        "",
        "- `portrait.jpg`: President Barack Obama, official portrait, 6 December 2012. Official White House Photo by Pete Souza. Public domain. https://commons.wikimedia.org/wiki/File:President_Barack_Obama.jpg",
        "",
        "Photographs in `found/`, all from Wikimedia Commons:",
        "",
    ]
    credits += download(FILES, "found", 640)
    credits += ["", "Photographs in `collection/`, all from Wikimedia Commons:", ""]
    credits += download(COLLECTION, "collection", 360)
    (ASSETS / "CREDITS.md").write_text("\n".join(credits) + "\n")


def download(files, folder, size):
    """Download `files` into `folder`, cropped to `size` pixels square; return their credit lines."""
    (ASSETS / folder).mkdir(parents=True, exist_ok=True)
    credits = []
    for i, title in enumerate(files):
        thumb, licence, author, page = describe(title)
        if licence not in ALLOWED:
            raise SystemExit(f"{title} is {licence!r}, not CC0 or public domain")
        source = ASSETS / folder / f"{i}.src"
        source.write_bytes(fetch(thumb))
        crop = f"scale={size}:{size}:force_original_aspect_ratio=increase,crop={size}:{size}"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(source), "-vf", crop, "-quality", "84", str(ASSETS / folder / f"{i}.webp")], check=True)
        source.unlink()
        name = title.removeprefix("File:")
        credits.append(f"- `{folder}/{i}.webp`: {name}, by {author}. {licence}. {page}")
        print("wrote", f"{folder}/{i}.webp", "|", licence, "|", author)
    return credits


if __name__ == "__main__":
    main()
