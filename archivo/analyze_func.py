import sys

with open(r'c:\Users\marko\OneDrive\Desktop\modelo clima\app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the renderizar_fundamentos_cientificos function
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if 'def renderizar_fundamentos_cientificos()' in line:
        start_idx = i
        break

if start_idx is None:
    print("Function not found")
    sys.exit(1)

# Find the end of the function (next def or class)
for i in range(start_idx + 1, len(lines)):
    if lines[i].startswith('def ') or lines[i].startswith('class '):
        end_idx = i
        break

if end_idx is None:
    end_idx = len(lines)

print(f"Function found from line {start_idx+1} to {end_idx}")
print("Current function length:", end_idx - start_idx)

# Let's just print the function to understand it better
func_lines = lines[start_idx:end_idx]
for i, line in enumerate(func_lines[:50], start=start_idx+1):
    print(f"{i}: {line}", end='')
print("...")
for i, line in enumerate(func_lines[-20:], start=start_idx+1 len(func_lines) - 19):
    print(f"{i}: {line}", end='')