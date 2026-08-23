resource unsafeStorage 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: 'unsafe'
  location: 'regionx'
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}
