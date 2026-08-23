resource unsafeStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = { name: 'unsafe' location: 'regionx' properties: { allowBlobPublicAccess: true } }
