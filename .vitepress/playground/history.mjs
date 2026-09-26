// Textarea history owns both native edits and programmatic replacements. A fix
// is one transaction; composition is recorded only when the IME commits.
export function createSourceHistory(source, { limit = 100 } = {}) {
  let entries = [{ source, start: 0, end: 0 }];
  let index = 0;
  let previousGroup;
  let previousTime = 0;
  return {
    get canUndo() { return index > 0; },
    get canRedo() { return index < entries.length - 1; },
    capture(start, end) {
      if (start !== entries[index].start || end !== entries[index].end) previousGroup = undefined;
      entries[index] = { ...entries[index], start, end };
    },
    record(source, start, end, { group, now = Date.now() } = {}) {
      if (source === entries[index].source) return;
      const coalesce = group && group === previousGroup && now - previousTime < 750 && index === entries.length - 1 && index > 0;
      entries.splice(index + 1);
      if (coalesce) entries[index] = { source, start, end };
      else { entries.push({ source, start, end }); index += 1; }
      if (entries.length > limit) { entries.shift(); index -= 1; }
      previousGroup = group;
      previousTime = now;
    },
    breakGroup() { previousGroup = undefined; },
    undo() { previousGroup = undefined; index = Math.max(0, index - 1); return entries[index]; },
    redo() { previousGroup = undefined; index = Math.min(entries.length - 1, index + 1); return entries[index]; },
    reset(source) { entries = [{ source, start: 0, end: 0 }]; index = 0; previousGroup = undefined; },
  };
}

// A bounded linear diff highlights the changed span without a quadratic matrix
// for large pasted documents. Common prefix/suffix lines remain readable context.
export function sourceDiff(original, candidate) {
  const before = original.split('\n');
  const after = candidate.split('\n');
  let prefix = 0;
  while (prefix < Math.min(before.length, after.length) && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < Math.min(before.length, after.length) - prefix && before.at(-1 - suffix) === after.at(-1 - suffix)) suffix += 1;
  return [
    ...before.slice(0, prefix).map(text => ({ kind: 'same', text })),
    ...before.slice(prefix, before.length - suffix).map(text => ({ kind: 'removed', text })),
    ...after.slice(prefix, after.length - suffix).map(text => ({ kind: 'added', text })),
    ...(suffix ? before.slice(-suffix).map(text => ({ kind: 'same', text })) : []),
  ];
}
