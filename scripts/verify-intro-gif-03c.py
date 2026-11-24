#!/usr/bin/env python3
"""Verify INTRO-GIF-03-C committed binary assets independently of customer data."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(os.environ.get('INTRO_GIF_03C_ASSETS', 'public/assets/invitation-intro'))
MANIFEST = json.loads((ROOT / 'manifest-03c.json').read_text(encoding='utf-8'))
ids = [f'intro-{i:02d}' for i in range(2, 13)]
assert list(MANIFEST['presets']) == ids, '11 IDs must remain ordered and distinct'
assert MANIFEST['intro01_unchanged'] is True
assert MANIFEST['frame_count'] == 8 and MANIFEST['duration_ms'] == 2000
assert MANIFEST['size_px'] == [480, 600] and MANIFEST['loop'] is False
assert 'intro-01' not in MANIFEST['presets']
original_manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
assert original_manifest['files']['poster.webp']['sha256'] == '497ed73a363ca4ce0e04f7ab6a19908badbe1b95213672fb29e27fd86eecf0be'
assert original_manifest['files']['universal-2s.gif']['sha256'] == 'dcdc8c0560282a3da8b9e6cd5d10b5407fe4e7bb3da75fe66160260f802aa2b7'

passed = 0
for id in ids:
    record = MANIFEST['presets'][id]
    group = record['group']
    limit = {'simple': 100000, 'emotional': 180000,
             'luxury': 350000, 'character': 450000}[group]
    assert record['budget_bytes'] == limit, id
    for ext in ('.gif', '.webp'):
        file = ROOT / (id + ext)
        entry = record['files'][file.name]
        assert file.is_file(), id + ext
        assert file.stat().st_size == entry['size_bytes'], id + ext
        sha = hashlib.sha256(file.read_bytes()).hexdigest()
        assert sha == entry['sha256'], id + ext + ' SHA256 mismatch'
    gif = ROOT / (id + '.gif')
    assert gif.stat().st_size <= limit, id + ' GIF budget exceeded'
    with Image.open(gif) as animation:
        assert animation.format == 'GIF' and animation.size == (480,600)
        assert animation.n_frames == 8 and 'loop' not in animation.info, id
        durations = []
        previous = None
        for frame_index in range(8):
            animation.seek(frame_index)
            durations.append(animation.info.get('duration'))
            frame = animation.convert('RGB')
            if previous is not None:
                diff = ImageChops.difference(previous, frame)
                assert diff.getbbox() is not None, f'{id} repeated frame {frame_index}'
            previous = frame
        assert durations == [250]*8, (id, durations)
        final_frame = previous
    with Image.open(ROOT / (id + '.webp')) as poster:
        assert poster.format == 'WEBP' and poster.size == (480,600)
        difference = ImageChops.difference(final_frame, poster.convert('RGB'))
        mae = sum(ImageStat.Stat(difference).mean)/3
        assert mae < 15, (id, 'final poster mismatch', mae)
    if int(id[-2:]) >= 7:
        assert record['supported_event_types'] == ['wedding'], id
    else:
        assert len(record['supported_event_types']) == 5, id
    passed += 1
    print(f'{id}: OK; {gif.stat().st_size} bytes; 8x250ms; one play; poster diff={mae:.2f}',flush=True)
print('INTRO_GIF_03C_VERIFIED',f'{passed}/11',flush=True)
