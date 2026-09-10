// SdkDocumentation.jsx
// SDK Documentation page — Milestone 3 Task 1

import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Typography,
} from '@mui/material'
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructionsRounded'
import SettingsIcon                from '@mui/icons-material/SettingsRounded'
import CodeIcon                    from '@mui/icons-material/CodeRounded'
import CachedIcon                  from '@mui/icons-material/CachedRounded'
import ShieldIcon                  from '@mui/icons-material/ShieldRounded'
import LayersIcon                  from '@mui/icons-material/LayersRounded'
import DownloadIcon                from '@mui/icons-material/DownloadRounded'

// ---------------------------------------------------------------------------
// Shared design tokens (match the rest of the dashboard)
// ---------------------------------------------------------------------------
const CARD_SX = {
  border:       '1px solid',
  borderColor:  'divider',
  borderRadius: 4,
  mb:           3,
  overflow:     'hidden',
  bgcolor:      'background.paper',
}

const HEADER_SX = {
  px:           3,
  py:           2,
  borderBottom: '1px solid',
  borderColor:  'divider',
  bgcolor:      'background.paper',
  display:      'flex',
  alignItems:   'center',
  gap:          1.25,
}

// ---------------------------------------------------------------------------
// CodeBlock
// ---------------------------------------------------------------------------
// Renders a styled, monospace code block. No external syntax-highlight
// library needed — the dark background + monospace font is sufficient and
// keeps the bundle lean.
// ---------------------------------------------------------------------------
function CodeBlock({ children, language = 'python' }) {
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
        // Thin scrollbar to match the global scrollbar theme
        '&::-webkit-scrollbar':       { height: 4 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: '#334155', borderRadius: 99 },
      }}
    >
      <Box
        component="code"
        sx={{ fontFamily: 'inherit', fontSize: 'inherit', color: 'inherit' }}
      >
        {children}
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// SectionCard
// ---------------------------------------------------------------------------
// Wrapper that gives each section the same card chrome.
// ---------------------------------------------------------------------------
function SectionCard({ icon, title, subtitle, children }) {
  return (
    <Card elevation={0} sx={CARD_SX}>
      {/* Card header */}
      <Box sx={HEADER_SX}>
        <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Card body */}
      <CardContent sx={{ p: 3 }}>
        {children}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// EnvRow  — one row in the env-var table
// ---------------------------------------------------------------------------
function EnvRow({ name, defaultVal, description, last = false }) {
  return (
    <>
      <Box
        sx={{
          display:             'grid',
          gridTemplateColumns: { xs: '1fr', sm: '200px 120px 1fr' },
          gap:                 { xs: 0.5, sm: 2 },
          py:                  1.75,
          alignItems:          'baseline',
        }}
      >
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize:   '0.8125rem',
            fontWeight: 700,
            color:      'primary.main',
          }}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize:   '0.75rem',
            color:      'text.secondary',
          }}
        >
          {defaultVal}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      {!last && <Divider sx={{ opacity: 0.5 }} />}
    </>
  )
}

