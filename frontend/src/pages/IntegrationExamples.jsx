// IntegrationExamples.jsx
// Integration Examples page — Milestone 3 Task 1

import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Typography,
} from '@mui/material'
import SpeedIcon      from '@mui/icons-material/SpeedRounded'
import LayersIcon     from '@mui/icons-material/LayersRounded'
import StorageIcon    from '@mui/icons-material/StorageRounded'
import AccountTreeIcon from '@mui/icons-material/AccountTreeRounded'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownwardRounded'

// ---------------------------------------------------------------------------
// Shared design tokens
// ---------------------------------------------------------------------------
const CARD_SX = {
  border:       '1px solid',
  borderColor:  'divider',
  borderRadius: 4,
  overflow:     'hidden',
  height:       '100%',
  display:      'flex',
  flexDirection: 'column',
  bgcolor:      'background.paper',
}

const HEADER_SX = {
  px:           3,
  py:           2,
  borderBottom: '1px solid',
  borderColor:  'divider',
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'space-between',
  bgcolor:      'background.paper',
}

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------
function CodeBlock({ children }) {
  return (
    <Box
      component="pre"
      sx={{
        m:           0,
        p:           2.5,
        bgcolor:     '#0f172a',
        borderRadius: 2,
        overflowX:   'auto',
        fontFamily:  '"Fira Code", "Cascadia Code", Consolas, monospace',
        fontSize:    '0.8125rem',
        lineHeight:  1.75,
        color:       '#e2e8f0',
        whiteSpace:  'pre',
        flexGrow:    1,
        '&::-webkit-scrollbar':       { height: 4 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: '#334155', borderRadius: 99 },
      }}
    >
      <Box component="code" sx={{ fontFamily: 'inherit', fontSize: 'inherit', color: 'inherit' }}>
        {children}
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// ExampleCard
// ---------------------------------------------------------------------------
function ExampleCard({ icon, title, badge, badgeColor = 'primary', description, code }) {
  return (
    <Card elevation={0} sx={CARD_SX}>
      <Box sx={HEADER_SX}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
          <Typography variant="subtitle2" fontWeight={700}>
            {title}
          </Typography>
        </Box>
        <Chip
          label={badge}
          size="small"
          color={badgeColor}
          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
        />
      </Box>

      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {description}
        </Typography>
        <CodeBlock>{code}</CodeBlock>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// ArchitectureFlow
// ---------------------------------------------------------------------------
// A simple vertical flow diagram built entirely from MUI components —
// no SVG, no external diagram library.
// ---------------------------------------------------------------------------
function ArchitectureFlow() {
  const nodes = [
    {
      label:   'Application',
      sub:     'Your Python service or web app',
      color:   'primary.main',
    },
    {
      label:   'FeatureFlagClient',
      sub:     'SDK client — is_enabled() entry point',
      color:   'success.main',
    },
    {
      label:   'Local Cache',
      sub:     'In-process TTL cache (default 300 s)',
      color:   'warning.main',
    },
    {
      label:   'Feature Flag API',
      sub:     'POST /flags/evaluate on the FeaturePilot backend',
      color:   'secondary.main',
    },
    {
      label:   'Response',
      sub:     'enabled: true / false returned to caller',
      color:   'text.primary',
    },
  ]

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ ...HEADER_SX, justifyContent: 'flex-start', gap: 1.25 }}>
        <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
          <AccountTreeIcon fontSize="small" />
        </Box>
        <Typography variant="subtitle2" fontWeight={700}>
          SDK Architecture
        </Typography>
        <Chip
          label="Flow Diagram"
          size="small"
          sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: 'action.selected', color: 'text.secondary' }}
        />
      </Box>

      <CardContent sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
          Every call to{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 1 }}>
            is_enabled()
          </Box>{' '}
          follows this path. The local cache is checked first — only a cache
          miss results in an HTTP request to the backend API.
        </Typography>

        {/* Flow nodes */}
        <Box sx={{ maxWidth: 520, mx: 'auto' }}>
          {nodes.map((node, idx) => (
            <Box key={node.label}>
              {/* Node box */}
              <Paper
                elevation={0}
                sx={{
                  p:            2,
                  border:       '1px solid',
                  borderColor:  'divider',
                  bgcolor:      'background.default',
                  borderRadius: 2.5,
                  textAlign:    'center',
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize:   '0.9375rem',
                    color:      node.color,
                    mb:         0.25,
                  }}
                >
                  {node.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {node.sub}
                </Typography>
              </Paper>

              {/* Arrow between nodes */}
              {idx < nodes.length - 1 && (
                <Box
                  sx={{
                    display:        'flex',
                    flexDirection:  'column',
                    alignItems:     'center',
                    py:             0.5,
                    color:          'text.disabled',
                  }}
                >
                  <ArrowDownwardIcon sx={{ fontSize: 20 }} />
                </Box>
              )}
            </Box>
          ))}
        </Box>

        {/* Cache-hit annotation */}
        <Divider sx={{ my: 3 }} />
        <Box
          sx={{
            display:      'flex',
            gap:          2,
            p:            2,
            borderRadius: 2,
            bgcolor:      'action.hover',
            border:       '1px solid',
            borderColor:  'warning.light',
          }}
        >
          <Typography sx={{ fontSize: '1.25rem', lineHeight: 1 }}>⚡</Typography>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'warning.dark', mb: 0.25 }}>
              Cache Hit Path
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              When a valid (unexpired) entry exists in the Local Cache for the
              same{' '}
              <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                (flag_key, environment, user_id, groups)
              </Box>{' '}
              combination, the result is returned immediately — steps 4 and 5 are
              skipped entirely.
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display:      'flex',
            gap:          2,
            p:            2,
            borderRadius: 2,
            bgcolor:      'action.hover',
            border:       '1px solid',
            borderColor:  'success.light',
            mt:           2,
          }}
        >
          <Typography sx={{ fontSize: '1.25rem', lineHeight: 1 }}>🛡️</Typography>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'success.dark', mb: 0.25 }}>
              Fallback Path
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              If the Feature Flag API is unreachable, the SDK returns the last
              cached (stale) value if available, otherwise the caller-supplied
              default. The application never crashes due to a flag evaluation
              failure.
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// IntegrationExamples Page
// ---------------------------------------------------------------------------
function IntegrationExamples() {
  return (
    <Box>

      {/* ================================================================
          Page header
          ================================================================ */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ letterSpacing: '-0.02em', mb: 0.5 }}
        >
          Integration Examples
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          Ready-to-use code snippets for common integration patterns.
        </Typography>
      </Box>

      {/* ================================================================
          Example cards — 2-column grid on desktop
          ================================================================ */}
      <Box
        sx={{
          display:             'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap:                 3,
          mb:                  3,
        }}
      >

        {/* ---- FastAPI basic ---- */}
        <ExampleCard
          icon={<SpeedIcon fontSize="small" />}
          title="FastAPI — Basic"
          badge="Python"
          description={
            'Create a FeatureFlagClient once at module level and call ' +
            'is_enabled() inside your route handlers. The SDK handles ' +
            'caching and fallback automatically.'
          }
          code={`from fastapi import FastAPI
from feature_flag_sdk import FeatureFlagClient

app    = FastAPI()
client = FeatureFlagClient()

@app.get("/dashboard")
async def dashboard():
    if client.is_enabled("new_dashboard"):
        return {"layout": "new"}
    return {"layout": "legacy"}

@app.get("/feature")
async def feature(user_id: str):
    enabled = client.is_enabled(
        "new_dashboard",
        environment="Production",
        user_id=user_id,
    )
    return {"enabled": enabled}`}
        />

        {/* ---- FastAPI Middleware ---- */}
        <ExampleCard
          icon={<LayersIcon fontSize="small" />}
          title="FastAPI Middleware"
          badge="Recommended"
          badgeColor="success"
          description={
            'Register FeatureFlagMiddleware once. The SDK creates a single ' +
            'client, shares its cache across all requests, and injects it ' +
            'as request.state.flag_client — no manual wiring required.'
          }
          code={`from fastapi import FastAPI, Request
from feature_flag_sdk.middleware import FeatureFlagMiddleware

app = FastAPI()
app.add_middleware(FeatureFlagMiddleware)

@app.get("/")
async def home(request: Request):
    if request.state.flag_client.is_enabled(
        "new_dashboard",
        environment="Production",
    ):
        return {"enabled": True}
    return {"enabled": False}

# Use as a FastAPI Dependency for typed access
from fastapi import Depends
from feature_flag_sdk import FeatureFlagClient

def get_flags(request: Request) -> FeatureFlagClient:
    return request.state.flag_client

@app.get("/typed")
async def typed(flags: FeatureFlagClient = Depends(get_flags)):
    return {"dark_mode": flags.is_enabled("dark_mode")}`}
        />

        {/* ---- Django ---- */}
        <ExampleCard
          icon={<StorageIcon fontSize="small" />}
          title="Django — Basic"
          badge="Python"
          description={
            'Use the SDK in any Python project including Django. ' +
            'Instantiate the client at module level in your views.py or ' +
            'apps.py ready() method so the cache is shared across requests.'
          }
          code={`# views.py
from django.http import JsonResponse
from feature_flag_sdk import FeatureFlagClient

# Create once — module-level client is shared across all requests
client = FeatureFlagClient()

def dashboard_view(request):
    user_id = str(request.user.id) if request.user.is_authenticated else None

    enabled = client.is_enabled(
        "new_dashboard",
        environment="Production",
        user_id=user_id,
    )

    return JsonResponse({"enabled": enabled})


# apps.py — alternative: initialise in AppConfig.ready()
from django.apps import AppConfig

class MyAppConfig(AppConfig):
    name = "myapp"

    def ready(self):
        from feature_flag_sdk import FeatureFlagClient
        # Store on the app config so all views can import it
        self.flag_client = FeatureFlagClient()`}
        />

        {/* ---- Fallback / error handling ---- */}
        <ExampleCard
          icon={<SpeedIcon fontSize="small" />}
          title="Fallback & Error Handling"
          badge="Best Practice"
          badgeColor="warning"
          description={
            'Transient errors (timeout, network failure, HTTP 5xx) are ' +
            'caught automatically and return the stale cached value or ' +
            'the caller-supplied default. Only permanent errors ' +
            '(FlagNotFoundError, InvalidRequestError) propagate.'
          }
          code={`from feature_flag_sdk import FeatureFlagClient
from feature_flag_sdk.exceptions import FlagNotFoundError

client = FeatureFlagClient()

# Fallback handled automatically — never raises on transient errors
enabled = client.is_enabled(
    "payment_v2",
    environment="Production",
    user_id="user_42",
    default=False,  # used only when backend is down AND no cached value
)

# Catch permanent errors explicitly when needed
try:
    enabled = client.is_enabled("nonexistent_flag")
except FlagNotFoundError:
    # Flag key doesn't exist — fix the call site
    enabled = False

print(f"Feature enabled: {enabled}")`}
        />

      </Box>

      {/* ================================================================
          SDK Architecture flow diagram — full width
          ================================================================ */}
      <ArchitectureFlow />

    </Box>
  )
}

export default IntegrationExamples
