#!/usr/bin/env python3
"""Add text label to refresh button and shrink We are Here"""

filepath = 'src/components/MapView.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Shrink the We are Here button
content = content.replace(
    '''<button className="btn-primary text-lg" onClick={handleOpenCheckIn}
              style={{ flex: 1, padding: '18px', fontSize: '1.1rem', borderRadius: '18px' }}>
              We are Here!
            </button>''',
    '''<button className="btn-primary" onClick={handleOpenCheckIn}
              style={{ flex: 1, padding: '14px', fontSize: '0.95rem', borderRadius: '18px' }}>
              We are Here!
            </button>'''
)

# 2. Replace the icon-only refresh button with icon + text
content = content.replace(
    '''<button
              onClick={handleRefreshLocation}
              disabled={refreshingLocation}
              title="Refresh My Location"
              style={{
                padding: '14px',
                borderRadius: '18px',
                background: refreshingLocation ? 'var(--gs-teal-light)' : '#ffffff',
                border: '1.5px solid var(--gs-gray-200)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: refreshingLocation ? 'wait' : 'pointer',
                flexShrink: 0,
              }}
            >
              <svg
                width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ animation: refreshingLocation ? 'pulse-logo 1s ease-in-out infinite' : 'none' }}
              >
                <circle cx="12" cy="12" r="3" stroke="var(--gs-teal)" strokeWidth="2" />
                <circle cx="12" cy="12" r="8" stroke="var(--gs-teal)" strokeWidth="1.5" fill="none" />
                <line x1="12" y1="0" x2="12" y2="4" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="20" x2="12" y2="24" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="0" y1="12" x2="4" y2="12" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="20" y1="12" x2="24" y2="12" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>''',
    '''<button
              onClick={handleRefreshLocation}
              disabled={refreshingLocation}
              style={{
                padding: '10px 14px',
                borderRadius: '18px',
                background: refreshingLocation ? 'var(--gs-teal-light)' : '#ffffff',
                border: '1.5px solid var(--gs-gray-200)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: refreshingLocation ? 'wait' : 'pointer',
                flexShrink: 0,
              }}
            >
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ animation: refreshingLocation ? 'pulse-logo 1s ease-in-out infinite' : 'none', flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="3" stroke="var(--gs-teal)" strokeWidth="2" />
                <circle cx="12" cy="12" r="8" stroke="var(--gs-teal)" strokeWidth="1.5" fill="none" />
                <line x1="12" y1="0" x2="12" y2="4" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="20" x2="12" y2="24" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="0" y1="12" x2="4" y2="12" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="20" y1="12" x2="24" y2="12" stroke="var(--gs-teal)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gs-teal)', whiteSpace: 'nowrap' }}>
                {refreshingLocation ? 'Finding...' : 'Refresh Location'}
              </span>
            </button>'''
)

with open(filepath, 'w') as f:
    f.write(content)

print("SUCCESS! Updated button labels")
