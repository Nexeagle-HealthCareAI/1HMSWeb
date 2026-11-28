// Turns a FHIR document bundle received from another facility (ABDM M3) into plain text a
// clinician can read: a title, who wrote it, and each section as lines. Pure and defensive:
// the bundle comes from outside, so nothing in it is trusted to have any particular shape,
// and its HTML narrative is reduced to text, never rendered.

export interface FhirSummarySection {
  title: string;
  lines: string[];
}

/** A file carried inside the record: the PDF copy of a structured record, or a scanned document. */
export interface FhirAttachment {
  title: string;
  contentType: string;
  /** Base64, as it came in the bundle. */
  data: string;
}

export interface FhirSummary {
  title: string;
  date?: string;
  author?: string;
  facility?: string;
  patient?: string;
  sections: FhirSummarySection[];
  attachments: FhirAttachment[];
}

/** Only these are offered to open: a browser shows them itself, and nothing in them runs. */
export const VIEWABLE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** A CodeableConcept as words: its text, else the first coding's display or code. */
export const conceptText = (v: unknown): string | undefined => {
  if (!isObj(v)) return undefined;
  const coding = arr(v.coding).find(isObj);
  return str(v.text) ?? (coding ? str(coding.display) ?? str(coding.code) : undefined);
};

/** XHTML narrative to plain text. Tags are dropped, never interpreted. */
export const narrativeText = (div: unknown): string | undefined => {
  const raw = str(div);
  if (!raw) return undefined;
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  return text || undefined;
};

const quantity = (v: unknown): string | undefined => {
  if (!isObj(v) || (typeof v.value !== 'number' && typeof v.value !== 'string')) return undefined;
  return [String(v.value), str(v.unit) ?? str(v.code)].filter(Boolean).join(' ');
};

const personName = (resource: Json): string | undefined => {
  const name = arr(resource.name).find(isObj);
  if (name) {
    return str(name.text) ?? ([...arr(name.prefix), ...arr(name.given), name.family].map(str).filter(Boolean).join(' ') || undefined);
  }
  return str(resource.name);
};

/** One resource as a line of text, or nothing when there is nothing to say. */
export const resourceLine = (resource: unknown): string | undefined => {
  if (!isObj(resource)) return undefined;
  const type = str(resource.resourceType);
  switch (type) {
    case 'MedicationRequest':
    case 'MedicationStatement': {
      const medicine = conceptText(resource.medicationCodeableConcept) ?? (isObj(resource.medicationReference) ? str(resource.medicationReference.display) : undefined);
      const dosage = arr(resource.dosageInstruction ?? resource.dosage).find(isObj);
      const how = dosage ? [str(dosage.text), conceptText(dosage.route)].filter(Boolean).join(', ') : '';
      return medicine ? (how ? `${medicine}: ${how}` : medicine) : undefined;
    }
    case 'Observation': {
      const label = conceptText(resource.code);
      const parts = arr(resource.component).filter(isObj)
        .map(c => [conceptText(c.code), quantity(c.valueQuantity) ?? str(c.valueString)].filter(Boolean).join(' '))
        .filter(Boolean);
      const value = quantity(resource.valueQuantity) ?? str(resource.valueString) ?? conceptText(resource.valueCodeableConcept) ?? (parts.length ? parts.join(', ') : undefined);
      return label ? (value ? `${label}: ${value}` : label) : value;
    }
    case 'DiagnosticReport': {
      const label = conceptText(resource.code);
      const conclusion = str(resource.conclusion);
      return [label, conclusion].filter(Boolean).join(': ') || undefined;
    }
    case 'CarePlan':
      return [str(resource.title), str(resource.description)].filter(Boolean).join(': ') || undefined;
    case 'DocumentReference':
      return str(resource.description) ?? conceptText(resource.type) ?? 'Attached document';
    case 'Immunization': {
      const vaccine = conceptText(resource.vaccineCode);
      const when = str(resource.occurrenceDateTime);
      return vaccine ? (when ? `${vaccine} (${when.slice(0, 10)})` : vaccine) : undefined;
    }
    case 'Invoice': {
      const total = isObj(resource.totalGross) ? resource.totalGross.value : undefined;
      const items = arr(resource.lineItem).length;
      const amount = typeof total === 'number' || typeof total === 'string' ? `INR ${total}` : undefined;
      return [`Bill${items ? ` with ${items} item${items === 1 ? '' : 's'}` : ''}`, amount].filter(Boolean).join(', total ');
    }
    case 'Binary':
      return 'Attached document';
    case 'AllergyIntolerance':
    case 'Condition':
    case 'Procedure':
    case 'ServiceRequest':
      return conceptText(resource.code);
    default:
      return conceptText(resource.code) ?? undefined;
  }
};

