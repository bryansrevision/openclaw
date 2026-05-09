# VM-800 OpenClaw Homelab Setup

## Hardware

- 2 vCPU, 6 GB RAM, 20 GB NVMe (nvme-storage pool)
- OS: Debian 12 (Proxmox LXC)
- IPs: 192.168.2.80 (LAN), 100.108.52.21 (Tailscale)

## Installation Path

- Binary: /usr/lib/node_modules/openclaw (npm global)
- Config: /home/openclaw/.openclaw/openclaw.json
- Service: systemd --user openclaw-gateway.service

## Environment Variables

All secrets loaded from Bitwarden Secrets Manager (BWS) via /etc/profile.d/openclaw.sh
See docs/homelab/provider-config.md for provider setup.

## Network Access

- Gateway: 127.0.0.1:18789 (loopback only)
- HTTPS proxy: nginx on 100.108.52.21:8443 → localhost:18789
- Tailscale: openclaw-gateway.tail0a43b3.ts.net
