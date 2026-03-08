# KithNode — Ralph Dev Workflow

## Prerequisites
- Claude Code CLI installed
- jq installed
- Git initialized in this repo
- Git Bash (Windows) for running ralph.sh

## Quick Start
1. git init && git add -A && git commit -m "initial: scaffold with Ralph"
2. Open Git Bash
3. chmod +x scripts/ralph/ralph.sh
4. ./scripts/ralph/ralph.sh --tool claude 15

## Check Progress
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'
cat scripts/ralph/progress.txt
git log --oneline -10

## Adding New Features
1. Write a PRD in tasks/prd-[feature-name].md
2. Convert to prd.json format
3. Run Ralph: ./scripts/ralph/ralph.sh --tool claude 20
