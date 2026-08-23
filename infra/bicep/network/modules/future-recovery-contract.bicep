// EP-08 future recovery contract only. No Backup vault, Recovery Services vault, database backup, storage backup, replication, failover, or recovery resource is created.
@allowed(['SYNTHETIC_ONLY', 'AUTHORITY_REQUIRED'])
param recoveryMode string
@allowed(['required-before-production'])
param backupIntegrityReference string
@allowed(['required-before-production'])
param restoreAuthorizationReference string
@allowed(['required-before-production'])
param retentionAndHoldReference string
@allowed(['required-before-production'])
param encryptionKeyReference string
@allowed(['required-before-production'])
param regionalCapabilityReference string
@allowed(['same-region-first'])
param crossRegionPosture string

output recoveryModeOutput string = recoveryMode
output backupIntegrityReferenceOutput string = backupIntegrityReference
output restoreAuthorizationReferenceOutput string = restoreAuthorizationReference
output retentionAndHoldReferenceOutput string = retentionAndHoldReference
output encryptionKeyReferenceOutput string = encryptionKeyReference
output regionalCapabilityReferenceOutput string = regionalCapabilityReference
output crossRegionPostureOutput string = crossRegionPosture
output backupVaultConfigured bool = false
output recoveryServiceConfigured bool = false
output providerVerificationRequired bool = true
