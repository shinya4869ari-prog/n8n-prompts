import re
import json

path = 'prompts/blog/国名変換Code.md'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match something like "アフガニスタン": { en: "Afghanistan", code: "AF", code3: "AFG", capital: "カブール" }
pattern = r'\"(.*?)\":\s*\{(.*?)\}'
matches = re.findall(pattern, content, re.DOTALL)

countries = []
for m in matches:
    name = m[0]
    props_str = m[1]
    # Simple parser for the properties
    props = {}
    for prop_match in re.findall(r'(\w+):\s*("(.*?)"|true|false)', props_str):
        key = prop_match[0]
        val = prop_match[2] if prop_match[1].startswith('"') else (prop_match[1] == 'true')
        props[key] = val
    countries.append({"name": name, "props": props})

with open('scratch/countries.json', 'w', encoding='utf-8') as f:
    json.dump(countries, f, ensure_ascii=False, indent=2)

