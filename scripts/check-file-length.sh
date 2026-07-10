#!/usr/bin/env bash
#
# Fail when a source file grows past its ceiling.
#
# A 900-line component is not a style problem, it is a design problem: several
# things live in one file and nobody has been forced to name the seam. The
# ceiling forces the question.
#
# Ceilings only ever move down. Never raise one to make a red build green —
# split the file. A per-file override IS that file's ceiling, and each carries a
# reason. An override without one is a hole, not an exemption.
#
# Generated and vendored code is excluded: nobody reads it, nobody splits it.

set -euo pipefail

TSX_MAX=500 # components: JSX is verbose, and a page assembles a lot
TS_MAX=400  # logic: hooks, services, actions

# path -> ceiling. Add an entry only with a comment saying why it earns one.
declare -A OVERRIDES=()

EXCLUDE_RE='src/shared/ui/|\.d\.ts$|\.test\.(ts|tsx)$|\.spec\.(ts|tsx)$'

fail=0
while IFS= read -r file; do
	[[ "$file" =~ $EXCLUDE_RE ]] && continue

	lines=$(wc -l <"$file")
	if [[ "$file" == *.tsx ]]; then
		default=$TSX_MAX
	else
		default=$TS_MAX
	fi
	ceiling="${OVERRIDES[$file]:-$default}"

	if ((lines > ceiling)); then
		printf '  %-64s %5d lines  (ceiling %d)\n' "$file" "$lines" "$ceiling"
		fail=1
	fi
done < <(find src -name '*.ts' -o -name '*.tsx' | sort)

if ((fail)); then
	echo
	echo "File(s) over the ceiling. Split them — do not raise the limit."
	exit 1
fi

echo "OK: no file exceeds its length ceiling (tsx ${TSX_MAX}, ts ${TS_MAX})"
