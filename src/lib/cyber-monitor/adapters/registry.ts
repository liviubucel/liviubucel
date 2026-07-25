import type { SourceId, ThreatSourceAdapter } from '../types';
import { ransomwareLiveAdapter } from './ransomware-live';
import { hibpAdapter } from './hibp';
import { leakixAdapter } from './leakix';
import { threatfoxAdapter } from './threatfox';
import { urlhausAdapter } from './urlhaus';
import { malwarebazaarAdapter } from './malwarebazaar';
import { mispAdapter } from './misp';
import { enisaCirasAdapter } from './enisa-ciras';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ADAPTER_REGISTRY: Record<SourceId, ThreatSourceAdapter<any, any>> = {
  ransomware_live: ransomwareLiveAdapter,
  hibp: hibpAdapter,
  leakix: leakixAdapter,
  threatfox: threatfoxAdapter,
  urlhaus: urlhausAdapter,
  malwarebazaar: malwarebazaarAdapter,
  misp: mispAdapter,
  enisa_ciras: enisaCirasAdapter,
};
