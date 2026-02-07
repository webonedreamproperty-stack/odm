export const normalizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

export const isSlugValid = (value: string) => {
  if (value.length < 3 || value.length > 30) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
};

export const getSlugHint = (value: string) => {
  if (!value) return "Pick something short and memorable.";
  if (value.length < 3) return "Slug is too short.";
  if (value.length > 30) return "Slug is too long.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return "Use only letters, numbers, and hyphens.";
  }
  return "Looks great.";
};
