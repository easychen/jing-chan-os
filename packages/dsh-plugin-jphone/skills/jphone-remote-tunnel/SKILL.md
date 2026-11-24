---
name: jphone-remote-tunnel
description: Configure a secure remote tunnel (Cloudflare Tunnel, Tailscale, or frp) so the JPhone Android/iOS client can connect to this DeepSeek Harness instance from outside the LAN.
---

# JPhone Remote Tunnel Skill

When the user wants their mobile JPhone app to reach this DeepSeek Harness host over cellular/remote networks:

1. Inspect the local JPhone bridge port (default `127.0.0.1:3189`, exposed via `JPHONE_BRIDGE_PORT` or `/jphone/api/state`).
2. Check available tunneling tools on the host (`cloudflared`, `tailscale`, `frpc`). Prefer `cloudflared tunnel --url http://127.0.0.1:<bridgePort>` for zero-account quick setup or `tailscale serve` if Tailscale is logged in.
3. Verify the public HTTPS endpoint responds `200 OK` on `<publicUrl>/jphone/api/health`.
4. Call `jphone_bind_endpoint({ publicUrl, provider })` so JPhone updates its mobile pairing QR code immediately.
5. Report the ready status back to 小鲸同学 succinctly.
