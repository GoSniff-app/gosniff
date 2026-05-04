#!/usr/bin/env python3
"""Add Refresh button next to Leave button in checked-in state"""

filepath = 'src/components/MapView.js'

with open(filepath, 'r') as f:
    content = f.read()

old = """            <button onClick={handleCheckOut} className="btn-secondary text-sm" style={{ padding: '8px 16px' }}>Leave</button>
          </div>
        )}"""

new = """            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleRefreshLocation} disabled={refreshingLocation} className="btn-secondary text-sm" style={{ padding: '8px 16px' }}>
                {refreshingLocation ? 'Finding...' : 'Refresh Location'}
              </button>
              <button onClick={handleCheckOut} className="btn-secondary text-sm" style={{ padding: '8px 16px' }}>Leave</button>
            </div>
          </div>
        )}"""

if old not in content:
    print("ERROR: Could not find Leave button block")
else:
    content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)
    print("SUCCESS!")
