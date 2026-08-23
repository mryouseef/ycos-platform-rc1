// EP-02 Design Reminder: private-by-default, controlled non-production source only.
// Do not deploy. Saudi service/SKU availability remains unverified under F-GO02-01.
targetScope = 'resourceGroup'

@allowed([
  'controlled'
])
param environment string

@description('Authorized controlled-evaluation region, not a production-region assertion.')
param authorizedControlledEvaluationRegion string

@description('Operational region code used only in deterministic names and tags.')
param regionCode string

@description('Planning value only; reconciliation with enterprise IP allocation is required before apply.')
param addressSpace string

param applicationSubnetPrefix string
param privateEndpointSubnetPrefix string
@description('Planning-only delegated subnet for a future PostgreSQL private path; capability and region verification remain required.')
param databaseSubnetPrefix string
param vnetName string
param applicationNsgName string
param databaseNsgName string
param storageAccountName string
param identityProviderMode string
param tenantAuthorityReference string
param issuerValidationReference string
param audienceValidationReference string
param redirectUriPolicyReference string
param observabilityMode string
param destinationEligibilityReference string
param retentionPolicyReference string
param residencyVerificationReference string
param alertingPolicyReference string
param keyVaultMode string
param keyVaultPrivateConnectivityReference string
param keyVaultDiagnosticsReference string
param keyVaultRegionalCapabilityReference string
param recoveryMode string
param backupIntegrityReference string
param restoreAuthorizationReference string
param retentionAndHoldReference string
param backupEncryptionKeyReference string
param recoveryRegionalCapabilityReference string
param cicdMode string
param pipelineIdentityReference string
param artifactIntegrityReference string
param releaseAuthorizationReference string
param cicdTargetRegionEligibilityReference string
param operationsMode string
param maintenanceAuthorityReference string
param operationalIdentityReference string
param alertingEligibilityReference string
param incidentEscalationReference string
param operationsRegionalCapabilityReference string
param privacyMode string
param classificationReference string
param lifecyclePolicyReference string
param holdAuthorityReference string
param exportAuthorizationReference string
param privacyAuditEvidenceReference string
param privacyProviderLifecycleEligibilityReference string
param applicationSecurityMode string
param ingressDefaultDeny string
param corsMode string
param securityHeadersRequirement string
param rateLimitPolicyReference string
param applicationSecurityDiagnosticEvidenceReference string
param wafCdnEligibilityReference string
param applicationSecurityRegionalCapabilityReference string
param resilienceMode string
param readinessRequirement string
param resourceBoundsRequirement string
param retryPolicyReference string
param queueConfigurationReference string
param resilienceDiagnosticsReference string
param autoscalingEligibilityReference string
param ownerRole string
param costCenter string
param residencyTarget string

var governanceTags = {
  project: 'ycos'
  environment: environment
  ownerRole: ownerRole
  dataClass: 'synthetic-non-sensitive'
  criticality: 'controlled-network-foundation'
  costCenter: costCenter
  managedBy: 'iac-bicep'
  lifecycle: 'controlled'
  residencyTarget: residencyTarget
  regionCode: regionCode
  publicDataPlaneDefault: 'denied'
}

module applicationNsg './modules/application-nsg.bicep' = {
  name: '${applicationNsgName}-module'
  params: {
    nsgName: applicationNsgName
    location: authorizedControlledEvaluationRegion
    tags: governanceTags
    applicationSubnetPrefix: applicationSubnetPrefix
    databaseSubnetPrefix: databaseSubnetPrefix
  }
}

module databaseNsg './modules/database-nsg.bicep' = {
  name: '${databaseNsgName}-module'
  params: {
    nsgName: databaseNsgName
    location: authorizedControlledEvaluationRegion
    tags: governanceTags
    applicationSubnetPrefix: applicationSubnetPrefix
    databaseSubnetPrefix: databaseSubnetPrefix
  }
}

module controlledNetwork './modules/controlled-network.bicep' = {
  name: '${vnetName}-module'
  params: {
    vnetName: vnetName
    location: authorizedControlledEvaluationRegion
    tags: governanceTags
    addressSpace: addressSpace
    applicationSubnetPrefix: applicationSubnetPrefix
    privateEndpointSubnetPrefix: privateEndpointSubnetPrefix
    applicationNsgId: applicationNsg.outputs.resourceId
    databaseSubnetPrefix: databaseSubnetPrefix
    databaseNsgId: databaseNsg.outputs.resourceId
  }
}

module futurePostgresqlContract './modules/future-postgresql-contract.bicep' = {
  name: 'future-postgresql-private-contract'
  params: {
    databaseSubnetPrefix: databaseSubnetPrefix
    permittedApplicationPort: 5432
    publicNetworkAccess: 'disabled'
    privateConnectivityPattern: 'vnet-integration'
  }
}

module futureStorageContract './modules/future-storage-contract.bicep' = {
  name: 'future-storage-security-contract'
  params: {
    storageAccountName: storageAccountName
    location: authorizedControlledEvaluationRegion
    tags: governanceTags
  }
}

module futureIdentityContract './modules/future-identity-contract.bicep' = {
  name: 'future-identity-security-contract'
  params: {
    identityProviderMode: identityProviderMode
    tenantAuthorityReference: tenantAuthorityReference
    issuerValidationReference: issuerValidationReference
    audienceValidationReference: audienceValidationReference
    redirectUriPolicyReference: redirectUriPolicyReference
  }
}

