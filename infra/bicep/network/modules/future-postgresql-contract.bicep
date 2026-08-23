// EP-03: interface contract only; intentionally declares no Azure PostgreSQL server resource.
@description('Planning-only delegated subnet prefix for future managed PostgreSQL private access.')
param databaseSubnetPrefix string

@allowed([
  5432
])
param permittedApplicationPort int

@allowed([
  'disabled'
])
param publicNetworkAccess string

@allowed([
  'vnet-integration'
])
param privateConnectivityPattern string

output databaseSubnetPrefix string = databaseSubnetPrefix
output permittedApplicationPort int = permittedApplicationPort
output publicNetworkAccess string = publicNetworkAccess
output privateConnectivityPattern string = privateConnectivityPattern
