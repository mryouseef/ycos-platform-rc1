// EP-01 Design Reminder: Azure-provisional Bicep foundation; controlled non-production only.
// No apply is authorized. The region remains parameterized because F-GO02-01 is OPEN.
targetScope = 'subscription'

@description('Must remain controlled in EP-01; production is not authorized.')
@allowed([
  'controlled'
])
param environment string

@description('Authorized non-production evaluation region. This is not evidence of Saudi production eligibility.')
@minLength(1)
param authorizedControlledEvaluationRegion string

@description('Operational region code, not a production region assertion.')
@minLength(1)
param regionCode string

@description('Deterministic name of the future controlled resource group.')
@minLength(1)
param resourceGroupName string

@description('Placeholder owner role. A named organizational owner is not embedded in IaC.')
@minLength(1)
param ownerRole string

@description('Placeholder cost center. An authoritative value is required before a future apply.')
@minLength(1)
param costCenter string

@description('Data classification is restricted to synthetic, non-sensitive data in EP-01.')
@allowed([
  'synthetic-non-sensitive'
])
param dataClass string

@description('Residency remains an explicit parameter until authoritative service qualification exists.')
@minLength(1)
param residencyTarget string

var requiredTags = {
  project: 'ycos'
  environment: environment
  ownerRole: ownerRole
  dataClass: dataClass
  criticality: 'controlled-foundation'
  costCenter: costCenter
  managedBy: 'iac-bicep'
  lifecycle: 'controlled'
  residencyTarget: residencyTarget
  regionCode: regionCode
}

// A future apply would create only this controlled resource group.
// EP-01 authorizes source and local validation; it does not authorize apply or creation.
resource controlledResourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: authorizedControlledEvaluationRegion
  tags: requiredTags
}

output controlledResourceGroupId string = controlledResourceGroup.id
output declaredEnvironment string = environment
output declaredRegion string = authorizedControlledEvaluationRegion
