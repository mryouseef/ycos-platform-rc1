// EP-05 future identity boundary only. No Entra resource, tenant, application, role assignment, managed identity, or credential is created.
@allowed(['SYNTHETIC_ONLY', 'AUTHORITY_REQUIRED'])
param identityProviderMode string
@allowed(['AUTHORITY_REQUIRED'])
param tenantAuthorityReference string
@allowed(['AUTHORITY_REQUIRED'])
param issuerValidationReference string
@allowed(['AUTHORITY_REQUIRED'])
param audienceValidationReference string
@allowed(['AUTHORITY_REQUIRED'])
param redirectUriPolicyReference string

output identityProviderModeOutput string = identityProviderMode
output tenantAuthorityReferenceOutput string = tenantAuthorityReference
output issuerValidationReferenceOutput string = issuerValidationReference
output audienceValidationReferenceOutput string = audienceValidationReference
output redirectUriPolicyReferenceOutput string = redirectUriPolicyReference
output tenantConfigured bool = false
output applicationRegistrationConfigured bool = false
output managedIdentityConfigured bool = false
output providerVerificationRequired bool = true
