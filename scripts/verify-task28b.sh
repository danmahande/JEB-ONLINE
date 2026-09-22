#!/usr/bin/env bash
# Task 28b — crack-state forensics: what paints where inside the cracked drawer
cd /home/z/my-project

node node_modules/next/dist/bin/next dev -p 3000 > /tmp/next-dev-task28b.log 2>&1 &
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
agent-browser wait 2000

COORDS=$(agent-browser eval "(() => { const t=[...document.querySelectorAll('.ms-tile')][1]; t.scrollIntoView({behavior:'instant', block:'center'}); const r=t.querySelector('button[aria-controls]').getBoundingClientRect(); return Math.round(r.left+r.width/2)+' '+Math.round(r.top+r.height/2); })()")
XY=$(echo "$COORDS" | grep -oE '[0-9]+ [0-9]+' | head -1)
X=$(echo $XY | cut -d' ' -f1)
Y=$(echo $XY | cut -d' ' -f2)
agent-browser mouse move "$X" "$Y"
agent-browser wait 700

echo -n "CRACK_FORENSICS: "
agent-browser eval "(() => {
  const t=[...document.querySelectorAll('.ms-tile')][1];
  const d=t.querySelector('.ms-drawer');
  const i=t.querySelector('.ms-drawer-inner');
  const w=t.querySelector('.ms-drawer-well');
  const dr=d.getBoundingClientRect(), ir=i.getBoundingClientRect(), wr=w.getBoundingClientRect();
  const cs=getComputedStyle(d);
  const cx=Math.round(dr.left+dr.width/2);
  const probes=[3,10,18,26,34,42,50].map(off=>{
    const y=dr.top+off;
    const el=document.elementFromPoint(cx,y);
    return off+':'+(el?el.className.toString().split(' ').slice(0,2).join('.'):'none');
  });
  return JSON.stringify({
    track: cs.gridTemplateRows,
    cavityH: Math.round(dr.height),
    innerTopInCavity: Math.round(ir.top-dr.top),
    innerH: Math.round(ir.height),
    wellTopInCavity: Math.round(wr.top-dr.top),
    wellH: Math.round(wr.height),
    probes: probes.join(' | ')
  });
})()"

agent-browser screenshot /home/z/my-project/download/meridian-task28-crack-forensics.png
agent-browser close
echo "DONE"
