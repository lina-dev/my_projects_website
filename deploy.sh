#!/usr/bin/env bash
# Deploy the static site to an AWS S3 static-website bucket.
#
# Usage: ./deploy.sh <bucket-name> [--check]
#        S3_BUCKET=<bucket-name> ./deploy.sh [--check]
#
#   --check   Validate inputs and print the planned command WITHOUT deploying.
#
# Exit codes: 2 usage, 3 invalid bucket name, 4 missing index.html, 5 no aws CLI.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "Usage: ./deploy.sh <bucket-name> [--check]" >&2
  echo "       S3_BUCKET=<bucket-name> ./deploy.sh [--check]" >&2
  echo "  --check  validate and print the planned command without deploying" >&2
}

CHECK=0
BUCKET="${S3_BUCKET:-}"
for arg in "$@"; do
  case "$arg" in
    --check) CHECK=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Error: unknown option: $arg" >&2; usage; exit 2 ;;
    *) BUCKET="$arg" ;;
  esac
done

if [ -z "$BUCKET" ]; then
  echo "Error: no bucket name provided." >&2
  usage
  exit 2
fi

# Validate against S3 bucket naming rules.
valid_bucket() {
  local b="$1"
  [ "${#b}" -ge 3 ] && [ "${#b}" -le 63 ] || return 1
  [[ "$b" =~ ^[a-z0-9][a-z0-9.-]*[a-z0-9]$ ]] || return 1
  [[ "$b" == *..* ]] && return 1
  [[ "$b" =~ ^([0-9]+\.){3}[0-9]+$ ]] && return 1
  return 0
}
if ! valid_bucket "$BUCKET"; then
  echo "Error: invalid S3 bucket name: '$BUCKET'" >&2
  echo "Bucket names must be 3-63 chars, lowercase letters/numbers/dots/hyphens," >&2
  echo "start and end alphanumeric, no consecutive dots, and not an IP address." >&2
  exit 3
fi

if [ ! -f "$SCRIPT_DIR/index.html" ]; then
  echo "Error: index.html not found in $SCRIPT_DIR" >&2
  exit 4
fi

SYNC_ARGS=(s3 sync "$SCRIPT_DIR/" "s3://$BUCKET/"
  --exclude ".git/*"
  --exclude ".github/*"
  --exclude "node_modules/*"
  --exclude "docs/*"
  --exclude "test/*"
  --exclude ".remember/*"
  --exclude "*.sh"
  --exclude "package.json"
  --exclude "package-lock.json"
  --exclude ".gitignore"
  --exclude "*.md"
  --delete)

if [ "$CHECK" -eq 1 ]; then
  echo "aws ${SYNC_ARGS[*]}"
  echo "(--check: not executing)"
  exit 0
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI not found on PATH. Install and configure it first." >&2
  exit 5
fi

echo "Deploying to s3://$BUCKET ..."
aws "${SYNC_ARGS[@]}"
echo "Done. If static website hosting is enabled, your site is live at the bucket website endpoint."
