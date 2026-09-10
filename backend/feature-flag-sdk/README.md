# feature-flag-sdk

Python SDK for the Feature Management System.

---

## Structure

```
feature-flag-sdk/
├── feature_flag_sdk/
│   ├── __init__.py      # Package entry point
│   ├── client.py        # Main SDK client
│   ├── config.py        # Configuration (env-var based)
│   ├── cache.py         # Local in-process cache
│   ├── middleware.py    # WSGI/ASGI middleware helpers
│   └── exceptions.py   # SDK-specific exceptions
├── setup.py
├── requirements.txt
└── README.md
```

---

## Installation

```bash
pip install -e .
```

---

## Configuration

The SDK reads its settings from environment variables at import time.
You can set them directly in your shell, export them from a process
manager (e.g. systemd, Docker, Kubernetes), or load them from a `.env`
file using [python-dotenv](https://pypi.org/project/python-dotenv/).

### Environment variables

| Variable      | Description                                              | Default                    |
|---------------|----------------------------------------------------------|----------------------------|
| `FLAG_API_URL` | Base URL of the Feature Management System API            | `http://127.0.0.1:8000`   |
| `API_KEY`      | Optional API key sent as `X-API-Key` on every request    | *(empty — header omitted)* |
| `CACHE_TTL`    | Seconds to cache a flag evaluation result locally        | `300` (5 minutes)          |

### Example `.env` file

Create a `.env` file in the root of your application (never commit it):

```dotenv
# .env — Feature Flag SDK configuration

# Base URL of the running Feature Management System backend.
FLAG_API_URL=http://127.0.0.1:8000

# API key for request authentication (leave blank if not required).
API_KEY=your-secret-api-key-here

# How long (seconds) to cache evaluation results locally.
# Set to 0 to disable caching.
CACHE_TTL=300
```

Then load it at the top of your application entry point:

```python
from dotenv import load_dotenv
load_dotenv()   # must be called before importing the SDK

from feature_flag_sdk.config import settings
print(settings.flag_api_url)  # http://127.0.0.1:8000
print(settings.cache_ttl)     # 300
```

### Accessing configuration in code

```python
from feature_flag_sdk.config import settings

# Read individual settings
url = settings.flag_api_url   # str
key = settings.api_key        # str  (empty string if not set)
ttl = settings.cache_ttl      # int  (seconds, always >= 0)

# Check whether an API key is configured
if settings.has_api_key:
    print("API key is set")

# Safe repr — API key is masked in logs
print(settings)
# SDKConfig(flag_api_url='http://127.0.0.1:8000', api_key='your****', cache_ttl=300)
```

### Custom configuration (testing / multi-tenant)

Pass explicit values to `SDKConfig` when you need more than one
configuration, or when you want to avoid relying on environment variables
in tests:

```python
from feature_flag_sdk.config import SDKConfig

staging = SDKConfig(
    flag_api_url="https://staging.example.com",
    api_key="staging-key",
    cache_ttl=60,
)
```
