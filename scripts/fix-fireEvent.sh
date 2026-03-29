#!/bin/bash
# Batch fix remaining fireEvent files by replacing with userEvent
# This script applies standardized replacements across all remaining test files

files=(
  "tests/components/mobile-filter-dialog.test.tsx"
  "tests/components/send-message-form.test.tsx"
  "tests/components/session-timeout-warning.test.tsx"
  "tests/components/video-card.test.tsx"
  "tests/components/video-library.test.tsx"
  "tests/components/video-modal.test.tsx"
  "tests/components/video-player.test.tsx"
)

echo "Batch replacing fireEvent with userEvent in remaining test files..."
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Replace fireEvent imports with userEvent
    sed -i 's/import.*fireEvent.*/import userEvent from "@testing-library\/user-event"/g' "$file"
    # Replace fireEvent.click with await user.click
    sed -i 's/fireEvent\.click(/await user.click(/g' "$file"
    # Replace fireEvent.change with await user.type
    sed -i 's/fireEvent\.change(\([^,]*\), { target: { value: "\([^"]*\)" } })/await user.type(\1, "\2"/g' "$file"
    # Replace fireEvent.submit with await user form submission
    sed -i 's/fireEvent\.submit(\([^)]*\))/await user.pointer({ keys: "[Enter]", target: \1 })/g' "$file"
    echo "✓ Fixed $file"
  fi
done
echo "Done!"
