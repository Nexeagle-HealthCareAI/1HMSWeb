export const fetchTemplateAsFile = async (url: string): Promise<File> => {
  const fetchTarget = resolveTemplateFetchUrl(url);
  if (!fetchTarget) {
    throw new Error('Template url is missing. Upload a template before running the test.');
  }

  const response = await fetch(fetchTarget, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) {
    throw new Error(`Failed to download template: ${response.status}`);
  }
  const blob = await response.blob();
  const fileName = deriveFileNameFromUrl(url);
  return new File([await blob.arrayBuffer()], fileName, { type: blob.type || 'application/pdf' });
};


const deriveFileNameFromUrl = (url: string) => {
  const withoutQuery = url.split('?')[0] ?? url;
  const candidate = withoutQuery.split('/').pop() || 'prescription-template.pdf';
  try {
    return decodeURIComponent(candidate);
  } catch {
    return candidate;
  }
};

const resolveTemplateFetchUrl = (uri: string | null | undefined) => {
  return uri || null;
};