# OpenClaw Provider Configuration — Bryan's Homelab

## Configured Providers

| Provider   | Model             | Purpose         | API Key Source            |
| ---------- | ----------------- | --------------- | ------------------------- |
| openrouter | auto              | Primary routing | BWS: API-001              |
| anthropic  | claude-sonnet-4-5 | Code/reasoning  | BWS: API-001              |
| openai     | gpt-4o            | General         | BWS: API-001              |
| google     | gemini-2.5-flash  | Research        | BWS: API-001              |
| ollama     | qwen2.5-coder:7b  | Local/free      | http://192.168.2.41:11434 |

## Agent Profiles

| Agent        | Model                       | Purpose                    |
| ------------ | --------------------------- | -------------------------- |
| ops          | ollama/qwen2.5-coder:7b     | Infrastructure ops (local) |
| ha-assistant | google/gemini-2.5-flash     | Home Assistant help        |
| dev          | anthropic/claude-sonnet-4-5 | Development tasks          |
| n8n-auto     | google/gemini-2.0-flash     | n8n workflow automation    |
