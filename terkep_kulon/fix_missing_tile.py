import os
import requests
from PIL import Image
from io import BytesIO

URL = "https://kalandozok.hu/ynev/ynev-layers/3715domb/6/32/4.png"
OUTPUT = "./output/3715_domborzati/6/32/4.png"
HEADERS = {"User-Agent": "Mozilla/5.0"}

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

for attempt in range(1, 6):
    try:
        print(f"Próbálkozás {attempt}/5...")
        r = requests.get(URL, headers=HEADERS, timeout=30)
        if r.status_code == 200:
            img = Image.open(BytesIO(r.content)).convert("RGBA")
            img.save(OUTPUT)
            print(f"✓ Kész: {OUTPUT}")
            break
        else:
            print(f"HTTP {r.status_code}")
    except Exception as e:
        print(f"HIBA: {e}")
else:
    print("Nem sikerült letölteni 5 próbálkozás után sem.")
