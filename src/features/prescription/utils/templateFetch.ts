export const resolveTemplateFetchUrl = (uri: string | null | undefined) => {
  if (!uri) {
    return null;
  }

  if (import.meta.env.DEV) {
    try {
      const parsed = new URL(uri);
      return `/blob-proxy${parsed.pathname}${parsed.search}`;
    } catch (error) {
      console.warn('Unable to construct blob proxy url for template', error);
      return uri;
    }
  }

  return uri;
};
