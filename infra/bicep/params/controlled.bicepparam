// EP-01 controlled-design values only. regionx is deliberately non-authoritative.
using '../main.bicep'

param environment = 'controlled'
param authorizedControlledEvaluationRegion = 'regionx'
param regionCode = 'regionx'
param resourceGroupName = 'ycos-controlled-rg-regionx-001'
param ownerRole = 'AUTHORITY_REQUIRED'
param costCenter = 'AUTHORITY_REQUIRED'
param dataClass = 'synthetic-non-sensitive'
param residencyTarget = 'PARAMETERIZED'
