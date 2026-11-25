#!/usr/bin/env python3
"""
Reads the letters and colours off Wordle screenshots so the journal can show a proper grid.

For every screenshot in public/data/wordle.json without "guesses", it finds the tiles, reads each
tile's colour, reads the letters with Tesseract, and checks the result: the colours Wordle would give
those guesses against the answer must match the colours in the picture. Only results that pass are
saved (as "guesses" and "answer"), so a misread letter never shows up in the journal.

Needs: pip install pillow numpy. Tesseract (apt install tesseract-ocr) is only a fallback
when scripts/wordle-letters.npz, the letter shapes learned from earlier screenshots, is missing.
Usage: python3 scripts/read-wordle.py [--all] [--limit N]
"""
import json
import shutil
import subprocess
import sys
import tempfile
from collections import Counter
from datetime import date
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / 'scripts/wordle-letters.npz'
GLYPH = (40, 32)  # height, width of a normalised letter
DATA = ROOT / 'public/data/wordle.json'
ANSWERS = ROOT / 'public/data/wordle-answers.json'
FIRST_WORDLE = date(2021, 6, 19)  # Wordle #0

COLOURS = {  # dark-mode tile colours
    'G': (83, 141, 78),
    'Y': (181, 159, 59),
    'B': (58, 58, 60),
}


def classify(rgb):
    best, dist = None, 1e9
    for k, c in COLOURS.items():
        d = sum((a - b) ** 2 for a, b in zip(rgb, c)) ** 0.5
        if d < dist:
            best, dist = k, d
    return best if dist < 45 else None


def runs(profile, threshold, min_len):
    out, start = [], None
    for i, v in enumerate(list(profile) + [0]):
        if v >= threshold and start is None:
            start = i
        elif v < threshold and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out


def find_tiles(img):
    """Returns ([column spans], [row spans]) of filled tiles, or None."""
    a = np.asarray(img).astype(int)
    mask = np.zeros(a.shape[:2], bool)
    for c in COLOURS.values():
        mask |= (np.abs(a - np.array(c)).sum(axis=2) < 40)
    w = a.shape[1]
    cols = runs(mask.sum(axis=0), mask.shape[0] * 0.08, w * 0.08)
    if len(cols) != 5:
        return None
    size = int(np.median([e - s for s, e in cols]))
    x0, x1 = cols[0][0], cols[-1][1]
    rows = runs(mask[:, x0:x1].sum(axis=1), (x1 - x0) * 0.45, size * 0.6)
    # A row cut off by the top or bottom edge of the screenshot is not trustworthy.
    rows = [r for r in rows if r[1] - r[0] > size * 0.85]
    if not 1 <= len(rows) <= 6:
        return None
    return cols, rows


def tile_colour(a, x0, y0, x1, y1):
    inset = max(4, (x1 - x0) // 12)
    patch = a[y0 + inset:y0 + inset * 2, x0 + inset:x1 - inset].reshape(-1, 3)
    return classify(tuple(np.median(patch, axis=0)))


def letter_image(a, x0, y0, x1, y1):
    """Black letter on white, from the white letter in a tile."""
    t = a[y0:y1, x0:x1]
    white = (t.min(axis=2) > 170)
    img = Image.fromarray(np.where(white, 0, 255).astype(np.uint8))
    return img


def glyph(img):
    """Crops a black-on-white letter to its ink and scales it to a fixed size."""
    a = np.asarray(img) < 128
    ys, xs = np.nonzero(a)
    if len(xs) < 20:
        return None
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape
    # Keep thin letters (I) thin: pad to the usual letter shape before scaling.
    target_w = int(h * GLYPH[1] / GLYPH[0])
    if w < target_w:
        pad = (target_w - w) // 2
        a = np.pad(a, ((0, 0), (pad, target_w - w - pad)))
    return np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((GLYPH[1], GLYPH[0]))) / 255.0


_templates = None


def templates():
    global _templates
    if _templates is None:
        _templates = dict(np.load(TEMPLATES)) if TEMPLATES.exists() else {}
    return _templates


def match(g):
    """The template letter closest to glyph g, or None when nothing is close."""
    best, dist = None, 1e9
    for ch, t in templates().items():
        d = np.abs(g - t).mean()
        if d < dist:
            best, dist = ch, d
    return best  # always a guess: the colour check below catches a wrong one


