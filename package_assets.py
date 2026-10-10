from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, csv, zipfile

root = Path(__file__).parent / 'cyberpunk_jazz_mv'
assets = sorted(p for p in root.glob('*/*.png'))
font_path = 'C:/Windows/Fonts/consola.ttf'
font = ImageFont.truetype(font_path, 17)
titlefont = ImageFont.truetype(font_path, 28)
sheet = Image.new('RGB', (1440, 2240), '#100c20')
draw = ImageDraw.Draw(sheet)
draw.text((30, 22), 'CYBERPUNK JAZZ / IF I HAVE NO TOMORROW', font=titlefont, fill='#00e5ff')
draw.text((30, 62), '24 INDIVIDUAL TRANSPARENT PNG ASSETS / 6 CATEGORIES', font=font, fill='#ff2aaf')
metadata = []
for i, path in enumerate(assets):
    im = Image.open(path)
    assert im.mode == 'RGBA', path
    alpha = im.getchannel('A')
    lo, hi = alpha.getextrema()
    assert lo == 0 and hi > 0, path
    bbox = alpha.getbbox()
    edges = [alpha.crop((0,0,im.width,1)).getextrema()[1], alpha.crop((0,im.height-1,im.width,im.height)).getextrema()[1], alpha.crop((0,0,1,im.height)).getextrema()[1], alpha.crop((im.width-1,0,im.width,im.height)).getextrema()[1]]
    hist = alpha.histogram()
    metadata.append({'file':path.relative_to(root).as_posix(), 'width':im.width, 'height':im.height, 'mode':im.mode, 'alpha_min':lo, 'alpha_max':hi, 'transparent_percent':round(100*hist[0]/(im.width*im.height),2), 'alpha_bbox':bbox, 'max_edge_alpha':max(edges)})
    x, y = (i%4)*360, 110+(i//4)*350
    draw.rounded_rectangle((x+8,y+4,x+352,y+342),radius=10,fill='#19152c',outline='#32274a')
    preview = im.copy()
    preview.thumbnail((328, 288), Image.Resampling.LANCZOS)
    sheet.paste(preview,(x+(360-preview.width)//2,y+10+(288-preview.height)//2),preview)
    draw.text((x+17,y+304),path.parent.name,fill='#00e5ff',font=font)
    draw.text((x+17,y+325),path.stem,fill='#ffffff',font=font)
sheet.save(root/'CONTACT_SHEET.jpg', quality=95)
(root/'asset_manifest.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
with (root/'asset_manifest.csv').open('w',newline='',encoding='utf-8') as f:
    writer=csv.DictWriter(f,fieldnames=metadata[0].keys());writer.writeheader();writer.writerows(metadata)
print(json.dumps({'count':len(assets),'edge_warnings':[r for r in metadata if r['max_edge_alpha']>8],'sizes':sorted(set((r['width'],r['height']) for r in metadata))},indent=2))
