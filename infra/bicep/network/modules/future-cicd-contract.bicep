// EP-09 future CI/CD contract only. No deployment identity, OIDC federation, registry, artifact service, pipeline, release, or production deployment resource is created.
@allowed(['SYNTHETIC_ONLY', 'AUTHORITY_REQUIRED'])
param cicdMode string
@allowed(['required-before-production'])
param pipelineIdentityReference string
@allowed(['required-before-production'])
param artifactIntegrityReference string
@allowed(['required-before-production'])
param releaseAuthorizationReference string
@allowed(['required-before-production'])
param targetRegionEligibilityReference string

output cicdModeOutput string = cicdMode
output pipelineIdentityReferenceOutput string = pipelineIdentityReference
output artifactIntegrityReferenceOutput string = artifactIntegrityReference
output releaseAuthorizationReferenceOutput string = releaseAuthorizationReference
output targetRegionEligibilityReferenceOutput string = targetRegionEligibilityReference
output deploymentConfigured bool = false
output remoteCIVerified bool = false