export const summariseFhirBundle = (bundle: unknown): FhirSummary => {
  const empty: FhirSummary = { title: 'Health record', sections: [], attachments: [] };
  if (!isObj(bundle)) return empty;

  const byUrl = new Map<string, Json>();
  const resources: Json[] = [];
  for (const entry of arr(bundle.entry)) {
    if (!isObj(entry) || !isObj(entry.resource)) continue;
    resources.push(entry.resource);
    const url = str(entry.fullUrl);
    if (url) byUrl.set(url, entry.resource);
    const type = str(entry.resource.resourceType);
    const id = str(entry.resource.id);
    if (type && id) byUrl.set(`${type}/${id}`, entry.resource);
  }
  const resolve = (ref: unknown): Json | undefined => {
    const reference = isObj(ref) ? str(ref.reference) : undefined;
    return reference ? byUrl.get(reference) : undefined;
  };
  const display = (ref: unknown): string | undefined => {
    const target = resolve(ref);
    return (target ? personName(target) : undefined) ?? (isObj(ref) ? str(ref.display) : undefined);
  };

  const composition = resources.find(r => r.resourceType === 'Composition');
  if (!composition) return empty;

  const sections: FhirSummarySection[] = [];
  for (const section of arr(composition.section)) {
    if (!isObj(section)) continue;
    const lines: string[] = [];
    const narrative = isObj(section.text) ? narrativeText(section.text.div) : undefined;
    if (narrative) lines.push(...narrative.split('\n'));
    for (const ref of arr(section.entry)) {
      const line = resourceLine(resolve(ref));
      if (line && !lines.includes(line)) lines.push(line);
    }
    if (lines.length > 0) {
      sections.push({ title: str(section.title) ?? conceptText(section.code) ?? 'Details', lines });
    }
  }

  const attachments: FhirAttachment[] = [];
  const addAttachment = (a: unknown, fallbackTitle: string) => {
    if (!isObj(a)) return;
    const contentType = str(a.contentType)?.toLowerCase();
    const data = str(a.data);
    if (!contentType || !data || !VIEWABLE_TYPES.includes(contentType)) return;
    attachments.push({ title: str(a.title) ?? fallbackTitle, contentType, data });
  };
  for (const r of resources) {
    if (r.resourceType === 'DocumentReference') {
      for (const c of arr(r.content)) if (isObj(c)) addAttachment(c.attachment, conceptText(r.type) ?? 'Document');
    } else if (r.resourceType === 'Binary') {
      addAttachment(r, str(composition.title) ?? 'Document');
    } else if (r.resourceType === 'DiagnosticReport') {
      for (const form of arr(r.presentedForm)) addAttachment(form, conceptText(r.code) ?? 'Report');
    }
  }

  return {
    title: str(composition.title) ?? conceptText(composition.type) ?? empty.title,
    date: str(composition.date),
    author: arr(composition.author).map(display).filter(Boolean).join(', ') || undefined,
    facility: display(composition.custodian),
    patient: display(composition.subject),
    sections,
    attachments,
  };
};

/** Opens an attached file in a new tab. Call it straight from the click: browsers block a window opened later. */
export const openAttachment = (attachment: FhirAttachment): boolean => {
  if (!VIEWABLE_TYPES.includes(attachment.contentType)) return false;
  try {
    const bytes = Uint8Array.from(atob(attachment.data.replace(/\s/g, '')), ch => ch.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: attachment.contentType }));
    const opened = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return opened !== null;
  } catch {
    return false;
  }
};
