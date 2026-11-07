import { useState } from 'react';

// Input that edits a local draft and only calls onCommit when the user leaves
// the field (or presses Enter), so we don't write to Firestore on every keystroke.
export default function CommitInput({ value, onCommit, ...props }) {
  const [draft, setDraft] = useState(null);
  const current = value ?? '';

  return (
    <input
      {...props}
      value={draft ?? current}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== String(current)) onCommit(draft);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}
