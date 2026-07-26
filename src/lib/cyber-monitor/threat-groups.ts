// Romania Cyber Monitor - general, publicly-documented background on known
// ransomware groups and sectors, used to add real context to generated
// articles. Everything here is well-established public threat-intelligence
// knowledge about the GROUP or SECTOR in general - never a claim about the
// specific incident being reported. Keep entries factual and generic
// (operating model, known since, typical tactics) - no speculation about
// any particular victim.

export interface ThreatGroupProfile {
  name: string;
  description: string;
}

// Keyed by slugify(group name) - matches NormalisedIncident.threatGroupId.
export const THREAT_GROUP_PROFILES: Record<string, ThreatGroupProfile> = {
  lockbit: {
    name: 'LockBit',
    description:
      'LockBit is a ransomware-as-a-service (RaaS) operation active since 2019, historically one of the most prolific leak-site operators worldwide. It licenses its encryptor to affiliates who carry out the actual intrusions, and is associated with double-extortion tactics (encrypting data and threatening to publish it). Law enforcement action in 2024 disrupted parts of its infrastructure, though associated activity has continued under the same or successor branding.',
  },
  alphv: {
    name: 'ALPHV/BlackCat',
    description:
      'ALPHV, also known as BlackCat, is a ransomware-as-a-service operation first observed in 2021, notable for being written in Rust and for aggressive double- and triple-extortion tactics (encryption, data leak threats, and sometimes direct pressure on customers or partners of the victim).',
  },
  clop: {
    name: 'Cl0p',
    description:
      'Cl0p (also written Clop) is a ransomware and extortion group active since at least 2019, known for large-scale campaigns exploiting vulnerabilities in file-transfer software to steal data from many organisations at once, often without deploying encryption at all - relying purely on the threat of publishing stolen data.',
  },
  akira: {
    name: 'Akira',
    description:
      'Akira is a ransomware-as-a-service operation first observed in 2023, known for targeting small and mid-sized organisations across many sectors and for double-extortion tactics via its own leak site.',
  },
  play: {
    name: 'Play',
    description:
      'Play (also referenced as PlayCrypt) is a ransomware group active since 2022, known for double-extortion attacks and for avoiding direct communication with victims prior to publishing stolen data.',
  },
  medusa: {
    name: 'Medusa',
    description:
      'Medusa is a ransomware-as-a-service operation active since 2021, known for double-extortion tactics and a public leak site used to pressure victims into paying.',
  },
  blackbasta: {
    name: 'Black Basta',
    description:
      'Black Basta is a ransomware-as-a-service group first observed in 2022, widely assessed to include operators with prior experience in other major ransomware operations, known for double-extortion tactics against a broad range of sectors.',
  },
  ransomhub: {
    name: 'RansomHub',
    description:
      'RansomHub is a ransomware-as-a-service operation that emerged in 2024, which grew quickly by recruiting affiliates from other disrupted ransomware brands, and uses double-extortion tactics via its own leak site.',
  },
  incransom: {
    name: 'INC Ransom',
    description:
      'INC Ransom is a ransomware and extortion group active since 2023, known for double-extortion attacks against organisations across a range of sectors, including healthcare and public services.',
  },
  rhysida: {
    name: 'Rhysida',
    description:
      'Rhysida is a ransomware-as-a-service operation first observed in 2023, known for attacks on healthcare, education, and government-adjacent organisations, and for auctioning stolen data on its leak site.',
  },
  '8base': {
    name: '8Base',
    description:
      '8Base is a ransomware and extortion group active since at least 2022, notable for a high volume of claimed victims and for combining ransomware deployment with straightforward data-leak extortion.',
  },
  dragonforce: {
    name: 'DragonForce',
    description:
      'DragonForce is a ransomware-as-a-service operation active since 2023 that also offers its infrastructure and leak-site branding to affiliates, contributing to a high volume of claimed victims across sectors.',
  },
  huntersinternational: {
    name: 'Hunters International',
    description:
      'Hunters International is a ransomware and extortion group first observed in late 2023, assessed by researchers to share code lineage with the earlier Hive ransomware, and known for double-extortion tactics.',
  },
  qilin: {
    name: 'Qilin',
    description:
      'Qilin (also referenced as Agenda) is a ransomware-as-a-service operation active since 2022, known for double-extortion attacks and a leak site used to pressure non-paying victims.',
  },
  bianlian: {
    name: 'BianLian',
    description:
      'BianLian is an extortion group active since 2022 that shifted from encryption-based ransomware to pure data-theft extortion, threatening to publish stolen data without necessarily encrypting victim systems.',
  },
};

const GENERIC_GROUP_DESCRIPTION =
  'Public ransomware-intelligence sources track this group as an active data-leak-site operator, but a detailed profile for it is not yet available here.';

export function getThreatGroupProfile(threatGroupId: string | null): ThreatGroupProfile | null {
  if (!threatGroupId) return null;
  return THREAT_GROUP_PROFILES[threatGroupId] ?? null;
}

export function describeThreatGroup(threatGroupId: string | null, displayName: string): string {
  const profile = getThreatGroupProfile(threatGroupId);
  return profile ? profile.description : `${displayName}: ${GENERIC_GROUP_DESCRIPTION}`;
}

// General, well-established sector risk context - not specific to any
// incident. Keyed by lowercase, matched loosely against the sector string
// the source reports (sector taxonomies vary a lot between feeds).
const SECTOR_CONTEXT: Array<{ match: RegExp; text: string }> = [
  {
    match: /manufactur|industr/i,
    text: 'Manufacturing and industrial organisations are frequent ransomware targets: production downtime is extremely costly, which increases pressure to pay quickly, and many still run legacy operational-technology systems that are harder to patch.',
  },
  {
    match: /health|medical|pharma/i,
    text: 'Healthcare and pharmaceutical organisations are high-value ransomware targets because of the sensitivity of patient data and the operational necessity of uninterrupted care, which increases pressure to pay.',
  },
  {
    match: /financ|bank|insur/i,
    text: 'Financial and insurance organisations are targeted both for the sensitivity of the data they hold and the regulatory consequences of a breach, which can increase pressure to pay quickly.',
  },
  {
    match: /retail|commerce|e-commerce/i,
    text: 'Retail and e-commerce organisations are attractive targets due to the volume of customer payment and personal data they process.',
  },
  {
    match: /educat|school|university/i,
    text: 'Educational institutions are frequently targeted, often because of comparatively under-resourced IT security teams relative to the amount of personal data they hold.',
  },
  {
    match: /energy|utilit|oil|gas/i,
    text: 'Energy and utility organisations are targeted both for the criticality of their operations and, in some cases, for geopolitical leverage.',
  },
  {
    match: /it|technology|software|telecom/i,
    text: 'IT, software, and telecom providers are attractive targets because a single compromise can create downstream risk for their customers as well.',
  },
  {
    match: /transport|logistic/i,
    text: 'Transport and logistics organisations are targeted partly because operational downtime has immediate, highly visible knock-on effects, which increases pressure to pay quickly.',
  },
  {
    match: /public|government|municipal/i,
    text: 'Public-sector and municipal organisations are frequent targets, often because of comparatively limited security budgets relative to the amount of citizen data they hold.',
  },
];

export function describeSectorContext(sector: string | null): string | null {
  if (!sector) return null;
  const entry = SECTOR_CONTEXT.find(({ match }) => match.test(sector));
  return entry ? entry.text : null;
}
