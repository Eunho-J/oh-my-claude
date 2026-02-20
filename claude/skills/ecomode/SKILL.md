---
name: ecomode
description: Resource-efficient operation mode
invocation: user
allowed_tools:
  - mcp__chronos__ecomode_*
  - mcp__chronos__chronos_status
---

# Ecomode - Resource-Efficient Operation

Enable or disable ecomode for cost-effective, faster execution.

## Invocation

```
/ecomode on              # Enable ecomode
/ecomode off             # Disable ecomode
/ecomode status          # Check current status
/ecomode on --full       # Enable with all optimizations
/ecomode on --lite       # Enable with minimal optimizations
```

## What Ecomode Does

When enabled, ecomode optimizes for resource efficiency:

| Normal Mode | Ecomode |
|-------------|---------|
| Metis analysis | SKIPPED |
| Verbose responses | Concise responses |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `prefer_haiku` | true | Use Haiku variants for agents |
| `skip_metis` | true | Skip pre-planning analysis |
| `shorter_responses` | true | Request concise outputs |

## Workflow

### Enable Ecomode

```
User: /ecomode on

Skill:
1. Call mcp__chronos__ecomode_enable()
2. Confirm settings
3. Report status
```

### Disable Ecomode

```
User: /ecomode off

Skill:
1. Call mcp__chronos__ecomode_disable()
2. Confirm normal mode restored
```

### Check Status

```
User: /ecomode status

Skill:
1. Call mcp__chronos__ecomode_status()
2. Display current settings
```

## Use Cases

### Quick Tasks

```
/ecomode on
"Fix all typos in docs"

Result: Skips Metis analysis, uses concise responses
```

### Important Features

```
/ecomode off
"Implement payment processing"

Result: Uses full Opus/Sonnet agents with Metis for quality
```

### Mixed Workload

```
/ecomode on --lite
"Add user profile page"

Result: Uses lower agents but keeps some quality checks
```

## Notes

- Ecomode is session-persistent (survives restarts)
- Can be changed mid-task
- Quality may decrease for complex tasks
- Recommended for simple, bulk operations
