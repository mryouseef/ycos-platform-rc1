resource unsafeDatabase 'Microsoft.DBforPostgreSQL/flexibleServers@2024-03-01-preview' = {
  name: 'unsafe'
  location: 'regionx'
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}
