export const buildPublicCardUrl = (slug: string, uniqueId: string) => {
  if (!slug) return "";
  if (typeof window === "undefined") return `/${slug}/${uniqueId}`;
  return `${window.location.origin}/${slug}/${uniqueId}`;
};

export const buildStaffPortalUrl = (slug: string, orgId: string) => {
  if (!slug || !orgId) return "";
  const path = `/${slug}/staff?id=${encodeURIComponent(orgId)}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
};
