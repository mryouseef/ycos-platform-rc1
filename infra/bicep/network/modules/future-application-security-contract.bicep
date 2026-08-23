// EP-12 planning contract only. This module deliberately declares no Azure resource.
@allowed([
  'SYNTHETIC_ONLY'
])
param applicationSecurityMode string

@allowed([
  'deny-by-default'
])
param ingressDefaultDeny string

@allowed([
  'same-origin-only'
])
param corsMode string

@allowed([
  'required-before-production'
])
param securityHeadersRequirement string

param rateLimitPolicyReference string
param diagnosticEvidenceReference string
param wafCdnEligibilityReference string
param applicationSecurityRegionalCapabilityReference string

output applicationSecurityModeOutput string = applicationSecurityMode
output ingressDefaultDenyOutput string = ingressDefaultDeny
output corsModeOutput string = corsMode
output securityHeadersRequirementOutput string = securityHeadersRequirement
output rateLimitPolicyReferenceOutput string = rateLimitPolicyReference
output diagnosticEvidenceReferenceOutput string = diagnosticEvidenceReference
output wafCdnEligibilityReferenceOutput string = wafCdnEligibilityReference
output applicationSecurityRegionalCapabilityReferenceOutput string = applicationSecurityRegionalCapabilityReference
