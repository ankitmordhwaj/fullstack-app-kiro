# Security Notes

## Secret Management
- Never commit `.env` files — they contain credentials
- Use environment variable references in config files (`${VAR_NAME}`)
- Atlassian tokens stored in `.env`, referenced by `.kiro/settings/mcp.json`
- `.kiro/settings/` is in `.gitignore` to prevent accidental secret exposure

## GitHub Push Protection
- GitHub scans pushes for known secret patterns
- If blocked, remove the secret from history before retrying
