# MCP Server Integration — Bryan's Homelab

## Configured MCP Servers (VM-800)

| Server              | Endpoint                  | Purpose                  |
| ------------------- | ------------------------- | ------------------------ |
| sequential-thinking | local                     | Multi-step reasoning     |
| filesystem          | local                     | /home/openclaw/workspace |
| memory              | local                     | Knowledge graph          |
| n8n                 | http://192.168.2.150:5678 | Workflow automation      |
| brave-search        | remote                    | Web search               |
| github              | remote                    | GitHub operations        |
| home-assistant      | http://192.168.2.184:8123 | HA entity control        |

## Key Notes

- All remote API keys loaded from BWS via /etc/profile.d/openclaw.sh
- n8n and HA are local homelab services
- GitHub token is bryansrevision PAT
