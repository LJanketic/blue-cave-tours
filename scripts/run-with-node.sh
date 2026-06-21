#!/usr/bin/env bash
# Ensures Astro runs with Node >=22.12 even when the IDE uses an older system Node.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REQUIRED_MAJOR=22
REQUIRED_MINOR=12

node_ok() {
	local ver="$1"
	local major minor
	major="${ver%%.*}"
	minor="${ver#*.}"
	minor="${minor%%.*}"
	[[ "$major" -gt "$REQUIRED_MAJOR" ]] || {
		[[ "$major" -eq "$REQUIRED_MAJOR" && "$minor" -ge "$REQUIRED_MINOR" ]]
	}
}

try_node() {
	local bin="$1"
	if [[ -x "$bin" ]]; then
		local ver
		ver="$("$bin" -p "process.versions.node")"
		if node_ok "$ver"; then
			export PATH="$(dirname "$bin"):$PATH"
			return 0
		fi
	fi
	return 1
}

# 1) nvm + .nvmrc
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
	# shellcheck source=/dev/null
	. "$NVM_DIR/nvm.sh"
	if [[ -f "$ROOT/.nvmrc" ]]; then
		nvm use --silent 2>/dev/null || nvm use "$(tr -d '[:space:]' < "$ROOT/.nvmrc")" --silent 2>/dev/null || true
	fi
fi

# 2) Explicit version from .nvmrc under ~/.nvm/versions/node/
if [[ -f "$ROOT/.nvmrc" ]]; then
	NVM_VERSION="$(tr -d '[:space:]' < "$ROOT/.nvmrc")"
	try_node "$HOME/.nvm/versions/node/v${NVM_VERSION}/bin/node" || true
	try_node "$HOME/.nvm/versions/node/${NVM_VERSION}/bin/node" || true
fi

# 3) Newest installed nvm Node that satisfies Astro
if [[ -d "$HOME/.nvm/versions/node" ]]; then
	BEST_NODE=""
	BEST_SORT=""
	while IFS= read -r dir; do
		[[ -e "$dir" ]] || continue
		ver="$("$dir" -p "process.versions.node")"
		if node_ok "$ver"; then
			# sort -V friendly key: zero-padded semver
			sort_key="$(printf '%03d%03d%03d' "${ver%%.*}" "$(echo "$ver" | cut -d. -f2)" "$(echo "$ver" | cut -d. -f3)")"
			if [[ -z "$BEST_SORT" || "$sort_key" > "$BEST_SORT" ]]; then
				BEST_SORT="$sort_key"
				BEST_NODE="$dir"
			fi
		fi
	done < <(find "$HOME/.nvm/versions/node" -path '*/bin/node' 2>/dev/null)
	if [[ -n "$BEST_NODE" ]]; then
		export PATH="$(dirname "$BEST_NODE"):$PATH"
	fi
fi

CURRENT="$(node -p "process.versions.node" 2>/dev/null || echo "unknown")"
if ! node_ok "$CURRENT"; then
	echo ""
	echo "Node.js v${CURRENT} is not supported (Astro requires >=22.12.0)."
	echo ""
	echo "Fix in terminal:"
	echo "  cd $ROOT"
	echo "  nvm install"
	echo "  nvm use"
	echo "  pnpm dev"
	echo ""
	exit 1
fi

exec "$@"
