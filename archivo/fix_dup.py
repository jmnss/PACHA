# Script to fix duplicated content in tab 2.1
with open(r'c:\Users\marko\OneDrive\Desktop\modelo clima\app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and remove the duplicate content between the second and third 'estas relaciones como reglas universales'
# The pattern is: after the first occurrence, there's a duplicate

# Let's just keep content up to the first '*Nota: La respuesta SAR depende' and then add enhanced content
first_note = content.find('*Nota: La respuesta SAR depende de la combinación')
second_note = content.find('*Nota: La respuesta SAR depende de la combinación', first_note + 1)

if first_note >= 0 and second_note > first_note:
    # Keep content up to first note + its line
    # Find the end of the first note line
    first_note_end = content.find('\\n', second_note)
    if first_note_end > 0:
        # Keep content up to and including the first note line
        # Actually, we want to keep up to the line BEFORE the second note starts
        # Let's find where the second note starts and remove everything from there
        # but before the MODO_MODELO line
        
        # Find MODO_MODELO position
        modelo_pos = content.find('MODO_MODELO =')
        
        # Remove content from second_note to modelo_pos
        if modelo_pos > second_note:
            new_content = content[:second_note] + content[modelo_pos:]
            with open(r'c:\Users\marko\OneDrive\Desktop\modelo clima\app.py', 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Fixed - removed duplicate content between second note and MODO_MODELO")
        else:
            print("Could not find MODELO position after second note")
    else:
        print("Could not find newline after second note")
else:
    print("Could not find the note patterns")