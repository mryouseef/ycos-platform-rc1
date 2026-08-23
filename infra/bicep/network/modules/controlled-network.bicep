// EP-02: only a VNet, application subnet, and private-endpoint subnet pattern are declared.
param vnetName string
param location string
param tags object
param addressSpace string
param applicationSubnetPrefix string
param privateEndpointSubnetPrefix string
param applicationNsgId string
param databaseSubnetPrefix string
param databaseNsgId string

resource controlledVnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        addressSpace
      ]
    }
    subnets: [
      {
        name: 'application'
        properties: {
          addressPrefix: applicationSubnetPrefix
          networkSecurityGroup: {
            id: applicationNsgId
          }
          privateEndpointNetworkPolicies: 'Enabled'
        }
      }
      {
        name: 'private-endpoints'
        properties: {
          addressPrefix: privateEndpointSubnetPrefix
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
      {
        name: 'database-postgresql-future'
        properties: {
          addressPrefix: databaseSubnetPrefix
          networkSecurityGroup: {
            id: databaseNsgId
          }
          delegations: [
            {
              name: 'postgresql-flexible-server'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
        }
      }
    ]
  }
}

output resourceId string = controlledVnet.id
