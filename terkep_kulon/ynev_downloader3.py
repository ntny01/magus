import csv
import json
import os
from io import BytesIO

import requests
from PIL import Image
from tqdm import tqdm

# =====================================================
# TILE URL-ek
# =====================================================

TOPO_URL           = "https://kalandozok.hu/ynev/ynev-layers/3724domb/{z}/{x}/{y}.png"
POLITICAL_URL      = "https://kalandozok.hu/ynev/ynev-layers/3724poli/{z}/{x}/{y}.png"

TOPO_3715_URL      = "https://kalandozok.hu/ynev/ynev-layers/3715domb/{z}/{x}/{y}.png"
POLITICAL_3715_URL = "https://kalandozok.hu/ynev/ynev-layers/3715poli/{z}/{x}/{y}.png"

TOPO_3692_URL      = "https://kalandozok.hu/ynev/ynev-layers/3692domb/{z}/{x}/{y}.png"
POLITICAL_3692_URL = "https://kalandozok.hu/ynev/ynev-layers/3692poli/{z}/{x}/{y}.png"

# =====================================================
# BEÁLLÍTÁSOK
# =====================================================

ZOOM = 6

X_MIN = 0
X_MAX = 80

Y_MIN = 0
Y_MAX = 80

OUTPUT_DIR = "output"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

# =====================================================
# SEGÉD
# =====================================================

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

# =====================================================
# TILE LETÖLTÉS
# =====================================================

def download_tile(url_template, z, x, y):

    url = url_template.format(z=z, x=x, y=y)

    try:
        r = requests.get(url, headers=HEADERS, timeout=20)

        if r.status_code == 200:

            img = Image.open(BytesIO(r.content)).convert("RGBA")

            return img, url

    except Exception as e:
        print(f"HIBA {x}/{y}: {e}")

    return None, url

# =====================================================
# TILE MENTÉS + INDEX
# =====================================================

def save_tiles(layer_name, url_template):

    tile_index = []

    total = (X_MAX - X_MIN + 1) * (Y_MAX - Y_MIN + 1)

    with tqdm(total=total, desc=layer_name) as pbar:

        for x in range(X_MIN, X_MAX + 1):

            for y in range(Y_MIN, Y_MAX + 1):

                folder = os.path.join(
                    OUTPUT_DIR,
                    layer_name,
                    str(ZOOM),
                    str(x),
                )

                filepath = os.path.join(
                    folder,
                    f"{y}.png"
                )

                # Ha már létezik, letöltés nélkül kihagyjuk
                if os.path.exists(filepath):
                    tile_index.append({
                        "layer": layer_name,
                        "zoom": ZOOM,
                        "x": x,
                        "y": y,
                        "url": url_template.format(z=ZOOM, x=x, y=y),
                        "filepath": filepath,
                        "width": 256,
                        "height": 256,
                    })
                    pbar.update(1)
                    continue

                img, url = download_tile(url_template, ZOOM, x, y)

                if img:

                    ensure_dir(folder)

                    img.save(filepath)

                    tile_index.append({
                        "layer": layer_name,
                        "zoom": ZOOM,
                        "x": x,
                        "y": y,
                        "url": url,
                        "filepath": filepath,
                        "width": img.width,
                        "height": img.height,
                    })

                pbar.update(1)

    return tile_index

# =====================================================
# CSV EXPORT
# =====================================================

def export_csv(name, data):

    ensure_dir(os.path.join(OUTPUT_DIR, "indexes"))

    path = os.path.join(
        OUTPUT_DIR,
        "indexes",
        f"{name}.csv"
    )

    with open(path, "w", newline="", encoding="utf-8") as f:

        writer = csv.DictWriter(
            f,
            fieldnames=data[0].keys()
        )

        writer.writeheader()
        writer.writerows(data)

    print(f"CSV kész: {path}")

# =====================================================
# JSON EXPORT
# =====================================================

def export_json(name, data):

    ensure_dir(os.path.join(OUTPUT_DIR, "indexes"))

    path = os.path.join(
        OUTPUT_DIR,
        "indexes",
        f"{name}.json"
    )

    with open(path, "w", encoding="utf-8") as f:

        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"JSON kész: {path}")

# =====================================================
# PREVIEW TÉRKÉP
# =====================================================

def build_preview(layer_name, data):

    if not data:
        return

    tile_size = 256

    width_tiles = X_MAX - X_MIN + 1
    height_tiles = Y_MAX - Y_MIN + 1

    canvas = Image.new(
        "RGBA",
        (
            width_tiles * tile_size,
            height_tiles * tile_size,
        )
    )

    for tile in tqdm(data, desc=f"Preview {layer_name}"):

        try:

            img = Image.open(tile["filepath"])

            px = (tile["x"] - X_MIN) * tile_size
            py = (tile["y"] - Y_MIN) * tile_size

            canvas.paste(img, (px, py))

        except:
            pass

    preview_path = os.path.join(
        OUTPUT_DIR,
        f"{layer_name}_preview.png"
    )

    canvas.save(preview_path)

    print(f"Preview kész: {preview_path}")

# =====================================================
# FUTTATÁS
# =====================================================

if __name__ == "__main__":

    LAYERS = [
        ("3692_domborzati",  TOPO_3692_URL),
    ]

    for layer_name, url in LAYERS:
        print(f"\n=== {layer_name} ===")
        index = save_tiles(layer_name, url)
        if index:
            export_csv(f"{layer_name}_tiles", index)
            export_json(f"{layer_name}_tiles", index)
            build_preview(layer_name, index)
        else:
            print(f"Figyelem: {layer_name} - nem töltődött le egy tile sem (réteg nem létezik?)")

    print("\nMINDEN KÉSZ")