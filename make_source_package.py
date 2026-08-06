import os
import shutil
import zipfile

src_dir = "/Users/chenhaoran/工程文件/心理大赛"
target_dir = "/Users/chenhaoran/工程文件/心理大赛_源码包"
zip_path = "/Users/chenhaoran/工程文件/心理大赛_源码包.zip"

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".cache",
    "models",
    "心理大赛_源码包"
}

EXCLUDE_EXTS = {".mp4", ".png", ".jpg", ".jpeg"}

print("Starting scan and copy...")

# Clean existing target directory if it exists
if os.path.exists(target_dir):
    shutil.rmtree(target_dir)

os.makedirs(target_dir, exist_ok=True)

copied_files = 0
copied_dirs = 0

for root, dirs, files in os.walk(src_dir):
    # Filter out excluded directories in-place so os.walk does not recurse into them
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".git")]

    rel_path = os.path.relpath(root, src_dir)
    if rel_path == ".":
        dest_root = target_dir
    else:
        dest_root = os.path.join(target_dir, rel_path)
    
    os.makedirs(dest_root, exist_ok=True)
    copied_dirs += 1

    for file in files:
        if file == ".DS_Store":
            continue
        ext = os.path.splitext(file)[1].lower()
        if ext in EXCLUDE_EXTS:
            continue
        
        src_file_path = os.path.join(root, file)
        dest_file_path = os.path.join(dest_root, file)
        
        shutil.copy2(src_file_path, dest_file_path)
        copied_files += 1

print(f"Copy finished. Total dirs: {copied_dirs}, Total files: {copied_files}")

# Create zip package
print("Creating zip archive...")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, os.path.dirname(target_dir))
            zipf.write(file_path, arcname)

print(f"Zip created at: {zip_path}, size: {os.path.getsize(zip_path)} bytes")
