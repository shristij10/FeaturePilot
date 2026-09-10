# FeaturePilot

A full-stack feature management and release control system for controlled feature rollouts across different deployment environments.

## Overview

FeaturePilot is an Application Feature Management and Release Control System designed to help teams manage feature flags and control feature releases throughout the software development lifecycle.

The system allows teams to create and manage feature flags, configure them across multiple environments, apply environment-specific overrides, define targeting rules, evaluate feature values, and track activities through audit logs.

## Key Features

- Feature flag creation and management
- Multiple deployment environments
- Environment-specific feature overrides
- Feature flag evaluation
- Percentage-based rollouts
- User and group targeting
- User group management
- Audit logging
- Dashboard analytics
- JWT-based authentication
- Multilingual interface with five languages
- Light, Dark, and System Default themes
- Progressive Web App (PWA) support
- SDK documentation and integration examples

## Deployment Environments

FeaturePilot supports independent feature configuration across:

- Development
- Staging
- Production
- UAT
- QA

This allows teams to test and control features at different stages without requiring the same configuration across every environment.

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- REST API integration

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic

### Database and Services
- PostgreSQL
- Redis

### Authentication
- JWT-based authentication

## Project Structure

```text
FeaturePilot/
├── backend/
│   ├── app/
│   ├── alembic/
│   ├── feature-flag-sdk/
│   ├── tests/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md