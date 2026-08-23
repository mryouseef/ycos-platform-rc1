// EP-02: explicit deny baseline. Future service-specific allow rules require separate authority and lower priorities.
param nsgName string
param location string
param tags object
param applicationSubnetPrefix string
param databaseSubnetPrefix string

resource applicationNsg 'Microsoft.Network/networkSecurityGroups@2024-05-01' = {
  name: nsgName
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'Allow-Application-To-Future-PostgreSQL-Private-Path'
        properties: {
          priority: 190
          access: 'Allow'
          direction: 'Outbound'
          destinationAddressPrefix: databaseSubnetPrefix
          destinationPortRange: '5432'
          protocol: 'Tcp'
          sourceAddressPrefix: applicationSubnetPrefix
          sourcePortRange: '*'
        }
      }
      {
        name: 'Deny-Internet-Inbound-To-Application'
        properties: {
          priority: 200
          access: 'Deny'
          direction: 'Inbound'
          destinationAddressPrefix: applicationSubnetPrefix
          destinationPortRange: '*'
          protocol: '*'
          sourceAddressPrefix: 'Internet'
          sourcePortRange: '*'
        }
      }
      {
        name: 'Deny-Lateral-Inbound-To-Application'
        properties: {
          priority: 210
          access: 'Deny'
          direction: 'Inbound'
          destinationAddressPrefix: applicationSubnetPrefix
          destinationPortRange: '*'
          protocol: '*'
          sourceAddressPrefix: 'VirtualNetwork'
          sourcePortRange: '*'
        }
      }
      {
        name: 'Deny-Internet-Outbound-From-Application'
        properties: {
          priority: 220
          access: 'Deny'
          direction: 'Outbound'
          destinationAddressPrefix: 'Internet'
          destinationPortRange: '*'
          protocol: '*'
          sourceAddressPrefix: applicationSubnetPrefix
          sourcePortRange: '*'
        }
      }
      {
        name: 'Deny-Lateral-Outbound-From-Application'
        properties: {
          priority: 230
          access: 'Deny'
          direction: 'Outbound'
          destinationAddressPrefix: 'VirtualNetwork'
          destinationPortRange: '*'
          protocol: '*'
          sourceAddressPrefix: applicationSubnetPrefix
          sourcePortRange: '*'
        }
      }
    ]
  }
}

output resourceId string = applicationNsg.id