// ---------------------------------------------------------------------------
// SdkDocumentation Page
// ---------------------------------------------------------------------------
function SdkDocumentation() {
  return (
    <Box>

      {/* ================================================================
          Page header
          ================================================================ */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ letterSpacing: '-0.02em' }}
          >
            SDK Documentation
          </Typography>
          <Chip
            label="Python"
            size="small"
            color="primary"
            sx={{
              fontWeight: 700,
              fontSize:   '0.7rem',
            }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          Integrate the Feature Flag SDK into your Python applications.
        </Typography>
      </Box>

      {/* ================================================================
          1. Installation
          ================================================================ */}
      <SectionCard
        icon={<DownloadIcon fontSize="small" />}
        title="Installation"
        subtitle="Install the SDK into your Python environment"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Install from PyPI (once published):
        </Typography>
        <CodeBlock>pip install feature-flag-sdk</CodeBlock>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, mb: 2 }}>
          Or install directly from the local source in development:
        </Typography>
        <CodeBlock>pip install -e .</CodeBlock>
      </SectionCard>

      {/* ================================================================
          2. Configuration
          ================================================================ */}
      <SectionCard
        icon={<SettingsIcon fontSize="small" />}
        title="Configuration"
        subtitle="Environment variables read at SDK import time"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          The SDK reads configuration from environment variables. Create a{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 1 }}>
            .env
          </Box>{' '}
          file in your project root (never commit it):
        </Typography>

        <CodeBlock language="env">{`FLAG_API_URL=http://127.0.0.1:8000
API_KEY=my-secret-api-key
CACHE_TTL=300`}</CodeBlock>

        {/* Variable reference table */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Variable Reference
          </Typography>
          {/* Column headings */}
          <Box
            sx={{
              display:             'grid',
              gridTemplateColumns: { xs: '1fr', sm: '200px 120px 1fr' },
              gap:                 2,
              pb:                  1,
            }}
          >
            {['Variable', 'Default', 'Description'].map(h => (
              <Typography
                key={h}
                sx={{
                  fontSize:      '0.6875rem',
                  fontWeight:    700,
                  color:         'text.disabled',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display:       { xs: 'none', sm: 'block' },
                }}
              >
                {h}
              </Typography>
            ))}
          </Box>
          <Divider sx={{ mb: 0.5 }} />

          <EnvRow
            name="FLAG_API_URL"
            defaultVal="http://127.0.0.1:8000"
            description="Base URL of the Feature Management System API. Change this to your deployed server URL in staging or production."
          />
          <EnvRow
            name="API_KEY"
            defaultVal="(empty)"
            description="Optional API key sent as the X-API-Key header on every request. Leave blank if your backend does not require authentication."
          />
          <EnvRow
            name="CACHE_TTL"
            defaultVal="300"
            description="How many seconds to cache a flag evaluation result locally before re-fetching from the backend. Set to 0 to disable caching."
            last
          />
        </Box>
      </SectionCard>

      {/* ================================================================
          3. Creating the Client
          ================================================================ */}
      <SectionCard
        icon={<CodeIcon fontSize="small" />}
        title="Creating the Client"
        subtitle="Instantiate FeatureFlagClient once and reuse it"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Import and create a client. When called with no arguments, the
          client reads all configuration from environment variables automatically.
        </Typography>

        <CodeBlock>{`from feature_flag_sdk import FeatureFlagClient

client = FeatureFlagClient()`}</CodeBlock>

        <Alert
          severity="info"
          sx={{ mt: 2.5, borderRadius: 2 }}
        >
          Create one client per application and reuse it. Each client
          maintains its own connection pool and in-process cache — creating
          a new client on every request discards cached results and wastes
          resources.
        </Alert>
      </SectionCard>

      {/* ================================================================
          4. Evaluating a Feature Flag
          ================================================================ */}
      <SectionCard
        icon={<IntegrationInstructionsIcon fontSize="small" />}
        title="Evaluating a Feature Flag"
        subtitle="Check whether a flag is enabled for a user"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Call{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 1 }}>
            is_enabled()
          </Box>{' '}
          with the flag key, environment, and optional user context. The
          SDK automatically communicates with the Feature Management
          System, applies targeting rules, and returns a boolean.
        </Typography>

        <CodeBlock>{`enabled = client.is_enabled(
    "new_dashboard",
    environment="Production",
    user_id="user_101",
)

if enabled:
    show_new_dashboard()
else:
    show_legacy_dashboard()`}</CodeBlock>

        <Box sx={{ mt: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Parameters
          </Typography>
          <Divider sx={{ mb: 0.5 }} />

          {[
            { name: 'flag_key',      req: true,  desc: 'Unique key of the flag (e.g. "new_dashboard"). Lowercase letters, numbers and underscores only.' },
            { name: 'environment',   req: false, desc: 'Name of the environment to evaluate in. Defaults to "Production".' },
            { name: 'user_id',       req: false, desc: 'Requesting user identifier. Used for user-level targeting and percentage rollout bucketing.' },
            { name: 'groups',        req: false, desc: 'List of group names the user belongs to. Used for group-level targeting rules.' },
            { name: 'user_context',  req: false, desc: 'Freeform dict of extra context forwarded to the backend. Legacy field kept for backward compatibility.' },
            { name: 'default',       req: false, desc: 'Value to return when the backend is unavailable and no cached value exists. Defaults to False.' },
          ].map((p, i, arr) => (
            <Box key={p.name}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, py: 1.5 }}>
                <Box
                  component="code"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize:   '0.8125rem',
                    fontWeight: 700,
                    color:      'primary.main',
                    flexShrink: 0,
                    minWidth:   130,
                  }}
                >
                  {p.name}
                </Box>
                <Chip
                  label={p.req ? 'required' : 'optional'}
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    bgcolor: p.req ? 'error.light' : 'action.selected',
                    color:   p.req ? 'error.dark'  : 'text.secondary',
                    height:  20,
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {p.desc}
                </Typography>
              </Box>
              {i < arr.length - 1 && <Divider sx={{ opacity: 0.5 }} />}
            </Box>
          ))}
        </Box>
      </SectionCard>

      {/* ================================================================
          5. Local Cache
          ================================================================ */}
      <SectionCard
        icon={<CachedIcon fontSize="small" />}
        title="Local Cache"
        subtitle="In-process TTL cache reduces backend API calls"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The SDK stores every evaluation result in an in-process dictionary
          keyed by{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 1 }}>
            (flag_key, environment, user_id, groups)
          </Box>
          . Repeated calls with the same arguments are served from the cache
          without making an HTTP request until the TTL expires.
        </Typography>

        <Box
          sx={{
            display:             'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap:                 2,
            mb:                  2.5,
          }}
        >
          {[
            { label: 'Default TTL',    value: '300 s',  note: 'Configurable via CACHE_TTL' },
            { label: 'Cache scope',    value: 'In-process', note: 'Per client instance' },
            { label: 'Thread-safe',    value: 'Yes',    note: 'threading.Lock protected' },
          ].map(item => (
            <Box
              key={item.label}
              sx={{
                p:            2,
                borderRadius: 2,
                bgcolor:      'background.default',
                border:       '1px solid',
                borderColor:  'divider',
                textAlign:    'center',
              }}
            >
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: 'primary.main' }}>
                {item.value}
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                {item.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.note}
              </Typography>
            </Box>
          ))}
        </Box>

        <Alert severity="success" sx={{ borderRadius: 2 }}>
          <strong>Performance tip:</strong> With the default 300-second TTL, a
          single cached evaluation serves all requests for 5 minutes. For
          high-traffic services this can reduce load on the Feature Management
          System API by orders of magnitude.
        </Alert>
      </SectionCard>

      {/* ================================================================
          6. Fallback Behaviour
          ================================================================ */}
      <SectionCard
        icon={<ShieldIcon fontSize="small" />}
        title="Fallback Behaviour"
        subtitle="Keeps your application running when the API is unavailable"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          When the Feature Flag API is unreachable or returns an error, the
          SDK applies a two-stage fallback instead of raising an exception,
          so your application never crashes due to a flag evaluation failure.
        </Typography>

        {[
          {
            step:    '1',
            title:   'Return stale cache value',
            body:    'If the flag was evaluated at least once before (even if the TTL has since expired), the last known value is returned. A slightly outdated flag state is almost always safer than crashing.',
            bgcolor: 'primary.50',
            borderColor: 'primary.light',
            titleColor:  'primary.dark',
            bodyColor:   'text.secondary',
            circleColor: 'primary.main',
          },
          {
            step:    '2',
            title:   'Return the caller-supplied default',
            body:    'If no historical value exists (the flag has never been evaluated on this client instance), the default parameter is returned. The SDK default is False — a safe "feature off" state.',
            bgcolor: 'success.50',
            borderColor: 'success.light',
            titleColor:  'success.dark',
            bodyColor:   'text.secondary',
            circleColor: 'success.main',
          },
        ].map(item => (
          <Box
            key={item.step}
            sx={{
              display:      'flex',
              gap:          2,
              mb:           2,
              p:            2,
              borderRadius: 2,
              bgcolor:      'action.hover',
              border:       '1px solid',
              borderColor:  'divider',
            }}
          >
            <Box
              sx={{
                width:          32,
                height:         32,
                borderRadius:   '50%',
                bgcolor:        item.circleColor,
                color:          '#fff',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontWeight:     800,
                fontSize:       '0.875rem',
                flexShrink:     0,
                opacity:        0.85,
              }}
            >
              {item.step}
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: item.titleColor, mb: 0.5 }}>
                {item.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                {item.body}
              </Typography>
            </Box>
          </Box>
        ))}

        <CodeBlock>{`# Pass a custom default for flags that should be ON by default
enabled = client.is_enabled(
    "maintenance_mode",
    default=False,   # if API is down, assume not in maintenance
)

# FlagNotFoundError and InvalidRequestError are NOT caught by
# fallback — they indicate a bug in the caller's arguments.`}</CodeBlock>
      </SectionCard>

      {/* ================================================================
          7. Middleware Integration
          ================================================================ */}
      <SectionCard
        icon={<LayersIcon fontSize="small" />}
        title="Middleware Integration"
        subtitle="Inject the SDK into every FastAPI / Starlette request automatically"
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 1 }}>
            FeatureFlagMiddleware
          </Box>{' '}
          to your FastAPI application once at start-up. The middleware creates
          a single{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 1 }}>
            FeatureFlagClient
          </Box>{' '}
          and attaches it to every incoming request as{' '}
          <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', bgcolor: 'action.hover', px: 0.75, py: 0.25, borderRadius: 1 }}>
            request.state.flag_client
          </Box>
          , making it available inside all route handlers and dependencies
          without any manual wiring.
        </Typography>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
          Register the middleware
        </Typography>
        <CodeBlock>{`from fastapi import FastAPI
from feature_flag_sdk.middleware import FeatureFlagMiddleware

app = FastAPI()
app.add_middleware(FeatureFlagMiddleware)`}</CodeBlock>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2.5, mb: 1.25 }}>
          Use in a route handler
        </Typography>
        <CodeBlock>{`from fastapi import Request

@app.get("/dashboard")
async def dashboard(request: Request):
    if request.state.flag_client.is_enabled("new_dashboard"):
        return {"layout": "new"}
    return {"layout": "legacy"}`}</CodeBlock>

        <Alert severity="info" sx={{ mt: 2.5, borderRadius: 2 }}>
          The client is created once when the middleware is instantiated —
          not on every request. This means the in-process cache is shared
          across all requests, giving the full benefit of result reuse.
        </Alert>
      </SectionCard>

    </Box>
  )
}

export default SdkDocumentation
