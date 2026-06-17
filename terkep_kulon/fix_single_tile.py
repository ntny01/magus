import os
import requests
from PIL import Image
from io import BytesIO

# Hiányzó tile adatai
LAYER = "3715_domborzati"
Z, X, Y = 6, 7, 5
URL = f"https://kalandozok.hu/ynev/ynev-layers/3715domb/{Z}/{X}/{Y}.png"
OUTPUT = f"./output/{LAYER}/{Z}/{X}/{Y}.png"
HEADERS = {"User-Agent": "Mozilla/5.0"}

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

for attempt in range(1, 6):
    try:
        print(f"Próbálkozás {attempt}/5: {URL}")
        r = requests.get(URL, headers=HEADERS, timeout=30)
        if r.status_code == 200:
            img = Image.open(BytesIO(r.content)).convert("RGBA")
            img.save(OUTPUT)
            print(f"✓ Kész: {OUTPUT}")
            break
        else:
            print(f"HTTP {r.status_code}")
            break
    except Exception as e:
        print(f"HIBA: {e}")
else:
    print("Nem sikerült 5 próbálkozás után sem.")