module futureObservabilityContract './modules/future-observability-contract.bicep' = {
  name: 'future-observability-contract'
  params: {
    observabilityMode: observabilityMode
    destinationEligibilityReference: destinationEligibilityReference
    retentionPolicyReference: retentionPolicyReference
    residencyVerificationReference: residencyVerificationReference
    alertingPolicyReference: alertingPolicyReference
  }
}

module futureKeyVaultContract './modules/future-key-vault-contract.bicep' = {
  name: 'future-key-vault-security-contract'
  params: {
    keyVaultMode: keyVaultMode
    publicNetworkAccess: 'disabled'
    authorizationModel: 'rbac-required'
    softDeleteRequirement: 'required-before-production'
    purgeProtectionRequirement: 'required-before-production'
    privateConnectivityReference: keyVaultPrivateConnectivityReference
    diagnosticsReference: keyVaultDiagnosticsReference
    regionalCapabilityReference: keyVaultRegionalCapabilityReference
  }
}

module futureRecoveryContract './modules/future-recovery-contract.bicep' = {
  name: 'future-recovery-security-contract'
  params: {
    recoveryMode: recoveryMode
    backupIntegrityReference: backupIntegrityReference
    restoreAuthorizationReference: restoreAuthorizationReference
    retentionAndHoldReference: retentionAndHoldReference
    encryptionKeyReference: backupEncryptionKeyReference
    regionalCapabilityReference: recoveryRegionalCapabilityReference
    crossRegionPosture: 'same-region-first'
  }
}

module futureCicdContract './modules/future-cicd-contract.bicep' = {
  name: 'future-cicd-security-contract'
  params: {
    cicdMode: cicdMode
    pipelineIdentityReference: pipelineIdentityReference
    artifactIntegrityReference: artifactIntegrityReference
    releaseAuthorizationReference: releaseAuthorizationReference
    targetRegionEligibilityReference: cicdTargetRegionEligibilityReference
  }
}

module futureOperationsContract './modules/future-operations-contract.bicep' = {
  name: 'future-operations-contract'
  params: {
    operationsMode: operationsMode
    maintenanceAuthorityReference: maintenanceAuthorityReference
    operationalIdentityReference: operationalIdentityReference
    alertingEligibilityReference: alertingEligibilityReference
    incidentEscalationReference: incidentEscalationReference
    regionalCapabilityReference: operationsRegionalCapabilityReference
  }
}

module futurePrivacyContract './modules/future-privacy-contract.bicep' = {
  name: 'future-privacy-lifecycle-contract'
  params: {
    privacyMode: privacyMode
    classificationReference: classificationReference
    lifecyclePolicyReference: lifecyclePolicyReference
    holdAuthorityReference: holdAuthorityReference
    exportAuthorizationReference: exportAuthorizationReference
    auditEvidenceReference: privacyAuditEvidenceReference
    providerLifecycleEligibilityReference: privacyProviderLifecycleEligibilityReference
  }
}

module futureApplicationSecurityContract './modules/future-application-security-contract.bicep' = {
  name: 'future-application-security-contract'
  params: {
    applicationSecurityMode: applicationSecurityMode
    ingressDefaultDeny: ingressDefaultDeny
    corsMode: corsMode
    securityHeadersRequirement: securityHeadersRequirement
    rateLimitPolicyReference: rateLimitPolicyReference
    diagnosticEvidenceReference: applicationSecurityDiagnosticEvidenceReference
    wafCdnEligibilityReference: wafCdnEligibilityReference
    applicationSecurityRegionalCapabilityReference: applicationSecurityRegionalCapabilityReference
  }
}

module futureResilienceContract './modules/future-resilience-contract.bicep' = {
  name: 'future-resilience-contract'
  params: {
    resilienceMode: resilienceMode
    readinessRequirement: readinessRequirement
    resourceBoundsRequirement: resourceBoundsRequirement
    retryPolicyReference: retryPolicyReference
    queueConfigurationReference: queueConfigurationReference
    diagnosticsReference: resilienceDiagnosticsReference
    autoscalingEligibilityReference: autoscalingEligibilityReference
  }
}

output virtualNetworkId string = controlledNetwork.outputs.resourceId
output applicationNetworkSecurityGroupId string = applicationNsg.outputs.resourceId
output databaseNetworkSecurityGroupId string = databaseNsg.outputs.resourceId
output futurePostgresqlPort int = futurePostgresqlContract.outputs.permittedApplicationPort
output futureStorageId string = futureStorageContract.outputs.resourceId
output futureIdentityProviderMode string = futureIdentityContract.outputs.identityProviderModeOutput
output futureObservabilityMode string = futureObservabilityContract.outputs.observabilityModeOutput
output futureKeyVaultMode string = futureKeyVaultContract.outputs.keyVaultModeOutput
output futureRecoveryMode string = futureRecoveryContract.outputs.recoveryModeOutput
output futureCicdMode string = futureCicdContract.outputs.cicdModeOutput
output futureOperationsMode string = futureOperationsContract.outputs.operationsModeOutput
output futurePrivacyMode string = futurePrivacyContract.outputs.privacyModeOutput
output futureApplicationSecurityMode string = futureApplicationSecurityContract.outputs.applicationSecurityModeOutput
output futureResilienceMode string = futureResilienceContract.outputs.resilienceModeOutput
output declaredEnvironment string = environment
output declaredRegion string = authorizedControlledEvaluationRegion
