#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "$script_dir/.." && pwd)"
destination="${1:-"$project_dir/index.html"}"

if [[ "$destination" == *:* ]]; then
  destination="$(cygpath -u "$destination")"
fi
if [[ "$destination" != /* ]]; then
  destination="$project_dir/$destination"
fi

cp -- "$script_dir/original.html" "$destination"
printf 'restored=%s\n' "$destination"
printf 'sha256=%s\n' "$(sha256sum "$destination" | awk '{print $1}')"