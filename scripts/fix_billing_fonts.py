import re

file_path = r"c:\Users\mtnoo\OneDrive\Desktop\EasyHMS\easyHMSWeb\src\features\billing\pages\BillingDashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove font-mono
content = content.replace("font-mono ", "")
content = content.replace(" font-mono", "")

# 2. Adjust tracking-widest to standard tracking
content = content.replace("tracking-widest uppercase", "tracking-wider uppercase")

# 3. Fix specific elements that are too small
# Title
content = content.replace(
    'text-xl sm:text-2xl font-bold text-slate-900 leading-tight flex items-center gap-2 tracking-tight uppercase drop-shadow-sm',
    'text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 drop-shadow-sm'
)

# Subtitle
content = content.replace(
    'text-xs text-slate-500 tracking-wider uppercase',
    'text-sm font-medium text-slate-500 tracking-wide'
)

# New Bill button
content = content.replace(
    'text-[10px] uppercase tracking-wider font-bold',
    'text-sm font-semibold tracking-wide'
)

# Nav Tabs text
content = content.replace(
    'text-[10px] font-bold',
    'text-xs font-semibold'
)

# KPI Timetable filters
content = content.replace(
    'text-[10px] font-bold tracking-wider uppercase',
    'text-xs font-semibold tracking-wide uppercase'
)

# KPI Card Headers
content = content.replace(
    'text-[10px] tracking-wider uppercase font-bold',
    'text-xs font-semibold tracking-wide uppercase'
)

# KPI Card footers
content = content.replace(
    'text-[9px] text-',
    'text-xs font-medium text-'
)
# specific match for footers that have tracking-wider uppercase
content = content.replace(
    'text-[9px] tracking-wider uppercase',
    'text-xs font-medium tracking-wide uppercase'
)
# if they lost the tracking-widest (from earlier replace)
content = content.replace(
    'tracking-wider uppercase mt-2',
    'tracking-wide uppercase mt-2'
)

# Table filters
content = content.replace(
    'text-xs tracking-wider uppercase transition-all',
    'text-sm font-semibold tracking-wide transition-all'
)

# Search Input
content = content.replace(
    'tracking-wide text-xs focus-visible',
    'text-sm font-medium focus-visible'
)

# Table Heads
content = content.replace(
    'text-[10px] font-bold text-slate-500 uppercase tracking-wider',
    'text-xs font-semibold text-slate-500 tracking-wider uppercase'
)

# Table Cells
content = content.replace(
    'text-[10px] font-bold text-indigo-600 tracking-wider uppercase',
    'text-xs font-semibold text-indigo-600 tracking-wide uppercase'
)
content = content.replace(
    'text-[10px] tracking-wider text-slate-500',
    'text-xs tracking-wide text-slate-500'
)

# Badges inside table
content = content.replace(
    'text-[9px] px-2 py-0.5 border tracking-wider uppercase',
    'text-xs px-2 py-0.5 border font-semibold tracking-wide uppercase'
)

# Set unsettled text
content = content.replace(
    'text-[10px] text-slate-400 tracking-wider uppercase',
    'text-xs font-semibold text-slate-400 tracking-wide uppercase'
)

# Action buttons
content = content.replace(
    'text-[9px] border-cyan-200',
    'text-xs font-semibold border-cyan-200'
)
content = content.replace(
    'tracking-wider uppercase shadow-sm',
    'tracking-wide uppercase shadow-sm'
)
content = content.replace(
    'text-[9px] tracking-wider text-slate-400 uppercase',
    'text-xs font-semibold tracking-wide text-slate-400 uppercase'
)
content = content.replace(
    'text-[10px] text-slate-700',
    'text-xs font-medium text-slate-700'
)


# Pagination
content = content.replace(
    'text-[10px] text-slate-500 tracking-wider uppercase',
    'text-xs font-semibold text-slate-500 tracking-wide uppercase'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done resetting fonts in BillingDashboard.tsx")
