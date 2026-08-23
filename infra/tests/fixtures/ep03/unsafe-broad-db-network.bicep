resource unsafeNsg 'Microsoft.Network/networkSecurityGroups@2024-05-01' = {
  name: 'unsafe'
  location: 'regionx'
  properties: {
    securityRules: [{
      name: 'unsafe-db-rule'
      properties: {
        priority: 100
        access: 'Allow'
        direction: 'Inbound'
        protocol: 'Tcp'
        sourceAddressPrefix: '*'
        sourcePortRange: '*'
        destinationAddressPrefix: '*'
        destinationPortRange: '5432'
      }
    }]
  }
}
