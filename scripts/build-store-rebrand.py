#!/usr/bin/env python3
"""Generate flat Invitation icons and editorial Play images from verified real app screens."""
import argparse,hashlib,json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
BG=(249,248,245); INK=(36,37,36); MUTED=(109,108,106); ROSE=(169,117,114); LINE=(213,211,206)
NAMES=[f'invitation-phone-{i:02d}-{n}-1080x1920.png' for i,n in enumerate(['overview','themes','create','media','venue','preview','share','manage'],1)]
TITLES=[('우리의 이야기를 담는\n모바일 청첩장','사진부터 공유까지, 한곳에서'),('웨딩 디자인 살펴보기','신민제 · 김현지의 청첩장 디자인 예시'),('차근차근 만드는 청첩장','기본 정보부터 사진과 음악까지'),('사진과 음악으로 완성','소중한 순간을 담는 편집 화면'),('예식 일정과 장소 안내','날짜와 오시는 길을 한눈에'),('완성 전에 미리보기','다섯 가지 웨딩 디자인 확인'),('카카오톡 카드로 공유','완성한 청첩장을 간편하게 전달'),('제작 후에도 수정·관리','연결된 청첩장의 내용을 편집')]
def font(size,bold=False):
    choices=('/usr/share/fonts/truetype/nanum/NanumBarunGothicBold.ttf','/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc') if bold else ('/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf','/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
    for p in choices:
        if Path(p).is_file():return ImageFont.truetype(p,size)
    raise RuntimeError('Install Korean fonts: fonts-nanum or fonts-noto-cjk')
def icon(size):
    k=3; W=1024*k; a=Image.new('RGBA',(W,W),BG+(255,));d=ImageDraw.Draw(a)
    def P(x,y):return(round(x*k),round(y*k))
    def B(*a):return tuple(round(t*k) for t in a)
    d.rounded_rectangle(B(240,398,784,731),radius=32*k,fill=(222,215,209),outline=INK,width=11*k)
    d.rounded_rectangle(B(320,287,704,546),radius=10*k,fill=(255,254,251),outline=INK,width=10*k)
    d.ellipse(B(435,344,522,426),outline=ROSE,width=14*k);d.ellipse(B(500,344,587,426),outline=ROSE,width=14*k)
    d.line([P(384,468),P(640,468)],fill=LINE,width=10*k)
    d.polygon([P(245,478),P(512,641),P(779,478),P(779,714),P(245,714)],fill=BG)
    d.line([P(245,478),P(512,641),P(779,478)],fill=INK,width=11*k,joint='curve')
    d.line([P(245,712),P(447,585)],fill=INK,width=9*k);d.line([P(779,712),P(577,585)],fill=INK,width=9*k)
    d.line([P(245,715),P(779,715)],fill=INK,width=10*k)
    heart=[]
    for t in range(120):
        t=t*2*math.pi/120;heart.append(P(512+4.0*16*math.sin(t)**3,564-3.3*(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))))
    d.polygon(heart,fill=ROSE)
    return a.resize((size,size),Image.Resampling.LANCZOS)
def make_icons():
    for name,n in [('apps/mobile/assets/icon-v3.png',1024),('apps/mobile/store/icon.png',512),('apps/mobile/store/ko-KR/icon.png',512)]:
        path=Path(name);path.parent.mkdir(parents=True,exist_ok=True);icon(n).save(path,'PNG',compress_level=9)
        print(name,hashlib.sha256(path.read_bytes()).hexdigest())
def make_screens(source,target):
    manifest=json.loads((source/'manifest.json').read_text(encoding='utf-8'))
    if len(manifest.get('assets',[]))!=8:raise ValueError('Need eight verified original screenshots')
    target.mkdir(parents=True,exist_ok=True)
    records=[]
    for idx,name in enumerate(NAMES,1):
        original=source/name;raw=original.read_bytes();src=manifest['assets'][idx-1]
        if src.get('file')!=name or hashlib.sha256(raw).hexdigest()!=src.get('sha256'):raise ValueError('Source mismatch: '+name)
        with Image.open(original) as original_image:
            if original_image.size!=(1080,1920):raise ValueError('Invalid source dimensions')
            center=original_image.convert('RGB').crop((72,465,1008,1717)).resize((932,1246),Image.Resampling.LANCZOS)
        image=Image.new('RGB',(1080,1920),BG);d=ImageDraw.Draw(image)
        small=font(27,True);head=font(65,True);sub=font(31)
        d.text((74,67),'INVITATION',font=small,fill=INK)
        counter=f'{idx:02d} / 08';d.text((1005-d.textlength(counter,font=small),68),counter,font=small,fill=MUTED)
        lines=TITLES[idx-1][0].split('\n')
        for i,text in enumerate(lines):d.text((74,158+i*90),text,font=head,fill=INK)
        d.text((74,158+len(lines)*90+23),TITLES[idx-1][1],font=sub,fill=MUTED)
        d.rectangle((74,447,1006,450),fill=ROSE)
        image.paste(center,(74,488));d.rectangle((73,487,1006,1735),outline=LINE,width=2)
        footer='MOBILE WEDDING';d.text((75,1823),footer,font=small,fill=INK)
        foot2='WEDDING EDITORIAL';d.text((1005-d.textlength(foot2,font=small),1823),foot2,font=small,fill=MUTED)
        path=target/name;image.save(path,'PNG',compress_level=9)
        data=path.read_bytes()
        if len(data)>8_000_000:raise ValueError('File too large: '+name)
        records.append({'index':idx,'file':name,'width':1080,'height':1920,'mode':'RGB','sha256':hashlib.sha256(data).hexdigest(),'size_bytes':len(data),'original_sha256':hashlib.sha256(raw).hexdigest()})
    (target/'manifest.json').write_text(json.dumps({'project':'Invitation','edition':'2026-11-09-minimal','assets':records,'sample_names':'신민제 · 김현지','source_integrity':'Verified captured app screens preserved with flat editorial framing.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Generated 8 real-screen editorial screenshots in',target)
def main():
    p=argparse.ArgumentParser();p.add_argument('--icon-only',action='store_true');p.add_argument('--screenshots-only',action='store_true');p.add_argument('--source',type=Path,default=Path('store-assets/invitation/ko-KR'));p.add_argument('--target',type=Path,default=Path('artifacts/store-refresh/ko-KR'));args=p.parse_args()
    if not args.screenshots_only:make_icons()
    if not args.icon_only:make_screens(args.source,args.target)
if __name__=='__main__':main()
