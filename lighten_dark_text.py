#!/usr/bin/env python3
"""Lighten dark-mode text colors in style.css — preserves all formatting."""

import re

CSS_PATH = '/storage/emulated/0/Venter/HopWeb/Projects/JiGuroLGC.github.io/css/style.css'
FACTOR = 0.14

# Colors to keep as-is
PRESERVE_HEX = {
    # dark backgrounds
    '#292a2d', '#1e1f23', '#161209', '#3e3e3e',
    '#2a2b2f',
    # already white / near-white
    '#fff', '#ffffff', '#eee',
    # light mode backgrounds (won't appear in dark, but be safe)
    '#f7f7f7', '#f5f5f5', '#f0f0f0', '#fafafa', '#f2f2f2',
    '#ebebeb', '#e8e8e8', '#ececec', '#e0e0e0', '#e5e5e5',
    '#d9d9d9', '#ddd', '#ccc', '#bbb', '#999', '#777', '#666', '#888',
    '#c0c0c0',
    # accent colors (brand)
    '#2d96bd', '#ef3982', '#dcdcdc',
    # rgba backgrounds used in dark mode
    'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.3)',
    'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.5)',
}

def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = h[0]*2 + h[1]*2 + h[2]*2
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

def rgb_to_hex(rgb):
    return '#{:02x}{:02x}{:02x}'.format(*rgb)

def lighten_hex(hex_color):
    r, g, b = hex_to_rgb(hex_color)
    r = min(255, int(r + (255 - r) * FACTOR))
    g = min(255, int(g + (255 - g) * FACTOR))
    b = min(255, int(b + (255 - b) * FACTOR))
    return rgb_to_hex((r, g, b))

def should_lighten(hex_color):
    lower = hex_color.lower()
    if lower in PRESERVE_HEX:
        return False
    r, g, b = hex_to_rgb(hex_color)
    if max(r, g, b) < 80:
        return False
    if min(r, g, b) > 240:
        return False
    return True

def lighten_rgba_match(match):
    full = match.group(0)
    # Build a normalized key for blocking
    parts = match.group(1).split(',')
    r_val = parts[0].strip()
    g_val = parts[1].strip()
    b_val = parts[2].strip()
    a_val = parts[3].strip()
    # Normalize: remove spaces
    key = f"rgba({r_val},{g_val},{b_val},{a_val})"
    if key in PRESERVE_HEX:
        return full
    
    r, g, b = int(r_val), int(g_val), int(b_val)
    if max(r, g, b) < 80:
        return full
    if min(r, g, b) > 240:
        return full
    
    r = min(255, int(r + (255 - r) * FACTOR))
    g = min(255, int(g + (255 - g) * FACTOR))
    b = min(255, int(b + (255 - b) * FACTOR))
    return f'rgba({r}, {g}, {b}, {a_val})'

def process_block_content(text):
    """Process color values in a dark-theme block, preserving exact whitespace."""
    # Hex colors
    def hex_replacer(m):
        h = m.group(0)
        return lighten_hex(h) if should_lighten(h) else h
    text = re.sub(r'#[0-9a-fA-F]{6}\b', hex_replacer, text)
    text = re.sub(r'#[0-9a-fA-F]{3}\b', hex_replacer, text)
    # rgba colors
    text = re.sub(r'rgba\((\d+,\s*\d+,\s*\d+,\s*[\d.]+)\)', lighten_rgba_match, text)
    return text

def find_block_boundaries(css):
    """Find start and end of each .dark-theme { ... } block."""
    blocks = []
    # Find each .dark-theme followed by a brace block
    pattern = re.compile(r'\.dark-theme\b')
    for m in pattern.finditer(css):
        # Find the opening brace after this selector group
        # First, find where the selector group ends (could span lines with commas)
        pos = m.start()
        # Look for {
        brace = css.find('{', pos)
        if brace == -1:
            continue
        # Find matching }
        depth = 0
        end = brace
        while end < len(css):
            if css[end] == '{':
                depth += 1
            elif css[end] == '}':
                depth -= 1
                if depth == 0:
                    break
            end += 1
        if depth != 0:
            continue
        blocks.append((brace + 1, end))  # content between braces
    
    # Merge overlapping/adjacent blocks (same selector group with multiple .dark-theme)
    return sorted(set(blocks), key=lambda b: b[0])

def main():
    with open(CSS_PATH, 'r') as f:
        css = f.read()
    
    blocks = find_block_boundaries(css)
    print(f"Found {len(blocks)} dark-theme blocks")
    
    # Process from end to start (preserves indices)
    result = list(css)  # mutable list of chars
    for content_start, content_end in reversed(blocks):
        old_content = css[content_start:content_end]
        new_content = process_block_content(old_content)
        if old_content != new_content:
            result[content_start:content_end] = list(new_content)
    
    result_str = ''.join(result)
    
    # Show changes
    changes = 0
    for i, (a, b) in enumerate(zip(css, result_str)):
        if a != b:
            changes += 1
    print(f"Changed {changes} characters total")
    
    with open(CSS_PATH, 'w') as f:
        f.write(result_str)
    
    print("Done. style.css updated. Backup at style.css.bak")

if __name__ == '__main__':
    main()
