#!/usr/bin/env python3

import json
import os
import subprocess
import sys
import tempfile

USAGE = """Usage:
    pack.py code <pack.json>    run the runnable code blocks, print the codeRuns array
    pack.py quiz <pack.json>    print every quiz without its answer or explanation
"""

INTERPRETERS = {"python": [sys.executable], "javascript": ["node"]}

SUFFIXES = {"python": ".py", "javascript": ".js"}

TIMEOUT_SECONDS = 30


def read_pack(path):
    with open(path, encoding="utf-8") as pack_file:
        return json.load(pack_file)


def list_blocks(pack, matches):
    found = []
    for section in pack.get("sections", []):
        for block in section.get("blocks", []):
            if matches(block):
                found.append((section.get("id", "?"), block))
    return found


def run_block(language, code):
    command = INTERPRETERS.get(language)
    if command is None:
        return {"stdout": "", "error": f"no interpreter configured for {language}"}
    with tempfile.TemporaryDirectory() as work_directory:
        path = os.path.join(work_directory, f"block{SUFFIXES.get(language, '')}")
        with open(path, "w", encoding="utf-8") as block_file:
            block_file.write(code)
        try:
            finished = subprocess.run(
                [*command, path],
                capture_output=True,
                text=True,
                cwd=work_directory,
                timeout=TIMEOUT_SECONDS,
            )
        except FileNotFoundError:
            return {"stdout": "", "error": f"{command[0]} is not installed"}
        except subprocess.TimeoutExpired:
            return {"stdout": "", "error": f"timed out after {TIMEOUT_SECONDS}s"}
    if finished.returncode == 0:
        return {"stdout": finished.stdout}
    error_lines = [line for line in finished.stderr.strip().splitlines() if line.strip()]
    tail = error_lines[-1] if error_lines else f"exited with code {finished.returncode}"
    return {"stdout": finished.stdout, "error": tail}


def describe_run(block, result):
    if result.get("error"):
        return f"ERROR {result['error']}"
    expected = block.get("expectedOutput")
    if expected is None:
        return "the pack gives no expectedOutput for this block"
    if result.get("stdout", "").strip() == expected.strip():
        return "matches expectedOutput"
    return f"DIFFERS from expectedOutput {json.dumps(expected)}"


def is_runnable(block):
    return block.get("type") == "code" and bool(block.get("runnable"))


def report_code(pack):
    runs = []
    for position, (section, block) in enumerate(list_blocks(pack, is_runnable), start=1):
        result = run_block(block["runnable"], block.get("code", ""))
        runs.append({"block": position, **result})
        print(f"block {position} in section {section}: {describe_run(block, result)}", file=sys.stderr)
    print(json.dumps({"codeRuns": runs}, indent=2))


def report_quiz(pack):
    quizzes = list_blocks(pack, lambda block: block.get("type") == "check")
    if not quizzes:
        print("this pack has no check block, so it cannot pass the quiz checks", file=sys.stderr)
    for position, (section, block) in enumerate(quizzes, start=1):
        print(f"quiz {position} in section {section}, concept {block.get('conceptId', 'none')}")
        print(f"  {block.get('q', '')}")
        for index, option in enumerate(block.get("options", [])):
            print(f"  [{index}] {option}")
        print()
    print("answer each one as the reader would, then submit the index you picked", file=sys.stderr)


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in {"code", "quiz"}:
        print(USAGE, file=sys.stderr)
        return 2
    pack = read_pack(sys.argv[2])
    if sys.argv[1] == "code":
        report_code(pack)
    else:
        report_quiz(pack)
    return 0


if __name__ == "__main__":
    sys.exit(main())
