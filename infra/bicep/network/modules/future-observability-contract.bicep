// EP-06 future observability boundary only. No Azure Monitor, Log Analytics, Application Insights, Sentinel, diagnostic setting, or telemetry destination is deployed.
@allowed(['SYNTHETIC_ONLY','AUTHORITY_REQUIRED'])
param observabilityMode string
@allowed(['AUTHORITY_REQUIRED'])
param destinationEligibilityReference string
@allowed(['AUTHORITY_REQUIRED'])
param retentionPolicyReference string
@allowed(['AUTHORITY_REQUIRED'])
param residencyVerificationReference string
@allowed(['AUTHORITY_REQUIRED'])
param alertingPolicyReference string
output observabilityModeOutput string = observabilityMode
output destinationEligibilityReferenceOutput string = destinationEligibilityReference
output residencyVerificationReferenceOutput string = residencyVerificationReference
output alertingPolicyReferenceOutput string = alertingPolicyReference
output destinationConfigured bool = false
output telemetryExportConfigured bool = false
output providerVerificationRequired bool = true
output retentionPolicyReferenceOutput string = retentionPolicyReference
