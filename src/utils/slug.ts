// Removes the file extension from a string, effectively converting it to a slug.
export const toSlug = (id: string) => id.replace(/\.[^.]+$/, "");
