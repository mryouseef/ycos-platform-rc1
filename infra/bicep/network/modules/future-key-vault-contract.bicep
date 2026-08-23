// EP-07 future Key Vault contract only. No Key Vault, Managed HSM, key, secret, certificate, identity, private endpoint, DNS zone, or RBAC assignment is created.
@allowed(['SYNTHETIC_ONLY', 'AUTHORITY_REQUIRED'])
param keyVaultMode string
@allowed(['disabled'])
param publicNetworkAccess string
@allowed(['rbac-required'])
param authorizationModel string
@allowed(['required-before-production'])
param softDeleteRequirement string
@allowed(['required-before-production'])
param purgeProtectionRequirement string
@allowed(['required-before-production'])
param privateConnectivityReference string
@allowed(['required-before-production'])
param diagnosticsReference string
@allowed(['required-before-production'])
param regionalCapabilityReference string

output keyVaultModeOutput string = keyVaultMode
output publicNetworkAccessOutput string = publicNetworkAccess
output authorizationModelOutput string = authorizationModel
output softDeleteRequirementOutput string = softDeleteRequirement
output purgeProtectionRequirementOutput string = purgeProtectionRequirement
output privateConnectivityReferenceOutput string = privateConnectivityReference
output diagnosticsReferenceOutput string = diagnosticsReference
output regionalCapabilityReferenceOutput string = regionalCapabilityReference
output vaultConfigured bool = false
output managedHsmConfigured bool = false
output providerVerificationRequired bool = true
