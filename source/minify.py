# -*- coding: utf-8 -*-
"""
工程文件批量压缩工具
复制工程目录到输出目录，然后压缩所有 HTML / JS / CSS / JSON 文件
依赖: Node.js (npx), terser, clean-css-cli, html-minifier-terser

用法: python minify.py
"""

import os
import sys
import json
import shutil
import subprocess

SKIP_DIRS = {"node_modules", ".codebuddy", "__pycache__", "source"}
SKIP_FILES = set()
SKIP_ROOT_EXTS = {".py"}
SKIP_SUFFIXES = (".min.js", ".min.css")


def ask_path(prompt, must_exist=True):
    path = input(prompt).strip().strip('"').strip("'")
    if not path:
        print("错误: 路径不能为空")
        sys.exit(1)
    path = os.path.abspath(path)
    if must_exist and not os.path.isdir(path):
        print(f"错误: 目录不存在 - {path}")
        sys.exit(1)
    return path


def copy_project(src, dst):
    if os.path.exists(dst):
        ans = input(f"输出目录已存在: {dst}\n是否清空后继续? (y/N): ").strip().lower()
        if ans != "y":
            print("已取消")
            sys.exit(0)
        shutil.rmtree(dst)

    def ignore_filter(directory, contents):
        ignored = set()
        is_root = os.path.abspath(directory) == os.path.abspath(src)
        for item in contents:
            if item in SKIP_DIRS:
                ignored.add(item)
            if is_root:
                if item in SKIP_FILES:
                    ignored.add(item)
                if os.path.splitext(item)[1].lower() in SKIP_ROOT_EXTS:
                    ignored.add(item)
        return ignored

    shutil.copytree(src, dst, ignore=ignore_filter)


def copy_source(src, dst):
    """将完整源码（除 .git）复制到输出目录的 source/ 子目录"""
    source_dir = os.path.join(dst, "source")

    def ignore_git(directory, contents):
        return {item for item in contents if item == ".git"}

    shutil.copytree(src, source_dir, ignore=ignore_git)


def find_files(root, ext):
    result = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            if f.lower().endswith(ext):
                fullpath = os.path.join(dirpath, f)
                # 跳过已压缩的文件
                if any(f.lower().endswith(s) for s in SKIP_SUFFIXES):
                    continue
                result.append(fullpath)
    return result


def run_cmd(cmd):
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def minify_js(filepath):
    tmp = filepath + ".tmp"
    ok = run_cmd(["npx", "--yes", "terser", filepath, "-o", tmp, "-c", "-m"])
    if ok and os.path.exists(tmp):
        os.replace(tmp, filepath)
        return True
    if os.path.exists(tmp):
        os.remove(tmp)
    return False


def minify_css(filepath):
    tmp = filepath + ".tmp"
    ok = run_cmd(["npx", "--yes", "clean-css-cli", "-o", tmp, filepath])
    if ok and os.path.exists(tmp):
        os.replace(tmp, filepath)
        return True
    if os.path.exists(tmp):
        os.remove(tmp)
    return False


def minify_html(filepath):
    tmp = filepath + ".tmp"
    ok = run_cmd([
        "npx", "--yes", "html-minifier-terser",
        filepath,
        "-o", tmp,
        "--collapse-whitespace",
        "--remove-comments",
        "--remove-redundant-attributes",
        "--remove-empty-attributes",
        "--minify-css", "true",
        "--minify-js", "true",
    ])
    if ok and os.path.exists(tmp):
        os.replace(tmp, filepath)
        return True
    if os.path.exists(tmp):
        os.remove(tmp)
    return False


def strip_doc_entries(data):
    """删除 JSON 数组中包含 _doc 键的条目（剔除注释性模板数据）"""
    if isinstance(data, list):
        return [strip_doc_entries(item) for item in data if not (isinstance(item, dict) and "_doc" in item)]
    elif isinstance(data, dict):
        return {k: strip_doc_entries(v) for k, v in data.items()}
    return data


