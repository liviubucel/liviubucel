// Romania Cyber Monitor - curated MISP public feed list.
//
// Deliberately empty by default. Populating this list with real feed URLs
// requires an operator to review each feed's licence/terms of use first
// (per the spec's "respect each feed's licence, terms and attribution
// requirements" requirement) - this file should never contain a guessed or
// unverified feed URL. An empty list is a valid, safe configuration: the
// MISP adapter simply produces no records until an editor adds entries
// here.
export interface MispFeedConfig {
  name: string;
  url: string;
  host: string;
  /** True only for feeds the operator has manually verified as an
   * authoritative/official source (e.g. a national CERT feed). */
  authoritative: boolean;
}

export const MISP_CURATED_FEEDS: MispFeedConfig[] = [];
