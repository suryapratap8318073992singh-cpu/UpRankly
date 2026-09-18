import re
import os

files_to_process = []
for root, dirs, files in os.walk('.'):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    if '.next' in dirs:
        dirs.remove('.next')
    if '.git' in dirs:
        dirs.remove('.git')
    for file in files:
        if file.endswith(('.ts', '.tsx', '.js', '.json', '.md', '.html')):
            files_to_process.append(os.path.join(root, file))

def rebrand(content):
    # Rule 1: Replace UpRank (not followed by ly) with UpRankly
    content = re.sub(r'UpRank(?!ly)', 'UpRankly', content)
    # Rule 2: Replace uprank (not followed by ly) with uprankly
    content = re.sub(r'uprank(?!ly)', 'uprankly', content)
    # Rule 3: Replace UPRANK (not followed by LY) with UPRANKLY
    content = re.sub(r'UPRANK(?!LY)', 'UPRANKLY', content)

    # Clean up potential double additions
    content = content.replace("UpRanklyly", "UpRankly")
    content = content.replace("upranklyly", "uprankly")
    content = content.replace("UPRANKLYLY", "UPRANKLY")

    return content

count = 0
for file_path in files_to_process:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = rebrand(content)

        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Rebranded: {file_path}")
            count += 1
    except Exception as e:
        print(f"Error reading/writing {file_path}: {e}")

print(f"Rebrand complete. Modified {count} files.")
