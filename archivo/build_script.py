import sys
with open(r'c:\Users\marko\OneDrive\Desktop\modelo clima\app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Simple replacement for tab 2.1 - add note about passive/active
old_text = '### 2.1. Fondo: fundamentos de la teledetección terrestre'
new_text = '### 2.1. Fondo: fundamentos de la teledetección terrestre\n        st.markdown("\\u2022 Teledetección pasiva: registra energía de fuentes naturales (radiación solar reflejada). Las respuestas espectrales permiten estudiar vegetación, agua, suelos.")'

if old_text in content:
    content = content.replace(old_text, new_text)
    with open(r'c:\Users\marko\OneDrive\Desktop\modelo clima\app.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Part 1 done - Tab 2.1 enhanced")
else:
    print("Part 1 not found - trying alternative")
    sys.exit(1)