import { useState } from 'react'
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import TranslateIcon from '@mui/icons-material/TranslateRounded'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Language options — flag emoji + native name + language code
// ---------------------------------------------------------------------------
const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', label: 'English'         },
  { code: 'hi', flag: '🇮🇳', label: 'हिन्दी'           },
  { code: 'fr', flag: '🇫🇷', label: 'Français'         },
  { code: 'es', flag: '🇪🇸', label: 'Español'          },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch'          },
]

// ---------------------------------------------------------------------------
// LanguageSwitcher
// ---------------------------------------------------------------------------
// Renders a globe/translate icon button that opens a MUI Menu dropdown.
// The currently selected language is highlighted.
// Selection is persisted to localStorage via i18next-browser-languagedetector
// (key: fms_language) — same behaviour as the previous implementation.
// ---------------------------------------------------------------------------
export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)

  // Normalise stored code: "en-US" → "en"
  const activeLang = i18n.language?.split('-')[0] ?? 'en'
  const active = LANGUAGES.find(l => l.code === activeLang) ?? LANGUAGES[0]

  function handleOpen(e) { setAnchorEl(e.currentTarget) }
  function handleClose()  { setAnchorEl(null) }

  function handleSelect(code) {
    i18n.changeLanguage(code)
    handleClose()
  }

  return (
    <>
      <Tooltip title="Language / भाषा" arrow>
        <IconButton
          size="small"
          onClick={handleOpen}
          aria-label="Select language"
          aria-controls={open ? 'language-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          sx={{
            width:        36,
            height:       36,
            borderRadius: '10px',
            color:        'text.secondary',
            border:       '1px solid',
            borderColor:  open ? 'primary.main' : 'divider',
            transition:   'all 0.2s ease',
            gap:          0.5,
            '&:hover': {
              bgcolor:     'action.hover',
              color:       'primary.main',
              borderColor: 'primary.main',
            },
          }}
        >
          {/* Show flag of current language instead of generic icon */}
          <Typography
            component="span"
            sx={{ fontSize: '1rem', lineHeight: 1, userSelect: 'none' }}
            aria-hidden="true"
          >
            {active.flag}
          </Typography>
        </IconButton>
      </Tooltip>

      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top',    horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt:         1,
              borderRadius: 2,
              minWidth:   170,
              boxShadow:  '0 8px 24px rgba(0,0,0,0.12)',
              border:     '1px solid',
              borderColor: 'divider',
            },
          },
        }}
        MenuListProps={{ 'aria-label': 'Select language' }}
      >
        {LANGUAGES.map(({ code, flag, label }) => {
          const isSelected = code === activeLang
          return (
            <MenuItem
              key={code}
              selected={isSelected}
              onClick={() => handleSelect(code)}
              sx={{
                borderRadius: 1,
                mx:           0.5,
                my:           0.25,
                gap:          1.25,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color:   '#fff',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              {/* Flag */}
              <Typography
                component="span"
                sx={{ fontSize: '1.125rem', lineHeight: 1, userSelect: 'none' }}
                aria-hidden="true"
              >
                {flag}
              </Typography>

              {/* Native language name */}
              <ListItemText
                primary={label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize:   '0.875rem',
                      fontWeight: isSelected ? 600 : 400,
                    },
                  },
                }}
              />
            </MenuItem>
          )
        })}
      </Menu>
    </>
  )
}
