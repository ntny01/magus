import os

LAYER = "3692_domborzati"
OUTPUT_DIR = "./output"
ZOOM = 6
X_MIN, X_MAX = 0, 80
Y_MIN, Y_MAX = 0, 80

missing = []

for x in range(X_MIN, X_MAX + 1):
    for y in range(Y_MIN, Y_MAX + 1):
        path = os.path.join(OUTPUT_DIR, LAYER, str(ZOOM), str(x), f"{y}.png")
        if not os.path.exists(path):
            missing.append((x, y))

print(f"Hiányzó tile-ok ({LAYER}): {len(missing)} db")
for x, y in missing:
    print(f"  z={ZOOM} x={x} y={y} → {OUTPUT_DIR}/{LAYER}/{ZOOM}/{x}/{y}.png")
