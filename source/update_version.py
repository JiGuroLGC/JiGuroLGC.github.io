# -*- coding: utf-8 -*-
"""
批量替换 jsDelivr CDN 版本号
用法: python update_version.py <旧版本> <新版本>
示例: python update_version.py 1.0.1 1.0.2
"""

import os
import sys
import re

REPO = "JiGuroLGC/JiGuroLGC.github.io"
FILE_EXTS = {".html", ".json", ".js", ".css", ".md"}
SKIP_DIRS = {".git", "node_modules", ".codebuddy"}


def find_files(root, exts, skip):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip]
        for f in filenames:
            if os.path.splitext(f)[1].lower() in exts:
                yield os.path.join(dirpath, f)


def replace_in_file(filepath, old_ver, new_ver, pattern):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except (UnicodeDecodeError, PermissionError) as e:
        print(f"  [跳过] {filepath} ({e})")
        return 0

    new_content, count = pattern.subn(
        REPO + "@" + new_ver,
        content,
    )

    if count > 0:
        with open(filepath, "w", encoding="utf-8", newline="") as f:
            f.write(new_content)
        print(f"  [已替换] {filepath}  ({count} 处)")

    return count


def main():
    if len(sys.argv) != 3:
        print(f"用法: python {os.path.basename(__file__)} <旧版本> <新版本>")
        print(f"示例: python {os.path.basename(__file__)} 1.0.1 1.0.2")
        sys.exit(1)

    old_ver = sys.argv[1]
    new_ver = sys.argv[2]

    if old_ver == new_ver:
        print("错误: 新旧版本号相同")
        sys.exit(1)

    root = os.path.dirname(os.path.abspath(__file__))
    old_tag = REPO + "@" + old_ver
    pattern = re.compile(re.escape(old_tag))

    print(f"仓库:   {REPO}")
    print(f"版本:   {old_ver} -> {new_ver}")
    print(f"目录:   {root}")
    print(f"扩展名: {', '.join(sorted(FILE_EXTS))}")
    print()

    total_files = 0
    total_replacements = 0

    for filepath in find_files(root, FILE_EXTS, SKIP_DIRS):
        count = replace_in_file(filepath, old_ver, new_ver, pattern)
        if count > 0:
            total_files += 1
            total_replacements += count

    print()
    if total_replacements > 0:
        print(f"完成: {total_files} 个文件中替换了 {total_replacements} 处")
    else:
        print(f"未找到 \"{old_tag}\" 的匹配项")


if __name__ == "__main__":
    main()
