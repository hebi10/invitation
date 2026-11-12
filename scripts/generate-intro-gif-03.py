#!/usr/bin/env python3
"""INTRO-GIF-03: nine deterministic, event-neutral, non-looping 2s GIFs.

Only the nine new assets and a separate manifest are generated. The original
intro-01 asset is not changed. Requires Pillow and installed Noto CJK fonts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H, FRAMES, DURATION = 480, 600, 8, 250
BG, PAPER, WHITE = (250, 250, 250), (242, 242, 242), (255, 255, 255)
INK, SOFT, LIGHT = (37, 37, 37), (107, 107, 107), (185, 185, 185)
FONT_DIR = Path('/usr/share/fonts/opentype/noto')
FONT_PATHS = {
    'serif': FONT_DIR / 'NotoSerifCJK-Regular.ttc',
    'sans': FONT_DIR / 'NotoSansCJK-Regular.ttc',
}
PRESETS = (
    ('intro-02', '봉투 열림', '봉투가 열리고 초대 카드가 나타납니다.', 'envelope'),
    ('intro-03', '종이 펼침', '접힌 종이가 펼쳐지며 문구를 보여줍니다.', 'unfold'),
    ('intro-04', '사진 프레임', '직사각형 프레임이 만들어지고 문구가 등장합니다.', 'frame'),
    ('intro-05', '타이핑', '초대 문구가 한 글자씩 입력됩니다.', 'typing'),
    ('intro-06', '페이지 넘김', '페이지 모서리가 넘어가며 초대장이 공개됩니다.', 'turn'),
    ('intro-07', '슬라이딩 패널', '좌우 패널이 움직여 가운데 문구를 보여줍니다.', 'slide'),
    ('intro-08', '선 드로잉', '가느다란 선이 원을 그리며 초대 문구를 감쌉니다.', 'line'),
    ('intro-09', '창문 열림', '두 문이 좌우로 열리며 문구를 드러냅니다.', 'window'),
    ('intro-10', '타이틀 등장', '중앙 타이틀과 수평선이 차례로 나타납니다.', 'title'),
)


def fonts():
    for file in FONT_PATHS.values():
        if not file.is_file():
            raise RuntimeError('Missing Noto CJK fonts: install fonts-noto-cjk')
    return (
        ImageFont.truetype(str(FONT_PATHS['serif']), 48),
        ImageFont.truetype(str(FONT_PATHS['sans']), 16),
    )


def center_text(draw, text, y, font, ink=INK):
    bbox = draw.textbbox((0, 0), text, font=font)
    x = (W - (bbox[2] - bbox[0])) / 2 - bbox[0]
    draw.text((int(x), int(y - bbox[1])), text, font=font, fill=ink)


def line(draw, xy, fill=INK, width=2):
    draw.line(xy, fill=fill, width=width, joint='curve')


def invitation(draw, opacity=1.0, y=285, serif=None, sans=None, title='초대합니다'):
    darkness = round(250 - 213 * max(0, min(1, opacity)))
    center_text(draw, title, y, serif, (darkness,) * 3)
    center_text(draw, 'I N V I T A T I O N', y - 73, sans, (min(darkness + 42, 210),) * 3)


def draw_scene(mode, index, serif, sans):
    p = (index + 1) / FRAMES
    image = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(image)
    if mode == 'envelope':
        box = (86, 254, 394, 405)
        d.rectangle(box, fill=WHITE, outline=SOFT, width=2)
        flap_y = int(326 - 101 * min(1, p * 1.3))
        line(d, [(87, 256), (240, flap_y), (393, 256)], fill=LIGHT, width=2)
        if p >= .38:
            lift = int(100 * min(1, (p - .38) / .55))
            d.rectangle((106, 280 - lift, 374, 400 - lift), fill=WHITE, outline=LIGHT, width=2)
            if p > .55:
                center_text(d, '초대합니다', 313 - lift, serif)
        line(d, [(87, 405), (240, 318), (393, 405)], fill=LIGHT, width=1)
    elif mode == 'unfold':
        width = int(72 + 302 * p)
        height = int(95 + 267 * p)
        x1, y1 = (W-width)//2, (H-height)//2
        d.rectangle((x1,y1,x1+width,y1+height), fill=WHITE, outline=SOFT, width=2)
        line(d, [(W//2, y1+12),(W//2, y1+height-12)], fill=LIGHT, width=1)
        if p>.4: invitation(d, (p-.4)/.6, serif=serif, sans=sans)
    elif mode == 'frame':
        w, h = int(100+250*p), int(110+330*p)
        l, t = (W-w)//2, (H-h)//2
        d.rectangle((l,t,l+w,t+h), outline=LIGHT, width=2)
        corner = min(28,int(8+26*p))
        for x, sx in ((l,1),(l+w,-1)):
            for y, sy in ((t,1),(t+h,-1)):
                line(d,[(x,y+corner*sy),(x,y),(x+corner*sx,y)], width=3)
        if p>.25: invitation(d,(p-.25)/.75,serif=serif,sans=sans)
    elif mode == 'typing':
        d.rectangle((72,246,408,374),outline=LIGHT,width=2)
        chars='초대합니다'
        count=max(1,min(len(chars),int(round(p*len(chars)))))
        title=chars[:count]
        center_text(d,title,287,serif)
        bbox=d.textbbox((0,0),title,font=serif)
        x=W//2+(bbox[2]-bbox[0])//2+8
        line(d,[(x,287),(x,336)],width=2)
        center_text(d,'I N V I T A T I O N',231,sans,SOFT)
        line(d,[(154,359),(154+index*24,359)],LIGHT,1)
    elif mode == 'turn':
        d.rectangle((73,132,407,477),fill=WHITE,outline=LIGHT,width=2)
        invitation(d,serif=serif,sans=sans)
        fold=int((1-p)*294)
        if fold>0:
            x=406-fold
            d.polygon([(x,133),(408,133),(408,477),(x,477)],fill=PAPER)
            d.polygon([(x,133),(x+min(32,fold//3),133),(x,133+min(32,fold//3))],fill=LIGHT)
            line(d,[(x,133),(x,477)],fill=SOFT,width=1)
    elif mode == 'slide':
        invitation(d,serif=serif,sans=sans)
        reach=int(240*p)
        d.rectangle((0,130,240-reach,470),fill=PAPER)
        if 240+reach<=479: d.rectangle((240+reach,130,479,470),fill=PAPER)
        line(d,[(240-reach,130),(240-reach,470)],SOFT,2)
        line(d,[(240+reach,130),(240+reach,470)],SOFT,2)
        line(d,[(88,215),(392,215)],LIGHT,1)
        line(d,[(88,394),(392,394)],LIGHT,1)
    elif mode == 'line':
        box=(103,160,377,434)
        start=-90
        sweep=max(18,int(360*p))
        d.arc(box,start=start,end=start+sweep,fill=SOFT,width=2)
        if p>.33: invitation(d,(p-.33)/.67,serif=serif,sans=sans)
        line(d,[(168,417),(168+int(144*p),417)],LIGHT,2)
    elif mode == 'window':
        invitation(d,serif=serif,sans=sans)
        width=int(165*(1-p))
        d.rectangle((75,160,75+width,440),fill=PAPER,outline=SOFT,width=2)
        d.rectangle((405-width,160,405,440),fill=PAPER,outline=SOFT,width=2)
        d.rectangle((75,160,405,440),outline=LIGHT,width=2)
        line(d,[(75,160),(405,160)],LIGHT,2)
        line(d,[(75,440),(405,440)],LIGHT,2)
    elif mode == 'title':
        length=int(140*p)
        line(d,[(W//2-length,220),(W//2+length,220)],SOFT,2)
        line(d,[(W//2-length,390),(W//2+length,390)],SOFT,2)
        shift=int((1-p)*36)
        invitation(d,p,y=285+shift,serif=serif,sans=sans)
        line(d,[(240,422),(240,422-int(22*p))],LIGHT,1)
    else:
        raise ValueError(mode)
    return image


def hash_file(path):
    return {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def inspect_gif(path):
    with Image.open(path) as gif:
        assert gif.size == (W,H), f'{path.name}: wrong canvas'
        assert gif.n_frames == FRAMES, f'{path.name}: expected 8 frames, got {gif.n_frames}'
        assert 'loop' not in gif.info, f'{path.name}: GIF must not loop'
        duration = 0
        for i in range(gif.n_frames):
            gif.seek(i)
            duration += gif.info.get('duration', 0)
        assert duration == FRAMES*DURATION, f'{path.name}: wrong duration {duration}'


def apply_catalog(catalog, generated):
    if catalog is None: return
    content = catalog.read_text(encoding='utf-8')
    start, end = '  // INTRO-GIF-03 GENERATED START\n', '  // INTRO-GIF-03 GENERATED END\n'
    entries=[]
    for i, (pid,label,description,mode) in enumerate(PRESETS, start=2):
        sha=generated[pid]['files'][f'{pid}.gif']['sha256']
        entries.append('  {\n'+
          f"    id: '{pid}',\n    label: '{label}',\n    description: '{description}',\n"+
          f"    gifSrc: '/assets/invitation-intro/{pid}.gif',\n"+
          f"    posterSrc: '/assets/invitation-intro/{pid}.webp',\n"+
          f"    durationMs: 2000,\n    sha256: '{sha}',\n    active: true,\n    sortOrder: {i},\n"+
          '  },\n')
    block = start + ''.join(entries) + end
    if start in content and end in content:
        content=content[:content.index(start)] + block + content[content.index(end)+len(end):]
    else:
        anchor='] as const satisfies readonly InvitationIntroPreset[];'
        assert content.count(anchor)==1, 'Intro catalogue layout changed'
        content=content.replace(anchor, block+anchor)
    catalog.write_text(content,encoding='utf-8')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',type=Path,default=Path('public/assets/invitation-intro'))
    parser.add_argument('--catalog',type=Path,default=Path('src/lib/invitationIntroCatalog.ts'))
    parser.add_argument('--skip-catalog',action='store_true')
    args=parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    serif,sans=fonts()
    manifest={'task':'INTRO-GIF-03','event_agnostic':True,'frames':FRAMES,
              'duration_per_frame_ms':DURATION,'total_duration_ms':2000,
              'repeat':False,'canvas':[W,H],'presets':{}}
    for pid,label,description,mode in PRESETS:
        rendered=[draw_scene(mode,i,serif,sans) for i in range(FRAMES)]
        palette_frames=[im.quantize(colors=48,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
                        for im in rendered]
        gif=args.output/f'{pid}.gif'
        palette_frames[0].save(gif,format='GIF',save_all=True,append_images=palette_frames[1:],
                               duration=[DURATION]*FRAMES,optimize=True,disposal=2)
        inspect_gif(gif)
        poster=args.output/f'{pid}.webp'
        rendered[-1].save(poster,'WEBP',quality=88,method=6)
        png=args.output/f'{pid}.png'
        rendered[-1].save(png,'PNG',optimize=True)
        with Image.open(poster) as im: assert im.size==(W,H)
        filenames=[gif.name,poster.name,png.name]
        record={'id':pid,'label':label,'description':description,'scene':mode,
                'frames':FRAMES,'duration_ms':2000,'loop':False,
                'files':{name:hash_file(args.output/name) for name in filenames}}
        assert record['files'][gif.name]['bytes'] < 150000, pid + ': gif too large'
        manifest['presets'][pid]=record
    dest=args.output/'manifest-03.json'
    dest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    if not args.skip_catalog:
        apply_catalog(args.catalog,manifest['presets'])
    print(json.dumps({'generated':list(manifest['presets']),
          'gif_sizes':{p:manifest['presets'][p]['files'][p+'.gif']['bytes'] for p in manifest['presets']}},
          ensure_ascii=False))


if __name__=='__main__': main()
