// EP-03: narrow future PostgreSQL private flow only. No public endpoint, server, SKU, or deployment.
param nsgName string
param location string
param tags object
param applicationSubnetPrefix string
param databaseSubnetPrefix string

resource databaseNsg 'Microsoft.Network/networkSecurityGroups@2024-05-01' = {
  name: nsgName
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'Allow-Application-To-PostgreSQL-5432'
        properties: {
          priority: 190
          access: 'Allow'
          direction: 'Inbound'
          destinationAddressPrefix: databaseSubnetPrefix
          destinationPortRange: '5432'
          protocol: 'Tcp'
          sourceAddressPrefix: applicationSubnetPrefix
          sourcePortRange: '*'
        }
      }
      {
        name: 'Deny-Internet-Inbound-To-PostgreSQL'
        properties: {
          priority: 200
          access: 'Deny'
          direction: 'Inbound'
          destinationAddressPrefix: databaseSubnetPrefix
          destinationPortRange: '*'
          protocol: '*'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
        }
      }
      {
        name: 'Deny-Lateral-Inbound-To-PostgreSQL'
        properties: {
          priority: 210
          access: 'Deny'
          direction: 'Inbound'
          destinationAddressPrefix: databaseSubnetPrefix
          destinationPortRange: '*'
          protocol: '*'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
        }
      }
    ]
  }
}

output resourceId string = databaseNsg.id
