export const ISSUE_AREAS: Record<string, string> = {
  '1': 'Aboriginal Law',
  '2': 'Administrative Law',
  '3': 'Citizenship & Immigration',
  '4': 'Civil Procedure',
  '5': 'Civil Rights / Human Rights',
  '6': 'Commercial Law',
  '7': 'Contracts',
  '8': 'Criminal Law',
  '9': 'Division of Powers',
  '10': 'Equity & Trusts',
  '11': 'Family Law',
  '12': 'Intellectual Property',
  '13': 'International Law',
  '14': 'Labour Law',
  '15': 'Privacy & Access to Info',
  '16': 'Property Law',
  '17': 'Regulatory Law',
  '18': 'Tax Law',
  '19': 'Tort Law',
  '20': 'Wills & Estates',
  '21': 'Miscellaneous'
};

export const PROVINCE_MAP: Record<string, string> = {
  '0': 'N/A',
  '1': 'Alberta',
  '2': 'British Columbia',
  '3': 'Manitoba',
  '4': 'New Brunswick',
  '5': 'Newfoundland and Labrador',
  '6': 'Nova Scotia',
  '7': 'Ontario',
  '8': 'Prince Edward Island',
  '9': 'Quebec',
  '10': 'Saskatchewan',
  '11': 'Northwest Territories',
  '12': 'Nunavut',
  '13': 'Yukon',
  '14': 'Federal'
};

export const DECISION_TYPES: Record<string, string> = {
  '1': 'Oral',
  '2': 'Reserved',
  '3': 'Order',
  '4': 'Reserved',
  '0': 'Unknown'
};

// Coding Manual, Appendix E. The manual itself cautions that this
// characterization "is often ambiguous and can be overly simplistic" — any UI
// built on it must carry that caveat.
export const DIRECTION_LABELS: Record<string, string> = {
  '1': 'Conservative',
  '2': 'Liberal',
  '3': 'Unspecifiable',
  '0': 'N/A'
};

export const DIRECTION_COLORS: Record<string, string> = {
  '1': '#b45309', // amber-700
  '2': '#1d4ed8', // blue-700
  '3': '#94a3b8', // slate-400
  '0': '#cbd5e1'
};

// Coding Manual §49.
export const VOTE_TYPE_LABELS: Record<string, string> = {
  '1': 'Majority',
  '2': 'Dissent',
  '3': 'Concurrence',
  '4': 'Judgment of the Court',
  '5': 'Plurality',
  '6': 'Expressed no opinion'
};

// Spaeth US Supreme Court Database issue areas. The SCC dataset carries an
// issueAreaUS crosswalk on 7,239 of 7,240 issues, which is what makes
// SCC/SCOTUS comparison possible without any new coding work.
export const US_ISSUE_AREAS: Record<string, string> = {
  '1': 'Criminal Procedure',
  '2': 'Civil Rights',
  '3': 'First Amendment',
  '4': 'Due Process',
  '5': 'Privacy',
  '6': 'Attorneys',
  '7': 'Unions',
  '8': 'Economic Activity',
  '9': 'Judicial Power',
  '10': 'Federalism',
  '11': 'Interstate Relations',
  '12': 'Federal Taxation',
  '13': 'Miscellaneous',
  '14': 'Private Action'
};

// caseDispositionUS / lowerCourtDispositionUS share the Spaeth disposition scheme.
export const US_DISPOSITIONS: Record<string, string> = {
  '1': 'Stay, petition, or motion granted',
  '2': 'Affirmed',
  '3': 'Reversed',
  '4': 'Reversed and remanded',
  '5': 'Vacated and remanded',
  '6': 'Affirmed and reversed in part',
  '7': 'Affirmed and reversed in part, remanded',
  '8': 'Vacated',
  '9': 'Petition denied or appeal dismissed',
  '10': 'Certification to/from a lower court',
  '11': 'No disposition'
};