def minify_json(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        data = strip_doc_entries(data)
        with open(filepath, "w", encoding="utf-8", newline="") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        return True
    except (json.JSONDecodeError, UnicodeDecodeError, PermissionError):
        return False


def fmt_size(n):
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    return f"{n / (1024 * 1024):.1f} MB"


def process_files(label, files, dst, minify_fn):
    print(f"  压缩 {label} ({len(files)} 个文件)...")
    saved = 0
    ok_count = 0
    for f in files:
        before = os.path.getsize(f)
        rel = os.path.relpath(f, dst)
        if minify_fn(f):
            after = os.path.getsize(f)
            diff = before - after
            saved += diff
            pct = (diff / before * 100) if before > 0 else 0
            ok_count += 1
            print(f"    [OK]   {rel}  {fmt_size(before)} -> {fmt_size(after)}  (-{pct:.0f}%)")
        else:
            print(f"    [FAIL] {rel}")
    return saved, ok_count


def main():
    print()
    print("=" * 50)
    print("  工程文件批量压缩工具")
    print("  HTML / JS / CSS / JSON")
    print("=" * 50)
    print()

    # 检查 npx
    if shutil.which("npx") is None:
        print("错误: 未找到 npx，请先安装 Node.js")
        sys.exit(1)

    src = ask_path("工程目录: ", must_exist=True)
    dst = ask_path("输出目录: ", must_exist=False)

    if os.path.abspath(src) == os.path.abspath(dst):
        print("错误: 输出目录不能与工程目录相同")
        sys.exit(1)

    # 确认
    print()
    print(f"  工程目录: {src}")
    print(f"  输出目录: {dst}")
    print(f"  跳过目录: {', '.join(sorted(SKIP_DIRS))}")
    print(f"  根目录跳过: *{' *'.join(sorted(SKIP_ROOT_EXTS))} 文件")
    print()
    ans = input("确认开始? (Y/n): ").strip().lower()
    if ans == "n":
        print("已取消")
        sys.exit(0)
    print()

    # 1. 复制部署文件
    print("[1/3] 复制部署文件...")
    copy_project(src, dst)
    print(f"  已复制到: {dst}")
    print()

    # 2. 复制完整源码到 source/
    print("[2/3] 归档完整源码到 source/ ...")
    copy_source(src, dst)
    print(f"  已归档到: {os.path.join(dst, 'source')}")
    print()

    # 3. 压缩
    print("[3/3] 压缩文件...")
    js_files = find_files(dst, ".js")
    css_files = find_files(dst, ".css")
    html_files = find_files(dst, ".html")
    json_files = find_files(dst, ".json")

    total_files = len(js_files) + len(css_files) + len(html_files) + len(json_files)
    print(f"  共发现 {total_files} 个待压缩文件")
    print()

    js_saved, js_ok = process_files("JS", js_files, dst, minify_js)
    print()
    css_saved, css_ok = process_files("CSS", css_files, dst, minify_css)
    print()
    html_saved, html_ok = process_files("HTML", html_files, dst, minify_html)
    print()
    json_saved, json_ok = process_files("JSON", json_files, dst, minify_json)

    total_saved = js_saved + css_saved + html_saved + json_saved
    total_ok = js_ok + css_ok + html_ok + json_ok

    print()
    print("=" * 50)
    print(f"  压缩完成!  {total_ok}/{total_files} 个文件成功")
    print(f"  JS   节省: {fmt_size(js_saved)}")
    print(f"  CSS  节省: {fmt_size(css_saved)}")
    print(f"  HTML 节省: {fmt_size(html_saved)}")
    print(f"  JSON 节省: {fmt_size(json_saved)}")
    print(f"  总计节省: {fmt_size(total_saved)}")
    print(f"  输出目录: {dst}")
    print("=" * 50)
    print()


if __name__ == "__main__":
    main()