def ocr(img, psm):
    if not shutil.which('tesseract'):
        return ''
    with tempfile.NamedTemporaryFile(suffix='.png') as f:
        img.save(f.name)
        out = subprocess.run(
            ['tesseract', f.name, '-', '--psm', str(psm), '-c', 'tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
            capture_output=True, text=True).stdout
    return ''.join(ch for ch in out if ch.isalpha()).upper()


def read_row(a, cols, y0, y1):
    letters = [letter_image(a, x0, y0, x1, y1) for x0, x1 in cols]
    if templates():
        glyphs = [glyph(l) for l in letters]
        word = ''.join((match(g) if g is not None else None) or '?' for g in glyphs)
        if '?' not in word:
            return word
    h = y1 - y0
    strip = Image.new('L', (sum(l.width for l in letters) + 40, h + 40), 255)
    x = 20
    for l in letters:
        strip.paste(l, (x, 20))
        x += l.width
    strip = strip.resize((strip.width // 2, strip.height // 2))
    word = ocr(strip, 7)
    if len(word) == 5:
        return word
    # Fall back to one letter at a time.
    word = ''
    for l in letters:
        small = Image.new('L', (l.width + 40, l.height + 40), 255)
        small.paste(l, (20, 20))
        ch = ocr(small.resize((small.width // 2, small.height // 2)), 10)
        word += ch[:1] if ch else '?'
    return word


def score(guess, answer):
    """Wordle's colours for a guess: G green, Y yellow, B grey."""
    result = ['B'] * 5
    left = Counter()
    for i, (g, s) in enumerate(zip(guess, answer)):
        if g == s:
            result[i] = 'G'
        else:
            left[s] += 1
    for i, g in enumerate(guess):
        if result[i] != 'G' and left[g] > 0:
            result[i] = 'Y'
            left[g] -= 1
    return ''.join(result)


def read_screenshot(path, answer_for_day):
    img = Image.open(path).convert('RGB')
    found = find_tiles(img)
    if not found:
        return None, 'no grid found'
    cols, rows = found
    a = np.asarray(img).astype(int)
    guesses, patterns, glyphs = [], [], []
    for y0, y1 in rows:
        glyphs.append([glyph(letter_image(a, x0, y0, x1, y1)) for x0, x1 in cols])
        pattern = ''.join(tile_colour(a, x0, y0, x1, y1) or '?' for x0, x1 in cols)
        guesses.append(read_row(a, cols, y0, y1))
        patterns.append(pattern)
    if any('?' in p for p in patterns):
        return None, f'unclear colours {patterns}'

    candidates = []
    if patterns[-1] == 'GGGGG':
        candidates.append(guesses[-1])
    if answer_for_day:
        candidates.append(answer_for_day)
    for answer in candidates:
        if all(len(g) == 5 and score(g, answer) == p for g, p in zip(guesses, patterns)):
            read_screenshot.glyphs = list(zip(guesses, glyphs))
            return {'guesses': guesses, 'answer': answer}, None
    return None, f'check failed {guesses} {patterns}'


def wordle_number(day):
    return (date.fromisoformat(day) - FIRST_WORDLE).days


def build_templates(data):
    """Averages the letters from screenshots that passed the check into one template per letter."""
    sums, counts = {}, Counter()
    for photo in data['photos'].values():
        if 'guesses' not in photo:
            continue
        read_screenshot.glyphs = []
        result, _ = read_screenshot(ROOT / 'public' / photo['file'], photo.get('answer'))
        for word, gl in read_screenshot.glyphs:
            for ch, g in zip(word, gl):
                if g is not None and ch.isalpha() and counts[ch] < 40:
                    sums[ch] = sums.get(ch, 0) + g
                    counts[ch] += 1
    np.savez_compressed(TEMPLATES, **{ch: sums[ch] / counts[ch] for ch in sums})
    print(f'Saved templates for {len(sums)} letters: {"".join(sorted(sums))}')


def main():
    args = sys.argv[1:]
    if '--build-templates' in args:
        build_templates(json.loads(DATA.read_text()))
        return
    redo = '--all' in args
    limit = int(args[args.index('--limit') + 1]) if '--limit' in args else None
    data = json.loads(DATA.read_text())
    answers = json.loads(ANSWERS.read_text()) if ANSWERS.exists() else {}

    todo = [(g, p) for g, p in data['photos'].items() if redo or 'guesses' not in p]
    if limit:
        todo = todo[:limit]
    ok = failed = 0
    for guid, photo in todo:
        result, why = read_screenshot(ROOT / 'public' / photo['file'], answers.get(photo['date']))
        if result:
            photo.update(result)
            ok += 1
        else:
            failed += 1
            print(f"  {photo['date']} {photo['file']}: {why}")
    DATA.write_text(json.dumps(data, indent=2) + '\n')
    print(f'Read {ok} Wordle grid(s); {failed} left as pictures.')


if __name__ == '__main__':
    main()
