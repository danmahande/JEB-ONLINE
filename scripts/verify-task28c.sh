#!/usr/bin/env bash
# Task 28c — reliable hover-crack capture + pixel-level probes + cropped close-up
cd /home/z/my-project

node node_modules/next/dist/bin/next dev -p 3000 > /tmp/next-dev-task28c.log 2>&1 &
SERVER_PID=$!
cleanup() { kill $SERVER_PID 2>/dev/null; wait $SERVER_PID 2>/dev/null; return 0; }
trap cleanup EXIT

for i in $(seq 1 45); do
  curl -s -o /dev/null http://localhost:3000 && break
  sleep 1
done
echo "SERVER: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000)"

agent-browser set viewport 1440 900
agent-browser open http://localhost:3000
agent-browser wait --load networkidle
agent-browser wait 2500

# hover tile 2 with a jiggle (headless :hover is racy on a fresh page)
COORDS=$(agent-browser eval "(() => { const t=[...document.querySelectorAll('.ms-tile')][1]; t.scrollIntoView({behavior:'instant', block:'center'}); const r=t.querySelector('button[aria-controls]').getBoundingClientRect(); return Math.round(r.left+r.width/2)+' '+Math.round(r.top+r.height/2); })()")
XY=$(echo "$COORDS" | grep -oE '[0-9]+ [0-9]+' | head -1)
X=$(echo $XY | cut -d' ' -f1)
Y=$(echo $XY | cut -d' ' -f2)
agent-browser mouse move "$X" "$Y"
agent-browser wait 350
agent-browser mouse move $((X+2)) "$Y"
agent-browser wait 200
agent-browser mouse move "$X" "$Y"
agent-browser wait 600

echo -n "HOVER_ASSERT: "
agent-browser eval "(() => { const h=document.querySelector('.ms-tile:hover'); return h ? h.querySelector('.ms-file-label').textContent : 'NO_HOVER'; })()"

echo -n "CRACK_PROBES: "
agent-browser eval "(() => {
  const t=document.querySelector('.ms-tile:hover');
  if (!t) return 'NO_HOVER';
  const d=t.querySelector('.ms-drawer');
  const i=t.querySelector('.ms-drawer-inner');
  const w=t.querySelector('.ms-drawer-well');
  const dr=d.getBoundingClientRect(), ir=i.getBoundingClientRect(), wr=w.getBoundingClientRect();
  const cs=getComputedStyle(d);
  const cx=Math.round(dr.left+dr.width/2);
  const probes=[2,6,10,14,20,30,40,50].map(off=>{
    const el=document.elementFromPoint(cx,dr.top+off);
    return off+':'+(el?el.className.toString().split(' ').slice(0,2).join('.'):'none');
  });
  return JSON.stringify({
    track: cs.gridTemplateRows.slice(0,8),
    cavity: [Math.round(dr.left),Math.round(dr.top),Math.round(dr.width),Math.round(dr.height)].join(','),
    innerTopOff: Math.round(ir.top-dr.top),
    innerH: Math.round(ir.height),
    wellTopOff: Math.round(wr.top-dr.top),
    probes: probes.join(' | ')
  });
})()"

agent-browser screenshot /home/z/my-project/download/meridian-task28-crack-raw.png

# open state for the rim check
agent-browser mouse down left
agent-browser mouse up left
agent-browser wait 900
agent-browser screenshot /home/z/my-project/download/meridian-task28-open-raw.png
agent-browser close

python3 - << 'PYEOF'
from PIL import Image
# crop the crack slab under tile 2 and upscale 3x for inspection
img = Image.open('/home/z/my-project/download/meridian-task28-crack-raw.png')
print('raw size:', img.size)
crop = img.crop((300, 640, 580, 730)).resize((280*3, 90*3), Image.LANCZOS)
crop.save('/home/z/my-project/download/meridian-task28-crack-zoom.png')
img2 = Image.open('/home/z/my-project/download/meridian-task28-open-raw.png')
crop2 = img2.crop((300, 640, 580, 900)).resize((280*2, 260*2), Image.LANCZOS)
crop2.save('/home/z/my-project/download/meridian-task28-open-zoom.png')
print('crops saved')
PYEOF
echo "DONE"
