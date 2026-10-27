# Physical Tailwind classes -> logical ones, keeping the Arabic (RTL) look identical
# and making English (LTR) mirror it. RTL: right = start, left = end.
# usage: python scripts/i18n/rtl_logical.py <file...>
import re, sys

B = r'(?<![\w\-/])'  # token start: not inside another class name
SUBS = [
    (re.compile(B + r'(-?)ml-(?=[\w\[\.])'), r'\1me-'),
    (re.compile(B + r'(-?)mr-(?=[\w\[\.])'), r'\1ms-'),
    (re.compile(B + r'pl-(?=[\w\[\.])'), r'pe-'),
    (re.compile(B + r'pr-(?=[\w\[\.])'), r'ps-'),
    (re.compile(B + r'(-?)left-(?=[\d\[\.]|full|px|auto)'), r'\1end-'),
    (re.compile(B + r'(-?)right-(?=[\d\[\.]|full|px|auto)'), r'\1start-'),
    (re.compile(B + r'text-left(?![\w\-])'), r'text-end'),
    (re.compile(B + r'text-right(?![\w\-])'), r'text-start'),
    (re.compile(B + r'rounded-l(?=[\s"\'`\-]|$)'), r'rounded-e'),
    (re.compile(B + r'rounded-r(?=[\s"\'`\-]|$)'), r'rounded-s'),
    (re.compile(B + r'rounded-tl(?=[\s"\'`\-]|$)'), r'rounded-se'),
    (re.compile(B + r'rounded-tr(?=[\s"\'`\-]|$)'), r'rounded-ss'),
    (re.compile(B + r'rounded-bl(?=[\s"\'`\-]|$)'), r'rounded-ee'),
    (re.compile(B + r'rounded-br(?=[\s"\'`\-]|$)'), r'rounded-es'),
    (re.compile(B + r'border-l(?=[\s"\'`\-]|$)'), r'border-e'),
    (re.compile(B + r'border-r(?=[\s"\'`\-]|$)'), r'border-s'),
]

total = 0
for f in sys.argv[1:]:
    s = open(f, encoding='utf-8').read()
    n = s
    for pat, rep in SUBS:
        n, c = pat.subn(rep, n)
        total += c
    if n != s:
        open(f, 'w', encoding='utf-8').write(n)
        print('updated', f)
print('replacements:', total)
