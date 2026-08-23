// EP-04 future storage security baseline. Controlled source only; do not deploy.
param storageAccountName string
param location string
param tags object

resource futureStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  tags: tags
  properties: {
    publicNetworkAccess: 'Disabled'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowCrossTenantReplication: false
    networkAcls: {
      bypass: 'None'
      defaultAction: 'Deny'
    }
    encryption: {
      keySource: 'Microsoft.Storage'
      services: { blob: { enabled: true } }
    }
  }
}

output resourceId string = futureStorage.id
output publicDataPlane string = 'denied'
output anonymousBlobAccess bool = false
output sharedKeyBaseline string = 'disabled-planning-baseline'
