#!/usr/bin/env python3
"""Generate placeholder PNG icons for the New Year Bundle PWA.

Writes a solid festive square with a simple "NY" glyph drawn pixel by pixel so
there is no font dependency. Produces real PNG bytes via zlib, no hand faking.
Run: python3 scripts/make_icons.py
"""
import struct
import zlib
import os

BG = (11, 11, 26)        # deep night blue, matches theme_color
FG = (255, 209, 102)     # warm festive gold


def set_px(buf, w, x, y, color):
    if 0 <= x < w and 0 <= y < w:
        i = y * w + x
        buf[i] = color


def draw_rect(buf, w, x0, y0, x1, y1, color):
    for y in range(y0, y1):
        for x in range(x0, x1):
            set_px(buf, w, x, y, color)


def draw_glyph_N(buf, w, ox, oy, h, color):
    thickness = max(2, h // 6)
    width = int(h * 0.7)
    # left and right verticals
    draw_rect(buf, w, ox, oy, ox + thickness, oy + h, color)
    draw_rect(buf, w, ox + width - thickness, oy, ox + width, oy + h, color)
    # diagonal
    for step in range(h):
        x = ox + int((width - thickness) * (step / max(1, h - 1)))
        draw_rect(buf, w, x, oy + step, x + thickness, oy + step + 1, color)
    return width


def draw_glyph_Y(buf, w, ox, oy, h, color):
    thickness = max(2, h // 6)
    width = int(h * 0.7)
    half = h // 2
    cx = ox + width // 2
    # left arm of the V
    for step in range(half):
        x = ox + int((width // 2 - thickness) * (step / max(1, half - 1)))
        draw_rect(buf, w, x, oy + step, x + thickness, oy + step + 1, color)
    # right arm of the V
    for step in range(half):
        x = ox + width - thickness - int((width // 2 - thickness) * (step / max(1, half - 1)))
        draw_rect(buf, w, x, oy + step, x + thickness, oy + step + 1, color)
    # stem
    draw_rect(buf, w, cx - thickness // 2, oy + half, cx - thickness // 2 + thickness, oy + h, color)
    return width


def make_png(size, path):
    w = size
    buf = [BG] * (w * w)

    # rounded-ish border accent
    pad = max(6, size // 16)
    draw_rect(buf, w, pad, pad, w - pad, pad + max(3, size // 48), FG)
    draw_rect(buf, w, pad, w - pad - max(3, size // 48), w - pad, w - pad, FG)

    # draw "NY" centered
    glyph_h = int(size * 0.42)
    gap = int(size * 0.08)
    total_w = int(glyph_h * 0.7) * 2 + gap
    start_x = (w - total_w) // 2
    start_y = (w - glyph_h) // 2
    gw = draw_glyph_N(buf, w, start_x, start_y, glyph_h, FG)
    draw_glyph_Y(buf, w, start_x + gw + gap, start_y, glyph_h, FG)

    # encode as PNG (RGB, 8-bit)
    raw = bytearray()
    for y in range(w):
        raw.append(0)  # no filter
        for x in range(w):
            r, g, b = buf[y * w + x]
            raw += bytes((r, g, b))

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, w, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path, len(png), "bytes")


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "icons")
    os.makedirs(out, exist_ok=True)
    make_png(192, os.path.join(out, "icon-192.png"))
    make_png(512, os.path.join(out, "icon-512.png"))
