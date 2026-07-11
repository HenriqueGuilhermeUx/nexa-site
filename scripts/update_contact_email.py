from pathlib import Path

OLD = 'henriquecampos66@gmail.com'
NEW = 'contato@trynexa.com.br'

changed = []
for path in Path('.').rglob('*.html'):
    text = path.read_text(encoding='utf-8')
    updated = text.replace(OLD, NEW)
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        changed.append(str(path))

print('Arquivos atualizados:')
for item in changed:
    print('-', item)

if not changed:
    print('Nenhuma ocorrência antiga encontrada.')
