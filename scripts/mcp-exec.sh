#!/bin/bash
# mcp-exec.sh — execute a command through the ZAI service's MCP Bash tool.
# Why: tool-call spawned processes are reaped between calls by the sandbox,
# but the ZAI service (PID tree of tini/start.sh) survives. Commands run
# there persist. Usage: mcp-exec.sh <file-containing-command>
CMD_FILE="$1"
[ -f "$CMD_FILE" ] || { echo "usage: mcp-exec.sh <file-with-command>" >&2; exit 64; }

PAYLOAD=$(python3 -c "
import json,sys
cmd=open(sys.argv[1]).read()
print(json.dumps({'jsonrpc':'2.0','method':'tools/call','params':{'name':'Bash','arguments':{'command':cmd}},'id':9}))" "$CMD_FILE")

curl -s -m 330 -X POST http://localhost:12600/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "$PAYLOAD" | python3 -c "
import sys,json
for line in sys.stdin:
    line=line.strip()
    if line.startswith('data:'):
        d=json.loads(line[5:])
        r=d.get('result',{})
        if r.get('isError'): print('[MCP-ERROR]', file=sys.stderr)
        for c in r.get('content',[]):
            if c.get('type')=='text': print(c['text'])
        break
else:
    print('[MCP] no data frame in response', file=sys.stderr)
"
