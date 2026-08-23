// EP-13 planning contract only. It declares no Azure resource.
@allowed(['SYNTHETIC_ONLY'])
param resilienceMode string
@allowed(['required-before-production'])
param readinessRequirement string
@allowed(['required-before-production'])
param resourceBoundsRequirement string
param retryPolicyReference string
param queueConfigurationReference string
param diagnosticsReference string
param autoscalingEligibilityReference string
output resilienceModeOutput string = resilienceMode
output readinessRequirementOutput string = readinessRequirement
output resourceBoundsRequirementOutput string = resourceBoundsRequirement
output retryPolicyReferenceOutput string = retryPolicyReference
output queueConfigurationReferenceOutput string = queueConfigurationReference
output diagnosticsReferenceOutput string = diagnosticsReference
output autoscalingEligibilityReferenceOutput string = autoscalingEligibilityReference
